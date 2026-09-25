/** 로컬 개발 저장소의 공개 경로 접두사 */
export const LOCAL_FILES_PREFIX = "/api/dev-files/";

const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

/** 우리 저장소(Vercel Blob 또는 로컬 개발 저장소)에 있는 파일 주소인지 확인한다. */
export function isOwnedMediaUrl(url: string, opts: { allowLocal: boolean }): boolean {
  if (opts.allowLocal && url.startsWith(LOCAL_FILES_PREFIX) && !url.includes("..")) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.endsWith(BLOB_HOST_SUFFIX);
  } catch {
    return false;
  }
}

/** 업로드 경로에 쓸 수 있는 안전한 경로인지 확인한다. (예: artworks/abcd2345/xxx-lg.webp) */
export function isSafeUploadPath(pathname: string): boolean {
  return /^(artworks\/[a-z0-9]{8}|settings)\/[A-Za-z0-9._-]{1,100}$/.test(pathname) && !pathname.includes("..");
}
