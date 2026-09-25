"use client";

import { AppError } from "@/lib/errors";
import { ImageProcessError, processImage, type ProcessedImage } from "./core";

export type { ProcessedImage };

let worker: Worker | null = null;
let workerBroken = false;
let seq = 0;
const pending = new Map<number, { resolve: (v: ProcessedImage) => void; reject: (e: unknown) => void }>();

function getWorker(): Worker | null {
  if (workerBroken || typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("./image.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean; result?: ProcessedImage; code?: string }>) => {
      const job = pending.get(e.data.id);
      if (!job) return;
      pending.delete(e.data.id);
      if (e.data.ok && e.data.result) job.resolve(e.data.result);
      else job.reject(new ImageProcessError((e.data.code as "IMAGE_UNSUPPORTED") ?? "IMAGE_PROCESS_FAILED"));
    };
    worker.onerror = () => {
      workerBroken = true;
      worker?.terminate();
      worker = null;
      for (const [, job] of pending) job.reject(new Error("worker failed"));
      pending.clear();
    };
    return worker;
  } catch {
    workerBroken = true;
    return null;
  }
}

function runInWorker(file: Blob): Promise<ProcessedImage> {
  const w = getWorker();
  if (!w) return processImage(file);
  const id = ++seq;
  return new Promise<ProcessedImage>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, file });
  }).catch((error) => {
    // 작업자 자체가 고장 났으면 메인 스레드에서 한 번 더 해 본다.
    if (error instanceof ImageProcessError) throw error;
    return processImage(file);
  });
}

function looksLikeHeic(file: File): boolean {
  return /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

/** 사진 파일 → WebP 두 크기 + 흐린 미리보기. 실패하면 한국어 오류 코드를 가진 AppError. */
export async function convertImage(file: File): Promise<ProcessedImage> {
  if (!file.type.startsWith("image/") && !looksLikeHeic(file)) throw new AppError("IMAGE_UNSUPPORTED");
  if (file.size > 60 * 1024 * 1024) throw new AppError("FILE_TOO_LARGE");

  try {
    return await runInWorker(file);
  } catch (error) {
    // iPhone HEIC를 브라우저가 못 읽으면 JPEG로 바꾼 뒤 다시 시도한다.
    if (error instanceof ImageProcessError && error.code === "IMAGE_UNSUPPORTED" && looksLikeHeic(file)) {
      try {
        const heic2any = (await import("heic2any")).default;
        const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
        return await runInWorker(Array.isArray(converted) ? converted[0] : converted);
      } catch {
        throw new AppError("IMAGE_UNSUPPORTED");
      }
    }
    if (error instanceof ImageProcessError) throw new AppError(error.code);
    throw new AppError("IMAGE_PROCESS_FAILED");
  }
}
