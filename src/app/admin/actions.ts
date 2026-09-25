"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { artworkImages, artworks, settings } from "@/db/schema";
import { assertAdmin, attemptLogin, clearSession } from "@/lib/auth/server";
import {
  deleteArtwork,
  reorderArtworks,
  saveArtwork,
  setPublished,
} from "@/lib/data/artworks";
import { PUBLIC_DATA_TAG } from "@/lib/data/public";
import { saveSettings } from "@/lib/data/settings";
import { AppError, fail, ok, toErrorCode, type ActionResult, type ErrorCode } from "@/lib/errors";
import { isArtworkId } from "@/lib/ids";
import { deleteMediaFiles } from "@/lib/storage/server";
import { artworkSchema, settingsSchema, toFieldErrors } from "@/lib/validation";

/** 관리자 확인 + 오류를 한국어 결과로 바꿔 주는 공통 포장 */
async function guarded<T>(fallback: ErrorCode, run: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    await assertAdmin();
    return await run();
  } catch (error) {
    const code = error instanceof AppError ? error.code : toErrorCode(error);
    if (!(error instanceof AppError)) console.error(`[admin action] ${fallback}`, error);
    return fail(code === "UNKNOWN" ? fallback : code);
  }
}

/**
 * 관람객 화면 데이터 캐시를 즉시 비운다(updateTag: 오래된 화면을 한 번도 더 내보내지 않는다).
 * 이전·다음 작품 카드·전시 목록이 함께 바뀌므로 태그 하나로 모두 비운다.
 */
function revalidatePublic() {
  updateTag(PUBLIC_DATA_TAG);
}

// ── 로그인 ────────────────────────────────────────────

export async function loginAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");
  if (!password) return fail("LOGIN_EMPTY");
  let outcome;
  try {
    outcome = await attemptLogin(password);
  } catch (error) {
    console.error("[login]", error);
    return fail("UNKNOWN");
  }
  if (outcome === "locked") return fail("LOGIN_LOCKED");
  if (outcome === "wrong") return fail("LOGIN_FAILED");
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/admin/login");
}

// ── 작품 ─────────────────────────────────────────────

export async function saveArtworkAction(input: unknown): Promise<ActionResult<{ id: string; created: boolean }>> {
  return guarded("SAVE_FAILED", async () => {
    const parsed = artworkSchema.safeParse(input);
    if (!parsed.success) return fail("VALIDATION", toFieldErrors(parsed.error));

    const { removedUrls, created } = await saveArtwork(parsed.data);
    await deleteMediaFiles(removedUrls);
    revalidatePublic();
    revalidatePath("/admin");
    return ok({ id: parsed.data.id, created });
  });
}

export async function deleteArtworkAction(id: string): Promise<ActionResult> {
  return guarded("DELETE_FAILED", async () => {
    if (!isArtworkId(id)) return fail("NOT_FOUND");
    const urls = await deleteArtwork(id);
    if (!urls) return fail("NOT_FOUND");
    await deleteMediaFiles(urls);
    revalidatePublic();
    revalidatePath("/admin");
    return ok(undefined);
  });
}

export async function setPublishedAction(id: string, isPublished: boolean): Promise<ActionResult> {
  return guarded("SAVE_FAILED", async () => {
    if (!isArtworkId(id) || !(await setPublished(id, isPublished === true))) return fail("NOT_FOUND");
    revalidatePublic();
    revalidatePath("/admin");
    return ok(undefined);
  });
}

export async function reorderArtworksAction(ids: string[]): Promise<ActionResult> {
  return guarded("REORDER_FAILED", async () => {
    if (!Array.isArray(ids) || ids.length > 1000 || !ids.every((id) => typeof id === "string" && isArtworkId(id))) {
      return fail("VALIDATION");
    }
    await reorderArtworks(ids);
    revalidatePublic();
    revalidatePath("/admin");
    return ok(undefined);
  });
}

/**
 * 저장하지 않고 나간 편집에서 올려 둔 파일을 지운다.
 * 이미 저장된 작품·설정이 쓰고 있는 파일은 절대 지우지 않는다.
 */
export async function discardUploadsAction(urls: string[]): Promise<ActionResult> {
  return guarded("DELETE_FAILED", async () => {
    if (!Array.isArray(urls) || urls.length === 0) return ok(undefined);
    const db = await getDb();
    const [imgs, auds, cover] = await Promise.all([
      db.select({ a: artworkImages.urlLg, b: artworkImages.urlSm }).from(artworkImages),
      db.select({ a: artworks.audioUrl }).from(artworks),
      db.select({ a: settings.coverUrlLg, b: settings.coverUrlSm }).from(settings),
    ]);
    const used = new Set<string>();
    for (const r of [...imgs, ...cover]) {
      if (r.a) used.add(r.a);
      if (r.b) used.add(r.b);
    }
    for (const r of auds) if (r.a) used.add(r.a);
    await deleteMediaFiles(urls.filter((u) => typeof u === "string" && !used.has(u)).slice(0, 200));
    return ok(undefined);
  });
}

// ── 사이트 설정 ────────────────────────────────────────

export async function saveSettingsAction(input: unknown): Promise<ActionResult> {
  return guarded("SAVE_FAILED", async () => {
    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) return fail("VALIDATION", toFieldErrors(parsed.error));
    const removed = await saveSettings(parsed.data);
    await deleteMediaFiles(removed);
    revalidatePublic();
    revalidatePath("/admin/settings");
    return ok(undefined);
  });
}
