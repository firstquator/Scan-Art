import type { BgmInput } from "./validation";

/** 기본 배경음악(scripts/generate-bgm.mjs로 만든다) */
export const DEFAULT_BGM = { url: "/audio/bgm-default.mp3", name: "기본 음악 · 잔잔한 피아노" } as const;

export type BgmMode = "default" | "custom" | "none";

/** 파일 이름에서 확장자를 떼고 화면에 보일 이름으로 다듬는다. */
export function bgmDisplayName(fileName: string): string {
  const base = fileName.replace(/\.[A-Za-z0-9]{1,5}$/, "").replace(/[_]+/g, " ").trim();
  return (base || "배경음악").slice(0, 80);
}

/** 관람 화면에서 틀 배경음악. 없으면 null */
export function resolveBgm(bgm: BgmInput): { url: string; name: string } | null {
  if (bgm.mode === "custom") return { url: bgm.url, name: bgm.name };
  if (bgm.mode === "default") return { url: DEFAULT_BGM.url, name: DEFAULT_BGM.name };
  return null;
}
