import { describe, expect, it } from "vitest";
import { artworkSchema, settingsSchema, toFieldErrors, type ArtworkInput } from "./validation";

const base: ArtworkInput = {
  id: "abcd2345",
  title: "봄날의 정원",
  artists: ["김민준", "이서연"],
  material: "종이에 수채",
  size: "40×30cm",
  description: "친구들과 함께 그린 정원이에요.",
  ttsEnabled: true,
  youtubeUrl: "",
  isPublished: false,
  images: [],
  audio: null,
};

function errorsOf(input: unknown) {
  const result = artworkSchema.safeParse(input);
  return result.success ? {} : toFieldErrors(result.error);
}

describe("artworkSchema", () => {
  it("올바른 입력은 통과하고 앞뒤 공백을 지운다", () => {
    const parsed = artworkSchema.parse({ ...base, title: "  봄날의 정원  " });
    expect(parsed.title).toBe("봄날의 정원");
  });

  it("작품명이 비어 있으면 한국어로 알려준다", () => {
    expect(errorsOf({ ...base, title: "   " })).toEqual({ title: "작품명을 입력해 주세요." });
  });

  it("작가가 없으면 알려준다", () => {
    expect(errorsOf({ ...base, artists: [] })).toEqual({ artists: "작가를 한 명 이상 입력해 주세요." });
  });

  it("빈 작가 이름을 알려준다", () => {
    expect(errorsOf({ ...base, artists: ["김민준", " "] })).toEqual({ "artists.1": "작가 이름을 입력해 주세요." });
  });

  it("잘못된 유튜브 주소를 알려준다", () => {
    expect(errorsOf({ ...base, youtubeUrl: "https://example.com" })).toEqual({
      youtubeUrl: "유튜브 영상 주소가 올바르지 않습니다.",
    });
  });

  it("외부 사이트 이미지 주소는 거부한다", () => {
    const image = {
      urlLg: "https://evil.example.com/a.webp",
      urlSm: "https://evil.example.com/b.webp",
      width: 100,
      height: 100,
      blurData: "data:image/webp;base64,AAAA",
      alt: "",
      bytes: 10,
    };
    const errors = errorsOf({ ...base, images: [image] });
    expect(errors["images.0.urlLg"]).toBe("파일 주소가 올바르지 않습니다.");
  });

  it("Vercel Blob 주소는 허용한다", () => {
    const url = "https://abc123.public.blob.vercel-storage.com/artworks/abcd2345/x-lg.webp";
    const image = { urlLg: url, urlSm: url, width: 10, height: 10, blurData: "data:image/webp;base64,AA", alt: "", bytes: 1 };
    expect(artworkSchema.safeParse({ ...base, images: [image] }).success).toBe(true);
  });

  it("모든 오류 문구가 한국어다 (타입 오류 포함)", () => {
    const errors = errorsOf({ ...base, title: 123, ttsEnabled: "yes" });
    for (const message of Object.values(errors)) expect(message).toMatch(/[가-힣]/);
  });
});

describe("settingsSchema", () => {
  const settings = {
    title: "우리들의 작품 전시",
    subtitle: "",
    startDate: "2026-10-01",
    endDate: "2026-10-10",
    venue: "",
    intro: "",
    organizer: "평택특수교육지원센터",
    cover: null,
  };

  it("끝나는 날이 시작일보다 빠르면 알려준다", () => {
    const result = settingsSchema.safeParse({ ...settings, endDate: "2026-09-01" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error)).toEqual({ endDate: "끝나는 날짜가 시작 날짜보다 빠릅니다." });
    }
  });

  it("날짜는 비워 둘 수 있다", () => {
    expect(settingsSchema.safeParse({ ...settings, startDate: "", endDate: "" }).success).toBe(true);
  });
});
