/**
 * 사진 변환 핵심: 원본 → 긴 변 1600px / 800px WebP + 흐린 미리보기(32px).
 * Web Worker와 메인 스레드 양쪽에서 돌 수 있도록 DOM에 기대지 않는다(OffscreenCanvas).
 * 다시 그리는 과정에서 EXIF(촬영 위치 등)는 모두 사라진다.
 */

export const LARGE_EDGE = 1600;
export const SMALL_EDGE = 800;
export const BLUR_EDGE = 32;

export interface ProcessedImage {
  lg: Blob;
  sm: Blob;
  blurData: string;
  width: number;
  height: number;
}

export class ImageProcessError extends Error {
  constructor(readonly code: "IMAGE_UNSUPPORTED" | "IMAGE_PROCESS_FAILED") {
    super(code);
  }
}

export function fitWithin(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

type Source = ImageBitmap | OffscreenCanvas;

/** 한 번에 크게 줄이면 계단 현상이 생기므로 절반씩 줄여 간다. */
function resize(source: Source, width: number, height: number): OffscreenCanvas {
  let current: Source = source;
  let cw = source.width;
  let ch = source.height;
  while (cw / 2 >= width && ch / 2 >= height) {
    cw = Math.round(cw / 2);
    ch = Math.round(ch / 2);
    current = draw(current, cw, ch);
  }
  return draw(current, width, height);
}

function draw(source: Source, width: number, height: number): OffscreenCanvas {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageProcessError("IMAGE_PROCESS_FAILED");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

let wasmEncoder: ((data: ImageData, opts: { quality: number }) => Promise<ArrayBuffer>) | null = null;

async function encodeWebp(canvas: OffscreenCanvas, quality: number): Promise<Blob> {
  const native = await canvas.convertToBlob({ type: "image/webp", quality });
  if (native.type === "image/webp") return native;

  // Safari 등은 WebP로 저장하지 못하고 PNG를 돌려준다 → WASM 인코더로 대신 만든다.
  if (!wasmEncoder) {
    const mod = await import("@jsquash/webp");
    wasmEncoder = (data, opts) => mod.encode(data, opts);
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageProcessError("IMAGE_PROCESS_FAILED");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const buffer = await wasmEncoder(data, { quality: Math.round(quality * 100) });
  return new Blob([buffer], { type: "image/webp" });
}

async function toDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:image/webp;base64,${btoa(binary)}`;
}

export async function processImage(file: Blob): Promise<ProcessedImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageProcessError("IMAGE_UNSUPPORTED");
  }

  try {
    const large = fitWithin(bitmap.width, bitmap.height, LARGE_EDGE);
    const small = fitWithin(bitmap.width, bitmap.height, SMALL_EDGE);
    const blur = fitWithin(bitmap.width, bitmap.height, BLUR_EDGE);

    const lgCanvas = resize(bitmap, large.width, large.height);
    const smCanvas = resize(lgCanvas, small.width, small.height);
    const blurCanvas = resize(smCanvas, blur.width, blur.height);

    const [lg, sm, blurBlob] = await Promise.all([
      encodeWebp(lgCanvas, 0.84),
      encodeWebp(smCanvas, 0.8),
      encodeWebp(blurCanvas, 0.5),
    ]);
    return { lg, sm, blurData: await toDataUrl(blurBlob), width: large.width, height: large.height };
  } catch (error) {
    if (error instanceof ImageProcessError) throw error;
    throw new ImageProcessError("IMAGE_PROCESS_FAILED");
  } finally {
    bitmap.close();
  }
}
