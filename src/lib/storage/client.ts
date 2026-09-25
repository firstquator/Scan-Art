"use client";

import { AppError, type ErrorCode } from "@/lib/errors";
import { baseContentType } from "./policy";

export type StorageMode = "blob" | "local";

export interface UploadOptions {
  mode: StorageMode;
  pathname: string;
  file: Blob;
  contentType: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

/** 파일을 저장소에 올리고 공개 주소를 돌려준다. 실패하면 한국어 코드를 가진 AppError. */
export async function uploadFile({ mode, pathname, file, contentType, onProgress, signal }: UploadOptions): Promise<string> {
  const type = baseContentType(contentType);
  try {
    if (mode === "blob") {
      const { upload } = await import("@vercel/blob/client");
      const result = await upload(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        contentType: type,
        multipart: file.size > 8 * 1024 * 1024,
        abortSignal: signal,
        onUploadProgress: (e) => onProgress?.(e.percentage),
      });
      return result.url;
    }
    return await uploadLocal(pathname, file, type, onProgress, signal);
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (signal?.aborted) throw error;
    const message = error instanceof Error ? error.message : "";
    if (/unauthori[sz]ed|401/i.test(message)) throw new AppError("UNAUTHORIZED");
    if (/content type|not allowed/i.test(message)) throw new AppError("UPLOAD_FAILED");
    if (/too large|size/i.test(message)) throw new AppError("FILE_TOO_LARGE");
    if (typeof navigator !== "undefined" && !navigator.onLine) throw new AppError("NETWORK");
    throw new AppError("UPLOAD_FAILED", { cause: error });
  }
}

/** 로컬 개발 저장소: 진행률을 보여주려고 XHR을 쓴다. */
function uploadLocal(
  pathname: string,
  file: Blob,
  type: string,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("pathname", pathname);
    form.append("file", new File([file], pathname.split("/").pop() ?? "file", { type }));
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/dev-upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.((e.loaded / e.total) * 100);
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText) as { url?: string; code?: ErrorCode };
        if (xhr.status < 300 && body.url) resolve(body.url);
        else reject(new AppError(body.code ?? "UPLOAD_FAILED"));
      } catch {
        reject(new AppError("UPLOAD_FAILED"));
      }
    };
    xhr.onerror = () => reject(new AppError("NETWORK"));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(form);
  });
}
