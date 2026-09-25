"use client";

import { AppError } from "@/lib/errors";

/** iOS Safari에서도 재생되도록 mp4(AAC)를 먼저 고르고, 안 되면 webm(opus). */
const CANDIDATES = ["audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];

export function pickRecordingType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

export function extensionFor(contentType: string): string {
  const t = contentType.split(";")[0];
  if (t === "audio/mp4" || t === "audio/x-m4a" || t === "audio/aac") return "m4a";
  if (t === "audio/webm") return "webm";
  if (t === "audio/mpeg") return "mp3";
  if (t === "audio/ogg") return "ogg";
  return "m4a";
}

export function canRecord(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && pickRecordingType() !== null;
}

export async function openMicrophone(): Promise<MediaStream> {
  if (!canRecord()) throw new AppError("RECORDING_UNSUPPORTED");
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
}

/** 소리 파일의 길이(초)를 읽는다. 알 수 없으면 0. */
export function readAudioDuration(src: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = "metadata";
    const done = (v: number) => {
      audio.removeAttribute("src");
      resolve(Number.isFinite(v) && v > 0 ? v : 0);
    };
    audio.onloadedmetadata = () => {
      // Chrome의 webm은 길이가 Infinity로 나오는 경우가 있어 끝으로 한 번 넘겨서 알아낸다.
      if (audio.duration === Infinity) {
        audio.currentTime = 1e9;
        audio.ontimeupdate = () => {
          audio.ontimeupdate = null;
          done(audio.duration);
        };
      } else {
        done(audio.duration);
      }
    };
    audio.onerror = () => done(0);
    audio.src = src;
  });
}
