"use client";

import { AnimatePresence, motion } from "motion/react";
import { nanoid } from "nanoid";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AudioPlayer } from "@/components/artwork/audio-player";
import { InkButton } from "@/components/ui/ink-button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { IconMic, IconRefresh, IconStop, IconTrash, IconUpload } from "@/components/ui/icons";
import { canRecord, extensionFor, openMicrophone, pickRecordingType, readAudioDuration } from "@/lib/audio/recorder";
import { AppError, messageFor, toErrorCode, type ErrorCode } from "@/lib/errors";
import { formatDuration } from "@/lib/format";
import { AUDIO_CONTENT_TYPES, baseContentType, MAX_AUDIO_BYTES } from "@/lib/storage/policy";
import { uploadFile, type StorageMode } from "@/lib/storage/client";
import { MAX_AUDIO_SECONDS } from "@/lib/validation";
import { tap } from "@/lib/haptics";
import type { EditorAudio } from "./editor-types";

type Phase =
  | { kind: "idle" }
  | { kind: "recording"; startedAt: number }
  | { kind: "review"; blob: Blob; url: string; duration: number; type: string }
  | { kind: "uploading"; progress: number };

interface AudioRecorderProps {
  artworkId: string;
  storageMode: StorageMode;
  audio: EditorAudio | null;
  onChange: (audio: EditorAudio | null) => void;
  onUploaded: (url: string) => void;
  onBusyChange: (busy: boolean) => void;
}

/** 학생 목소리 녹음: 녹음 → 들어보기 → 사용하기. 녹음 파일을 올릴 수도 있다. */
export function AudioRecorder({ artworkId, storageMode, audio, onChange, onUploaded, onBusyChange }: AudioRecorderProps) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [elapsed, setElapsed] = useState(0);
  const [micHelp, setMicHelp] = useState<ErrorCode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const supported = useSyncExternalStore(noopSubscribe, canRecord, () => false);
  const elapsedRef = useRef(0);

  useEffect(() => {
    onBusyChange(phase.kind === "recording" || phase.kind === "uploading" || phase.kind === "review");
  }, [phase.kind, onBusyChange]);

  useEffect(() => () => cleanupStream(), []);

  function cleanupStream() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }

  async function start() {
    try {
      const stream = await openMicrophone();
      streamRef.current = stream;
      const type = pickRecordingType();
      if (!type) throw new AppError("RECORDING_UNSUPPORTED");
      const recorder = new MediaRecorder(stream, { mimeType: type, audioBitsPerSecond: 64000 });
      recorderRef.current = recorder;
      chunks.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      recorder.onstop = async () => {
        cleanupStream();
        const blob = new Blob(chunks.current, { type: baseContentType(recorder.mimeType || type) });
        if (blob.size === 0) {
          toast.error(messageFor("RECORDING_FAILED"));
          setPhase({ kind: "idle" });
          return;
        }
        const url = URL.createObjectURL(blob);
        const duration = (await readAudioDuration(url)) || elapsedRef.current;
        setPhase({ kind: "review", blob, url, duration, type: blob.type });
      };
      recorder.start(250);
      const startedAt = Date.now();
      setElapsed(0);
      setPhase({ kind: "recording", startedAt });
      tap([10, 40, 10]);
      drawLevels(stream, startedAt);
    } catch (error) {
      cleanupStream();
      const code = toErrorCode(error);
      if (code === "MIC_DENIED" || code === "MIC_NOT_FOUND" || code === "RECORDING_UNSUPPORTED") setMicHelp(code);
      else toast.fromError(error);
    }
  }


  function drawLevels(stream: MediaStream, startedAt: number) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    audioCtxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const history: number[] = [];

    const loop = () => {
      const secs = (Date.now() - startedAt) / 1000;
      elapsedRef.current = secs;
      setElapsed(secs);
      if (secs >= MAX_AUDIO_SECONDS) {
        stop();
        toast.info("3분이 되어 녹음을 멈췄습니다.");
        return;
      }
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128);
      history.push(peak);
      if (history.length > 64) history.shift();

      const canvas = canvasRef.current;
      const g = canvas?.getContext("2d");
      if (canvas && g) {
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.clientWidth * dpr;
        const h = canvas.clientHeight * dpr;
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
        g.clearRect(0, 0, w, h);
        const bar = w / 64;
        history.forEach((v, i) => {
          const bh = Math.max(3 * dpr, Math.min(1, v * 2.4) * h);
          g.fillStyle = `rgba(42, 92, 170, ${0.35 + (i / 64) * 0.65})`;
          const x = i * bar + bar * 0.2;
          g.beginPath();
          g.roundRect(x, (h - bh) / 2, bar * 0.6, bh, bar * 0.3);
          g.fill();
        });
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
  }

  function stop() {
    cancelAnimationFrame(rafRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    tap(10);
  }

  function discardReview() {
    if (phase.kind === "review") URL.revokeObjectURL(phase.url);
    setPhase({ kind: "idle" });
  }

  async function commitAudio(blob: Blob, type: string, duration: number) {
    if (duration > MAX_AUDIO_SECONDS + 5) {
      toast.error(messageFor("AUDIO_TOO_LONG"));
      return;
    }
    if (blob.size > MAX_AUDIO_BYTES) {
      toast.error(messageFor("FILE_TOO_LARGE"));
      return;
    }
    setPhase({ kind: "uploading", progress: 0 });
    try {
      const url = await uploadFile({
        mode: storageMode,
        pathname: `artworks/${artworkId}/audio-${nanoid(10)}.${extensionFor(type)}`,
        file: blob,
        contentType: type,
        onProgress: (p) => setPhase({ kind: "uploading", progress: p }),
      });
      onUploaded(url);
      onChange({ url, duration: Math.round(duration), bytes: blob.size });
      setPhase({ kind: "idle" });
      toast.success("목소리를 담았습니다. 저장하면 관람객이 들을 수 있습니다.");
    } catch (error) {
      toast.fromError(error);
      setPhase({ kind: "idle" });
    }
  }

  async function onFile(file: File) {
    const type = baseContentType(file.type || "audio/mp4");
    if (!AUDIO_CONTENT_TYPES.includes(type)) {
      toast.error(messageFor("AUDIO_UNSUPPORTED"));
      return;
    }
    const url = URL.createObjectURL(file);
    const duration = await readAudioDuration(url);
    URL.revokeObjectURL(url);
    await commitAudio(file, type === "audio/x-m4a" ? "audio/mp4" : type, duration);
  }

  return (
    <div>
      <AnimatePresence mode="wait" initial={false}>
        {phase.kind === "recording" ? (
          <motion.div key="rec" {...fade} className="rounded-[20px] border border-blue/25 bg-blue-mist/40 p-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inset-0 animate-ping rounded-full bg-danger/70" />
                <span className="relative h-3 w-3 rounded-full bg-danger" />
              </span>
              <span className="text-[15px] font-semibold text-ink">녹음하고 있습니다</span>
              <span className="tabular ml-auto font-mono text-lg font-semibold text-blue-deep">
                {formatDuration(elapsed)} <span className="text-sm text-ink-faint">/ 3:00</span>
              </span>
            </div>
            <canvas ref={canvasRef} className="mt-3 h-16 w-full" aria-hidden />
            <InkButton variant="danger" size="lg" icon={<IconStop size={20} />} onClick={stop} className="mt-3 w-full">
              녹음 끝내기
            </InkButton>
          </motion.div>
        ) : phase.kind === "review" ? (
          <motion.div key="review" {...fade} className="rounded-[20px] border border-paper-edge bg-paper-light/80 p-4">
            <p className="mb-3 text-[14.5px] font-semibold text-ink">녹음을 들어 보고 마음에 들면 사용해 주세요</p>
            <AudioPlayer src={phase.url} duration={phase.duration} label="녹음 들어 보기" />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <InkButton variant="ghost" icon={<IconRefresh size={18} />} onClick={discardReview}>
                다시 녹음
              </InkButton>
              <InkButton
                onClick={() => {
                  const { blob, type, duration, url } = phase;
                  URL.revokeObjectURL(url);
                  void commitAudio(blob, type, duration);
                }}
              >
                이 녹음 사용하기
              </InkButton>
            </div>
          </motion.div>
        ) : phase.kind === "uploading" ? (
          <motion.div key="up" {...fade} className="rounded-[20px] border border-paper-edge bg-paper-light/80 p-5">
            <p className="text-[14.5px] font-semibold text-ink">목소리를 올리고 있어요… {Math.round(phase.progress)}%</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-deep">
              <motion.div className="h-full rounded-full bg-blue" animate={{ width: `${phase.progress}%` }} />
            </div>
          </motion.div>
        ) : audio ? (
          <motion.div key="has" {...fade} className="rounded-[20px] border border-paper-edge bg-paper-light/80 p-4">
            <AudioPlayer src={audio.url} duration={audio.duration} />
            <div className="mt-4 flex flex-wrap gap-2">
              {supported && (
                <InkButton variant="secondary" size="sm" icon={<IconMic size={16} />} onClick={start}>
                  다시 녹음
                </InkButton>
              )}
              <InkButton variant="outline" size="sm" icon={<IconUpload size={16} />} onClick={() => fileRef.current?.click()}>
                파일로 바꾸기
              </InkButton>
              <InkButton variant="danger-soft" size="sm" icon={<IconTrash size={16} />} onClick={() => onChange(null)} className="ml-auto">
                녹음 빼기
              </InkButton>
            </div>
          </motion.div>
        ) : (
          <motion.div key="idle" {...fade} className="flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={start}
              className="group flex flex-1 items-center gap-4 rounded-[20px] border border-blue/20 bg-blue-mist/45 p-4 text-left transition-[background-color,transform] hover:bg-blue-mist active:scale-[0.98]"
            >
              <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue text-paper-light shadow-[0_8px_20px_-8px_rgb(42_92_170/0.8)] transition-transform group-hover:scale-105">
                <IconMic size={26} />
              </span>
              <span>
                <span className="block font-hand text-[1.5rem] leading-none text-blue-deep">목소리 녹음하기</span>
                <span className="mt-1.5 block text-[13.5px] text-ink-soft">학생이 직접 작품을 소개합니다 (3분까지)</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-[20px] border border-paper-edge bg-paper-light/80 px-5 py-4 text-[14.5px] font-semibold text-ink transition-colors hover:bg-paper-deep/60 sm:flex-col sm:gap-1.5"
            >
              <IconUpload size={20} />
              녹음 파일 올리기
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={fileRef}
        type="file"
        accept="audio/*,.m4a,.mp3,.webm"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void onFile(file);
        }}
      />

      <Modal
        open={micHelp !== null}
        onClose={() => setMicHelp(null)}
        title={micHelp === "MIC_DENIED" ? "마이크 권한이 필요합니다" : micHelp === "MIC_NOT_FOUND" ? "마이크를 찾을 수 없습니다" : "이 브라우저에서는 녹음할 수 없습니다"}
        description={micHelp ? messageFor(micHelp) : undefined}
        size="md"
        footer={
          <>
            <InkButton variant="ghost" onClick={() => setMicHelp(null)}>
              닫기
            </InkButton>
            <InkButton
              icon={<IconUpload size={18} />}
              onClick={() => {
                setMicHelp(null);
                fileRef.current?.click();
              }}
            >
              녹음 파일 올리기
            </InkButton>
          </>
        }
      >
        {micHelp === "MIC_DENIED" && (
          <ol className="list-decimal space-y-2 rounded-2xl bg-paper-deep/50 py-4 pl-9 pr-4 text-[14.5px] leading-relaxed text-ink">
            <li>주소창 왼쪽의 자물쇠(또는 설정) 아이콘을 누릅니다.</li>
            <li>‘마이크’를 ‘허용’으로 바꿉니다.</li>
            <li>페이지를 새로고침한 뒤 다시 녹음 버튼을 누릅니다.</li>
            <li>아이폰은 ‘설정 → 사파리(또는 크롬) → 마이크’에서도 허용할 수 있습니다.</li>
          </ol>
        )}
        {micHelp === "RECORDING_UNSUPPORTED" && (
          <p className="text-[14.5px] leading-relaxed text-ink-soft">휴대폰의 음성 메모 앱으로 녹음한 뒤, 그 파일을 올려도 괜찮습니다.</p>
        )}
      </Modal>
    </div>
  );
}

const noopSubscribe = () => () => {};

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.22 },
};
