import "server-only";
import { inArray } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { loginAttempts } from "@/db/schema";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { GLOBAL_KEY, GLOBAL_MAX_FAILS, isLocked, MAX_FAILS, nextAfterFailure, type AttemptState } from "./rate-limit";
import { passwordMatches, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSession, verifySession } from "./token";

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value, env.sessionSecret);
}

/** 페이지용: 로그인하지 않았으면 로그인 화면으로 보낸다. */
export async function requireAdminPage(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

/** Server Action/Route용: 로그인하지 않았으면 UNAUTHORIZED 오류. */
export async function assertAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new AppError("UNAUTHORIZED");
}

/**
 * 접속지 주소. 사용자가 보낸 X-Forwarded-For의 맨 앞 값은 얼마든지 꾸밀 수 있으므로 믿지 않는다.
 * Vercel이 직접 넣는 헤더를 먼저 쓰고, 없으면 마지막 프록시가 덧붙인 맨 뒤 값을 쓴다.
 * 주소를 속이더라도 전체 실패 횟수(GLOBAL_KEY)는 함께 쌓이므로 무한 시도는 막힌다.
 */
async function clientIp(): Promise<string> {
  const h = await headers();
  const trusted = h.get("x-vercel-forwarded-for") ?? h.get("x-real-ip");
  if (trusted) return trusted.split(",")[0].trim();
  const chain = h.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  return chain?.at(-1) ?? "local";
}

export type LoginOutcome = "ok" | "wrong" | "locked";

async function recordFailure(db: Awaited<ReturnType<typeof getDb>>, key: string, state: AttemptState | undefined, now: Date, max: number) {
  const next = nextAfterFailure(state, now, max);
  const values = { failCount: next.failCount, lockedUntil: next.lockedUntil, updatedAt: now };
  await db
    .insert(loginAttempts)
    .values({ ip: key, ...values })
    .onConflictDoUpdate({ target: loginAttempts.ip, set: values });
  return next;
}

export async function attemptLogin(password: string): Promise<LoginOutcome> {
  const db = await getDb();
  const ip = await clientIp();
  const now = new Date();
  const rows = await db.select().from(loginAttempts).where(inArray(loginAttempts.ip, [ip, GLOBAL_KEY]));
  const state = rows.find((r) => r.ip === ip);
  const global = rows.find((r) => r.ip === GLOBAL_KEY);

  if (isLocked(state, now) || isLocked(global, now)) return "locked";

  if (await passwordMatches(password, env.adminPassword)) {
    if (rows.length) await db.delete(loginAttempts).where(inArray(loginAttempts.ip, [ip, GLOBAL_KEY]));
    const store = await cookies();
    store.set(SESSION_COOKIE, await signSession(env.sessionSecret), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return "ok";
  }

  const [next, nextGlobal] = await Promise.all([
    recordFailure(db, ip, state, now, MAX_FAILS),
    recordFailure(db, GLOBAL_KEY, global, now, GLOBAL_MAX_FAILS),
  ]);
  return isLocked(next, now) || isLocked(nextGlobal, now) ? "locked" : "wrong";
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
