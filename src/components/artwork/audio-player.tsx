"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { IconPause, IconPlay } from "@/components/ui/icons";
import { tap } from "@/lib/haptics";
import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/format";

interface AudioPlayerProps {
  src: string;
  duration: number;
  label?: string;
  onPlay?: () => void;
}

const RING = 2 * Math.PI * 34;

/** 작가 목소리 재생기: 큰 재생 버튼 + 원형 진행 표시 + 재생 중 물결 */
export function AudioPlayer({ src, duration: initialDuration, label = "작가의 목소리로 듣기", onPlay }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(initialDuration);
  const toast = useToast();
  const reduce = useReducedMotion();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrent(audio.currentTime);
    const onMeta = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
    };
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
    };
    const onPause = () => setPlaying(false);
    const onPlaying = () => setPlaying(true);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("playing", onPlaying);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("playing", onPlaying);
    };
  }, []);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    tap();
    if (!audio.paused) {
      audio.pause();
      return;
    }
    onPlay?.();
    try {
      await audio.play();
    } catch {
      toast.error("소리를 재생하지 못했어요. 휴대폰의 무음 모드를 확인한 뒤 다시 눌러 주세요.");
    }
  }

  const progress = duration > 0 ? Math.min(1, current / duration) : 0;

  return (
    <div className="flex items-center gap-4">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "잠시 멈추기" : label}
        aria-pressed={playing}
        className="group relative flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full transition-transform duration-200 active:scale-95"
      >
        {playing && !reduce && (
          <>
            <span className="absolute inset-0 animate-ping rounded-full bg-blue/15 [animation-duration:2.2s]" />
            <span className="absolute -inset-2 animate-ping rounded-full bg-blue/10 [animation-delay:0.6s] [animation-duration:2.2s]" />
          </>
        )}
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 76 76" aria-hidden>
          <circle cx="38" cy="38" r="34" fill="none" stroke="var(--color-blue-mist)" strokeWidth="4" />
          <circle
            cx="38"
            cy="38"
            r="34"
            fill="none"
            stroke="var(--color-blue)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={RING}
            strokeDashoffset={RING * (1 - progress)}
            className="transition-[stroke-dashoffset] duration-300 ease-linear"
          />
        </svg>
        <span className="relative flex h-[58px] w-[58px] items-center justify-center rounded-full bg-blue text-paper-light shadow-[0_8px_20px_-8px_rgb(42_92_170/0.7)] transition-colors group-hover:bg-blue-deep">
          {playing ? <IconPause size={24} /> : <IconPlay size={24} className="translate-x-[2px]" />}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <p className="font-hand text-[1.55rem] leading-none text-blue-deep">{label}</p>
        <div className="mt-2.5 flex items-center gap-3">
          <Waveform playing={playing && !reduce} />
          <span className="tabular text-sm text-ink-soft">
            {formatDuration(current)} / {formatDuration(duration)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          onChange={(e) => {
            const audio = audioRef.current;
            if (audio) audio.currentTime = Number(e.target.value);
            setCurrent(Number(e.target.value));
          }}
          aria-label="재생 위치"
          className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-blue-mist accent-blue"
          style={{
            background: `linear-gradient(to right, var(--color-blue) ${progress * 100}%, var(--color-blue-mist) ${progress * 100}%)`,
          }}
        />
      </div>
    </div>
  );
}

function Waveform({ playing }: { playing: boolean }) {
  const bars = [0.45, 0.8, 0.55, 1, 0.65, 0.9, 0.5, 0.75, 0.4];
  return (
    <span className="flex h-5 items-center gap-[3px]" aria-hidden>
      {bars.map((h, i) => (
        <motion.span
          key={i}
          className={cn("w-[3px] rounded-full", playing ? "bg-blue" : "bg-paper-edge")}
          animate={playing ? { height: [`${h * 30}%`, `${h * 100}%`, `${h * 45}%`] } : { height: `${h * 45}%` }}
          transition={playing ? { duration: 0.8 + (i % 3) * 0.18, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" } : { duration: 0.3 }}
        />
      ))}
    </span>
  );
}
