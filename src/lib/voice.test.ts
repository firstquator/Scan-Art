import { describe, expect, it } from "vitest";
import { pickBestKoreanVoice, type VoiceLike } from "./voice";

const v = (name: string, lang = "ko-KR", extra: Partial<VoiceLike> = {}): VoiceLike => ({
  name,
  lang,
  localService: true,
  default: false,
  ...extra,
});

describe("pickBestKoreanVoice", () => {
  it("한국어 음성이 없으면 null", () => {
    expect(pickBestKoreanVoice([v("Samantha", "en-US"), v("Kyoko", "ja-JP")])).toBeNull();
  });

  it("엣지: 신경망(Natural) 음성을 기본 음성보다 먼저 고른다", () => {
    const voices = [
      v("Microsoft Heami - Korean (Korean)", "ko-KR", { default: true }),
      v("Microsoft SunHi Online (Natural) - Korean (Korea)", "ko-KR", { localService: false }),
      v("Microsoft InJoon Online (Natural) - Korean (Korea)", "ko-KR", { localService: false }),
    ];
    expect(pickBestKoreanVoice(voices)?.name).toContain("Natural");
  });

  it("크롬: Google 음성을 기본 음성보다 먼저 고른다", () => {
    const voices = [v("Microsoft Heami - Korean (Korean)", "ko-KR", { default: true }), v("Google 한국의", "ko-KR", { localService: false })];
    expect(pickBestKoreanVoice(voices)?.name).toBe("Google 한국의");
  });

  it("아이폰: 향상된·프리미엄 음성을 기본 유나보다 먼저 고른다", () => {
    expect(pickBestKoreanVoice([v("유나"), v("유나(향상됨)")])?.name).toBe("유나(향상됨)");
    expect(pickBestKoreanVoice([v("Yuna"), v("Yuna (Enhanced)"), v("Yuna (Premium)")])?.name).toBe("Yuna (Premium)");
  });

  it("점수가 같으면 기기 기본 음성, 그다음 ko-KR", () => {
    expect(pickBestKoreanVoice([v("A", "ko"), v("B", "ko-KR")])?.name).toBe("B");
    expect(pickBestKoreanVoice([v("A"), v("B", "ko-KR", { default: true })])?.name).toBe("B");
  });

  it("ko_KR 같은 밑줄 표기도 한국어로 본다", () => {
    expect(pickBestKoreanVoice([v("삼성 한국어", "ko_KR")])?.name).toBe("삼성 한국어");
  });
});
