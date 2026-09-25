/** 업로드 종류별 허용 형식과 최대 크기. 서버(토큰 발급)와 브라우저(사전 확인)가 함께 쓴다. */
export const IMAGE_CONTENT_TYPES = ["image/webp"];
export const AUDIO_CONTENT_TYPES = ["audio/mp4", "audio/webm", "audio/mpeg", "audio/aac", "audio/x-m4a", "audio/ogg"];

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

export type UploadKind = "image" | "audio";

export function uploadKindOf(pathname: string): UploadKind | null {
  if (pathname.endsWith(".webp")) return "image";
  if (/\.(m4a|mp4|webm|mp3|aac|ogg)$/.test(pathname)) return "audio";
  return null;
}

export function policyFor(kind: UploadKind) {
  return kind === "image"
    ? { allowedContentTypes: IMAGE_CONTENT_TYPES, maximumSizeInBytes: MAX_IMAGE_BYTES }
    : { allowedContentTypes: AUDIO_CONTENT_TYPES, maximumSizeInBytes: MAX_AUDIO_BYTES };
}

/** "audio/webm;codecs=opus" → "audio/webm" */
export function baseContentType(type: string): string {
  return type.split(";")[0].trim().toLowerCase();
}
