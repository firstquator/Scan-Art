import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "sa_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function key(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function signSession(secret: string, now = Date.now()): Promise<string> {
  const issuedAt = Math.floor(now / 1000);
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + SESSION_MAX_AGE_SECONDS)
    .sign(key(secret));
}

export async function verifySession(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ["HS256"] });
    return payload.role === "admin";
  } catch {
    return false;
  }
}

/** 길이와 무관하게 일정한 시간으로 비교한다. */
export async function passwordMatches(input: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([digest(input), digest(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}
