import "server-only";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import { isOwnedMediaUrl, isSafeUploadPath, LOCAL_FILES_PREFIX } from "./urls";

/** Vercel Blob 무료 저장 한도 */
export const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024;

export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");

export function localFilePath(relative: string): string | null {
  if (!isSafeUploadPath(relative)) return null;
  return path.join(LOCAL_UPLOAD_DIR, ...relative.split("/"));
}

export async function writeLocalFile(relative: string, data: Uint8Array): Promise<string> {
  const file = localFilePath(relative);
  if (!file) throw new Error("unsafe path");
  await mkdir(/*turbopackIgnore: true*/ path.dirname(file), { recursive: true });
  await writeFile(/*turbopackIgnore: true*/ file, data);
  return LOCAL_FILES_PREFIX + relative;
}

/** 파일 삭제는 실패해도 저장 흐름을 막지 않는다(로그만 남긴다). */
export async function deleteMediaFiles(urls: string[]): Promise<void> {
  const owned = urls.filter((u) => isOwnedMediaUrl(u, { allowLocal: env.storageMode === "local" }));
  if (owned.length === 0) return;
  try {
    if (env.storageMode === "blob") {
      const { del } = await import("@vercel/blob");
      await del(owned.filter((u) => u.startsWith("https://")));
    } else {
      await Promise.all(
        owned
          .filter((u) => u.startsWith(LOCAL_FILES_PREFIX))
          .map((u) => localFilePath(u.slice(LOCAL_FILES_PREFIX.length)))
          .filter((p): p is string => !!p)
          .map((p) => rm(/*turbopackIgnore: true*/ p, { force: true })),
      );
    }
  } catch (error) {
    console.error("[storage] 파일 삭제 실패", error);
  }
}

/** OG 이미지 등 서버에서 파일 내용을 읽어야 할 때 쓴다. */
export async function readMedia(url: string): Promise<ArrayBuffer | null> {
  try {
    if (url.startsWith(LOCAL_FILES_PREFIX)) {
      const file = localFilePath(url.slice(LOCAL_FILES_PREFIX.length));
      if (!file) return null;
      const { readFile } = await import("node:fs/promises");
      const buf = await readFile(/*turbopackIgnore: true*/ file);
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    }
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}
