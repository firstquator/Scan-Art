/** 안드로이드에서 짧은 진동. 지원하지 않는 기기(iOS 등)에서는 아무 일도 하지 않는다. */
export function tap(pattern: number | number[] = 8) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    // 무시
  }
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
