"use client";

import { AnimatePresence, motion } from "motion/react";
import { nanoid } from "nanoid";
import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { InkButton } from "@/components/ui/ink-button";
import { useToast } from "@/components/ui/toast";
import { IconMusic, IconMusicOff, IconPause, IconPlay, IconTrash, IconUpload } from "@/components/ui/icons";
import { extensionFor } from "@/lib/audio/recorder";
import { bgmDisplayName, DEFAULT_BGM } from "@/lib/bgm";
import { messageFor } from "@/lib/errors";
import { formatDuration } from "@/lib/format";
import { AUDIO_CONTENT_TYPES, baseContentType, MAX_AUDIO_BYTES } from "@/lib/storage/policy";
import { uploadFile, type StorageMode } from "@/lib/storage/client";
import { tap } from "@/lib/haptics";
import { cn } from "@/lib/cn";
import type { BgmInput } from "@/lib/validation";

type Custom = Extract<BgmInput, { mode: "custom" }>;

interface BgmPickerProps {
  artworkId: string;
  storageMode: StorageMode;
  value: BgmInput;
  onChange: (value: BgmInput) => void;
  onUploaded: (url: string) => void;
  onBusyChange: (busy: boolean) => void;
}

const MODES = [
  { mode: "default", label: "기본 음악", hint: "잔잔한 피아노", icon: IconMusic },
  { mode: "custom", label: "직접 고르기", hint: "음악 파일 올리기", icon: IconUpload },
  { mode: "none", label: "음악 없음", hint: "조용하게", icon: IconMusicOff },
] as const;

/** 작품 화면 배경음악: 기본 음악 · 직접 올린 파일 · 없음. 파일은 끌어다 놓거나 골라서 올린다. */
export function BgmPicker({ artworkId, storageMode, value, onChange, onUploaded, onBusyChange }: BgmPickerProps) {
  // 다른 선택지로 갔다가 돌아와도 올려 둔 파일을 다시 쓸 수 있게 기억한다.
  const [lastCustom, setLastCustom] = useState<Custom | null>(value.mode === "custom" ? value : null);
  const [pendingCustom, setPendingCustom] = useState(false);
  const [upload, setUpload] = useState<{ name: string; progress: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => onBusyChange(upload !== null), [upload, onBusyChange]);

  const selected = value.mode === "custom" || pendingCustom ? "custom" : value.mode;

  function choose(mode: (typeof MODES)[number]["mode"]) {
    tap(6);
    if (mode === "custom") {
      if (lastCustom) {
        setPendingCustom(false);
        onChange(lastCustom);
      } else {
        // 아직 파일이 없으면 올릴 자리를 먼저 보여 주고, 저장 값은 파일을 올린 뒤에 바꾼다.
        setPendingCustom(true);
      }
      return;
    }
    setPendingCustom(false);
    onChange({ mode });
  }

  async function onFile(file: File) {
    const type = baseContentType(file.type || guessType(file.name));
    if (!AUDIO_CONTENT_TYPES.includes(type)) {
      toast.error(messageFor("BGM_UNSUPPORTED"));
      return;
    }
    if (file.size > MAX_AUDIO_BYTES) {
      toast.error(messageFor("FILE_TOO_LARGE"));
      return;
    }
    const name = bgmDisplayName(file.name);
    setUpload({ name, progress: 0 });
    try {
      const contentType = type === "audio/x-m4a" ? "audio/mp4" : type;
      const url = await uploadFile({
        mode: storageMode,
        pathname: `artworks/${artworkId}/bgm-${nanoid(10)}.${extensionFor(contentType)}`,
        file,
        contentType,
        onProgress: (p) => setUpload({ name, progress: p }),
      });
      onUploaded(url);
      const next: Custom = { mode: "custom", url, name, bytes: file.size };
      setLastCustom(next);
      setPendingCustom(false);
      onChange(next);
      toast.success("배경음악을 담았습니다. 저장하면 관람객이 들을 수 있습니다.");
    } catch (error) {
      toast.fromError(error);
    } finally {
      setUpload(null);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("audio/") || /\.(mp3|m4a|wav|aac|ogg|webm)$/i.test(f.name));
    if (file) void onFile(file);
    else if (e.dataTransfer.files.length) toast.error(messageFor("BGM_UNSUPPORTED"));
  }

  const dropProps = {
    onDragOver: (e: DragEvent) => {
      if (!Array.from(e.dataTransfer.types).includes("Files")) return;
      e.preventDefault();
      setDragOver(true);
    },
    onDragLeave: (e: DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false);
    },
    onDrop,
  };

  return (
    // 어느 선택지에 있든 음악 파일을 끌어다 놓으면 바로 ‘직접 고르기’로 올린다.
    <div {...dropProps}>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="배경음악 고르기">
        {MODES.map(({ mode, label, hint, icon: Icon }) => {
          const active = selected === mode;
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(mode)}
              className={cn(
                "relative flex flex-col items-center gap-1.5 rounded-[18px] border px-2 py-3.5 text-center transition-[border-color,background-color,transform] active:scale-[0.97]",
                active ? "border-blue/60 bg-blue-mist/60 text-blue-deep" : "border-paper-edge bg-paper-light/70 text-ink-soft hover:bg-paper-deep/50 hover:text-ink",
              )}
            >
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-full transition-colors", active ? "bg-blue text-paper-light" : "bg-paper-deep/80")}>
                <Icon size={18} />
              </span>
              <span className="text-[14.5px] font-bold leading-tight">{label}</span>
              <span className="text-[12px] leading-tight text-ink-faint">{hint}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3">
        <AnimatePresence mode="wait" initial={false}>
          {upload ? (
            <motion.div key="up" {...fade} className="rounded-[20px] border border-paper-edge bg-paper-light/80 p-4">
              <p className="flex items-center gap-2 text-[14.5px] font-semibold text-ink">
                <IconMusic size={17} className="text-blue" />
                <span className="min-w-0 truncate">{upload.name}</span>
                <span className="tabular ml-auto shrink-0 text-blue">{Math.round(upload.progress)}%</span>
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-deep">
                <motion.div className="h-full rounded-full bg-blue" animate={{ width: `${upload.progress}%` }} />
              </div>
            </motion.div>
          ) : selected === "default" ? (
            <motion.div key="default" {...fade}>
              <BgmPreview src={DEFAULT_BGM.url} name={DEFAULT_BGM.name} caption="이 전시를 위해 만든 음악 · 끝없이 이어서 재생됩니다" />
            </motion.div>
          ) : selected === "custom" && value.mode === "custom" ? (
            <motion.div key={`custom-${value.url}`} {...fade}>
              <BgmPreview
                src={value.url}
                name={value.name}
                caption="직접 올린 음악 · 끝나면 처음부터 다시 재생됩니다"
                actions={
                  <>
                    <InkButton variant="outline" size="sm" icon={<IconUpload size={16} />} onClick={() => fileRef.current?.click()}>
                      다른 파일로 바꾸기
                    </InkButton>
                    <InkButton
                      variant="danger-soft"
                      size="sm"
                      icon={<IconTrash size={16} />}
                      className="ml-auto"
                      onClick={() => {
                        setLastCustom(null);
                        onChange({ mode: "default" });
                      }}
                    >
                      빼기
                    </InkButton>
                  </>
                }
              />
            </motion.div>
          ) : selected === "custom" ? (
            <motion.button
              key="drop"
              {...fade}
              type="button"
              onClick={() => fileRef.current?.click()}
              className={cn(
                "flex w-full flex-col items-center gap-2 rounded-[20px] border-2 border-dashed px-5 py-7 text-center transition-colors",
                dragOver ? "border-blue bg-blue-mist/70" : "border-paper-edge bg-paper-light/60 hover:border-blue/50 hover:bg-blue-mist/30",
              )}
            >
              <motion.span
                animate={dragOver ? { y: -4, scale: 1.08 } : { y: 0, scale: 1 }}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-blue text-paper-light shadow-[0_8px_20px_-8px_rgb(42_92_170/0.8)]"
              >
                <IconUpload size={22} />
              </motion.span>
              <span className="text-[15px] font-bold text-ink">{dragOver ? "여기에 놓으면 바로 올립니다" : "음악 파일을 끌어다 놓거나 눌러서 고르세요"}</span>
              <span className="text-[13px] text-ink-faint">mp3 · m4a · wav, 15MB까지</span>
            </motion.button>
          ) : (
            <motion.p key="none" {...fade} className="rounded-[20px] bg-paper-deep/40 px-4 py-3.5 text-[13.5px] leading-relaxed text-ink-soft">
              관람 화면에 배경음악 버튼이 나타나지 않습니다.
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {dragOver && selected !== "custom" && (
        <p className="mt-2 text-center text-[13px] font-semibold text-blue" role="status">
          놓으면 이 파일을 배경음악으로 올립니다
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="audio/*,.mp3,.m4a,.wav"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void onFile(file);
        }}
      />
    </div>
  );
}

/** 편집 화면에서 배경음악을 미리 들어 보는 작은 재생기 */
function BgmPreview({ src, name, caption, actions }: { src: string; name: string; caption: string; actions?: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const toast = useToast();

  // 화면이 준비되기 전에 길이 정보를 이미 읽었으면 이벤트를 놓치므로 한 번 확인한다.
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && audio.readyState >= 1 && Number.isFinite(audio.duration)) setDuration(audio.duration);
  }, [src]);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    tap();
    if (!audio.paused) {
      audio.pause();
      return;
    }
    try {
      await audio.play();
    } catch {
      toast.error("음악을 재생하지 못했습니다. 잠시 후 다시 눌러 주세요.");
    }
  }

  const progress = duration > 0 ? current / duration : 0;

  return (
    <div className="rounded-[20px] border border-paper-edge bg-paper-light/80 p-4">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        loop
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
      />
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "미리 듣기 멈추기" : `${name} 미리 듣기`}
          aria-pressed={playing}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue text-paper-light shadow-[0_8px_20px_-8px_rgb(42_92_170/0.7)] transition-[background-color,transform] hover:bg-blue-deep active:scale-95"
        >
          {playing ? <IconPause size={20} /> : <IconPlay size={20} className="translate-x-[1.5px]" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2">
            <span className="min-w-0 truncate text-[15px] font-bold text-ink">{name}</span>
            <Equalizer playing={playing} />
          </p>
          <p className="mt-0.5 truncate text-[12.5px] text-ink-faint">{caption}</p>
          <div className="mt-2 flex items-center gap-2.5">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={current}
              onChange={(e) => {
                const audio = audioRef.current;
                if (audio) audio.currentTime = Number(e.target.value);
              }}
              aria-label="미리 듣기 위치"
              className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full accent-blue"
              style={{ background: `linear-gradient(to right, var(--color-blue) ${progress * 100}%, var(--color-blue-mist) ${progress * 100}%)` }}
            />
            <span className="tabular shrink-0 text-[12px] text-ink-soft">
              {formatDuration(current)} / {formatDuration(duration)}
            </span>
          </div>
        </div>
      </div>
      {actions && <div className="mt-3.5 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

function Equalizer({ playing }: { playing: boolean }) {
  return (
    <span className="flex h-3.5 shrink-0 items-end gap-[2px]" aria-hidden>
      {[0.6, 1, 0.45, 0.8].map((h, i) => (
        <motion.span
          key={i}
          className={cn("w-[3px] rounded-full", playing ? "bg-blue" : "bg-paper-edge")}
          animate={playing ? { height: [`${h * 35}%`, "100%", `${h * 50}%`] } : { height: `${h * 45}%` }}
          transition={playing ? { duration: 0.7 + i * 0.13, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" } : { duration: 0.3 }}
        />
      ))}
    </span>
  );
}

function guessType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "wav") return "audio/wav";
  if (ext === "ogg") return "audio/ogg";
  if (ext === "webm") return "audio/webm";
  return "audio/mp4";
}

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.2 },
};
