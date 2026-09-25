import "server-only";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { readMedia } from "@/lib/storage/server";

export const OG_SIZE = { width: 1200, height: 630 };

const PAPER = "#f6f0e3";
const INK = "#2a2926";
const INK_SOFT = "#6b665c";
const BLUE = "#2a5caa";

type FontWeight = 400 | 700;

/**
 * Google Fonts에서 필요한 글자만 담은 TTF 조각을 받아 온다(한글 전체 글꼴은 너무 크다).
 * User-Agent 없이 요청하면 TTF를 준다.
 */
async function loadFont(family: string, weight: FontWeight, text: string): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(url)).text();
    const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
    if (!src) return null;
    const res = await fetch(src[1]);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

async function fonts(text: string) {
  const unique = Array.from(new Set(text + "0123456789·")).join("");
  const [regular, bold] = await Promise.all([loadFont("Gowun Batang", 400, unique), loadFont("Gowun Batang", 700, unique)]);
  return [
    ...(regular ? [{ name: "Gowun", data: regular, weight: 400 as const, style: "normal" as const }] : []),
    ...(bold ? [{ name: "Gowun", data: bold, weight: 700 as const, style: "normal" as const }] : []),
  ];
}

let paperCache: string | null = null;

/** 사이트와 같은 한지 타일(public/textures/hanji.webp)을 1200×630에 깔아 JPEG로 만든다. 한 번 만들어 재사용한다. */
async function paperTexture(): Promise<string> {
  if (paperCache) return paperCache;
  const tilePath = path.join(process.cwd(), "public", "textures", "hanji.webp");
  const tile = await sharp(await readFile(tilePath)).resize(640, 640).toBuffer();
  const jpeg = await sharp({ create: { width: OG_SIZE.width, height: OG_SIZE.height, channels: 3, background: PAPER } })
    .composite([{ input: tile, tile: true, left: 0, top: 0 }])
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
  paperCache = `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  return paperCache;
}

/** Satori는 WebP를 읽지 못하므로 JPEG로 바꿔서 넣는다. */
async function imageForOg(url: string | null | undefined, width: number, height: number): Promise<string | null> {
  if (!url) return null;
  const data = await readMedia(url);
  if (!data) return null;
  try {
    const jpeg = await sharp(Buffer.from(data))
      .resize(width, height, { fit: "cover", position: "attention" })
      .jpeg({ quality: 84, mozjpeg: true })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

export interface OgCardInput {
  eyebrow: string;
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  cta: string;
}

export async function renderOgCard({ eyebrow, title, subtitle, imageUrl, cta }: OgCardInput): Promise<ImageResponse> {
  const photoW = 470;
  const photoH = 530;
  const [bg, photo, fontList] = await Promise.all([
    paperTexture(),
    imageForOg(imageUrl, photoW * 2, photoH * 2),
    fonts(eyebrow + title + subtitle + cta),
  ]);
  const titleSize = title.length > 16 ? 58 : title.length > 10 ? 70 : 82;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", fontFamily: "Gowun", color: INK }}>
        <img src={bg} width={OG_SIZE.width} height={OG_SIZE.height} style={{ position: "absolute", top: 0, left: 0, width: OG_SIZE.width, height: OG_SIZE.height }} alt="" />
        {/* 옅은 쪽빛 붓자국 */}
        <div
          style={{
            position: "absolute",
            right: -80,
            top: 60,
            width: 720,
            height: 70,
            borderRadius: 60,
            background: "#dde7f4",
            transform: "rotate(-6deg)",
          }}
        />
        <div style={{ display: "flex", width: "100%", height: "100%", padding: 50, gap: 56, alignItems: "center" }}>
          {photo && (
            <div
              style={{
                display: "flex",
                padding: 14,
                background: "#fbf8f2",
                borderRadius: 26,
                boxShadow: "0 18px 40px -12px rgba(70,52,24,0.35)",
                transform: "rotate(-1.5deg)",
              }}
            >
              <img src={photo} width={photoW} height={photoH} style={{ borderRadius: 16, objectFit: "cover" }} alt="" />
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28, color: BLUE, fontWeight: 700 }}>
              <div
                style={{
                  display: "flex",
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: BLUE,
                  color: "#fbf8f2",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  transform: "rotate(-4deg)",
                }}
              >
                展
              </div>
              {eyebrow}
            </div>
            <div style={{ display: "flex", marginTop: 28, fontSize: titleSize, fontWeight: 700, lineHeight: 1.18, letterSpacing: -2 }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ display: "flex", marginTop: 22, fontSize: 32, color: INK_SOFT, lineHeight: 1.4 }}>{subtitle}</div>
            )}
            <div style={{ display: "flex", marginTop: 44 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: BLUE,
                  color: "#fbf8f2",
                  borderRadius: 999,
                  padding: "16px 30px",
                  fontSize: 26,
                  fontWeight: 700,
                }}
              >
                {cta} →
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: fontList },
  );
}
