import { z } from "zod";
import { isArtworkId } from "./ids";
import { isOwnedMediaUrl } from "./storage/urls";
import { parseYouTubeId } from "./youtube";

export const MAX_IMAGES = 12;
export const MAX_AUDIO_SECONDS = 180;
export const MAX_ARTISTS = 30;

const allowLocal = process.env.NODE_ENV !== "production";
const mediaUrl = z
  .string()
  .max(1000)
  .refine((url) => isOwnedMediaUrl(url, { allowLocal }), { error: "파일 주소가 올바르지 않습니다." });

const trimmed = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, { error: `${label}은(는) ${max}자까지 쓸 수 있습니다.` });

export const imageSchema = z.object({
  urlLg: mediaUrl,
  urlSm: mediaUrl,
  width: z.number().int().positive().max(10000),
  height: z.number().int().positive().max(10000),
  blurData: z.string().max(4000).startsWith("data:image/webp;base64,"),
  alt: trimmed(120, "사진 설명"),
  bytes: z.number().int().nonnegative(),
});

export const audioSchema = z.object({
  url: mediaUrl,
  duration: z
    .number()
    .int()
    .nonnegative()
    .max(MAX_AUDIO_SECONDS + 5, { error: "녹음은 3분까지 사용할 수 있습니다." }),
  bytes: z.number().int().nonnegative(),
});

export const artworkSchema = z.object({
  id: z.string().refine(isArtworkId, { error: "작품 번호가 올바르지 않습니다." }),
  title: z
    .string()
    .trim()
    .min(1, { error: "작품명을 입력해 주세요." })
    .max(80, { error: "작품명은 80자까지 쓸 수 있습니다." }),
  artists: z
    .array(trimmed(40, "작가 이름").min(1, { error: "작가 이름을 입력해 주세요." }))
    .min(1, { error: "작가를 한 명 이상 입력해 주세요." })
    .max(MAX_ARTISTS, { error: `작가는 ${MAX_ARTISTS}명까지 입력할 수 있습니다.` }),
  material: trimmed(60, "재료"),
  size: trimmed(60, "크기"),
  description: trimmed(3000, "설명"),
  ttsEnabled: z.boolean(),
  youtubeUrl: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === "" || parseYouTubeId(v) !== null, {
      error: "유튜브 영상 주소가 올바르지 않습니다.",
    }),
  isPublished: z.boolean(),
  images: z.array(imageSchema).max(MAX_IMAGES, { error: `사진은 ${MAX_IMAGES}장까지 올릴 수 있습니다.` }),
  audio: audioSchema.nullable(),
});

export type ArtworkInput = z.infer<typeof artworkSchema>;
export type ImageInput = z.infer<typeof imageSchema>;
export type AudioInput = z.infer<typeof audioSchema>;

const dateString = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), { error: "날짜 형식이 올바르지 않습니다." });

export const settingsSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { error: "전시명을 입력해 주세요." })
      .max(80, { error: "전시명은 80자까지 쓸 수 있습니다." }),
    subtitle: trimmed(120, "부제"),
    startDate: dateString,
    endDate: dateString,
    venue: trimmed(100, "장소"),
    intro: trimmed(3000, "소개글"),
    organizer: trimmed(60, "주최"),
    cover: imageSchema.nullable(),
  })
  .refine((s) => !s.startDate || !s.endDate || s.startDate <= s.endDate, {
    error: "끝나는 날짜가 시작 날짜보다 빠릅니다.",
    path: ["endDate"],
  });

export type SettingsInput = z.infer<typeof settingsSchema>;

/** Zod 오류를 { "필드.경로": "한국어 문구" } 형태로 바꾼다. 첫 번째 문구만 남긴다. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    if (!(key in result)) {
      result[key] = /[가-힣]/.test(issue.message) ? issue.message : "입력한 내용을 다시 확인해 주세요.";
    }
  }
  return result;
}
