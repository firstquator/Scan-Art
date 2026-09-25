/** QR 코드와 공유 미리보기에 쓰는 사이트 최종 주소. 끝의 / 는 뗀다. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

export function artworkUrl(id: string): string {
  return `${SITE_URL}/a/${id}`;
}

/** 관람객용 전시 표지 경로 */
export const EXHIBITION_PATH = "/exhibition";

export function exhibitionUrl(): string {
  return `${SITE_URL}${EXHIBITION_PATH}`;
}

export function artworkPath(id: string): string {
  return `/a/${id}`;
}
