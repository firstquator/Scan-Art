"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { IconMusicOff } from "@/components/ui/icons";
import { tap } from "@/lib/haptics";
import { cn } from "@/lib/cn";

/**
 * 작품 화면 배경음악.
 * - 오디오 요소를 하나만 두고 페이지를 옮겨 다녀도 유지한다: 다음 작품도 같은 음악이면 끊기지 않고 이어진다.
 * - 켬/끔은 기기에 기억한다. 처음에는 꺼져 있다(전시장에서 갑자기 소리가 나지 않도록).
 * - 작가 목소리·읽어주기가 나오는 동안에는 잠시 줄였다가(멈췄다가) 끝나면 다시 튼다.
 *   (아이폰은 소리 크기를 코드로 바꿀 수 없어 줄이는 대신 멈춘다.)
 */

const STORAGE_KEY = "scan-art:bgm";
const VOLUME = 0.45;
const GESTURES = ["pointerdown", "keydown", "touchend"] as const;

interface BgmState {
  enabled: boolean;
  playing: boolean;
}

let audio: HTMLAudioElement | null = null;
let loadedSrc: string | null = null;
let wantedSrc: string | null = null;
let enabled = false;
let ducked = false;
let prefLoaded = false;
let releaseTimer: ReturnType<typeof setTimeout> | undefined;
let fadeRaf = 0;
let waitingGesture = false;
let state: BgmState = { enabled: false, playing: false };
const listeners = new Set<() => void>();

function emit() {
  state = { enabled, playing: !!audio && !audio.paused };
  listeners.forEach((l) => l());
}

function element(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.loop = true;
    audio.preload = "none";
    audio.addEventListener("playing", emit);
    audio.addEventListener("pause", emit);
  }
  return audio;
}

function setVolume(a: HTMLAudioElement, v: number) {
  try {
    a.volume = Math.max(0, Math.min(1, v));
  } catch {
    // 일부 기기는 소리 크기를 바꿀 수 없다.
  }
}

function fadeTo(target: number, ms: number, then?: () => void) {
  cancelAnimationFrame(fadeRaf);
  const a = element();
  const from = a.volume;
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    setVolume(a, from + (target - from) * t);
    if (t < 1) fadeRaf = requestAnimationFrame(step);
    else then?.();
  };
  fadeRaf = requestAnimationFrame(step);
}

function fadeOutAndPause(ms = 450) {
  if (!audio || audio.paused) return;
  fadeTo(0, ms, () => audio?.pause());
}

async function play() {
  if (!wantedSrc || !enabled || ducked) return;
  const a = element();
  if (loadedSrc !== wantedSrc) {
    a.src = wantedSrc;
    loadedSrc = wantedSrc;
  }
  if (!a.paused && a.volume >= VOLUME - 0.01) return;
  if (a.paused) setVolume(a, 0);
  try {
    await a.play();
    fadeTo(VOLUME, 1100);
  } catch {
    // 브라우저가 자동 재생을 막았다: 화면을 처음 누르는 순간 튼다.
    waitForGesture();
  }
}

function waitForGesture() {
  if (waitingGesture) return;
  waitingGesture = true;
  const go = (e: Event) => {
    // 음악 버튼을 누른 경우는 버튼이 알아서 처리한다.
    if (e.target instanceof Element && e.target.closest("[data-bgm-toggle]")) return;
    stop();
    void play();
  };
  const stop = () => {
    waitingGesture = false;
    GESTURES.forEach((t) => document.removeEventListener(t, go, true));
  };
  GESTURES.forEach((t) => document.addEventListener(t, go, true));
}

/** 다른 음악으로 바꿔야 하면 부드럽게 줄였다가 바꿔 튼다. */
function setSource(src: string | null) {
  clearTimeout(releaseTimer);
  if (src === wantedSrc) {
    void play();
    return;
  }
  wantedSrc = src;
  if (!src) {
    fadeOutAndPause();
    return;
  }
  if (audio && !audio.paused && loadedSrc !== src) {
    fadeTo(0, 500, () => {
      audio?.pause();
      void play();
    });
  } else {
    void play();
  }
}

/** 작품 화면을 떠날 때. 곧바로 다음 작품 화면이 이어지면 취소된다. */
function release(src: string | null) {
  clearTimeout(releaseTimer);
  releaseTimer = setTimeout(() => {
    if (wantedSrc !== src) return;
    wantedSrc = null;
    fadeOutAndPause(600);
  }, 250);
}

function setEnabled(value: boolean, persist: boolean) {
  enabled = value;
  if (persist) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? "on" : "off");
    } catch {
      // 개인정보 보호 모드 등에서는 기억하지 못해도 괜찮다.
    }
  }
  emit();
  if (value) void play();
  else fadeOutAndPause(350);
}

function setDucked(value: boolean) {
  if (ducked === value) return;
  ducked = value;
  if (value) fadeOutAndPause(300);
  else void play();
}

function loadPref() {
  if (prefLoaded) return;
  prefLoaded = true;
  try {
    enabled = window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    enabled = false;
  }
  emit();
}

function hasPref(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return true;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const serverState: BgmState = { enabled: false, playing: false };

interface UseBgmOptions {
  /** 켬/끔을 기기에 기억하고, 켜 둔 사람에게는 들어오자마자 튼다(관리자 미리보기에서는 끈다). */
  persist: boolean;
  /** 작가 목소리·읽어주기가 나오는 중 */
  duck: boolean;
}

export function useBgm(src: string | null, { persist, duck }: UseBgmOptions) {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => serverState);

  useEffect(() => {
    if (persist) loadPref();
    setSource(src);
    return () => release(src);
  }, [src, persist]);

  useEffect(() => {
    setDucked(duck);
  }, [duck]);

  // 목소리를 듣던 중에 다른 작품으로 넘어가도 다음 화면에서는 음악이 다시 나오게 한다.
  useEffect(
    () => () => {
      ducked = false;
    },
    [],
  );

  return {
    enabled: snapshot.enabled,
    playing: snapshot.playing,
    toggle: () => setEnabled(!enabled, persist),
  };
}

/** 머리말의 배경음악 켜기/끄기 버튼. 처음 온 관람객에게는 잠깐 말풍선으로 알려 준다. */
export function BgmToggle({ src, duck, preview }: { src: string; duck: boolean; preview?: boolean }) {
  const { enabled, playing, toggle } = useBgm(src, { persist: !preview, duck });
  const [hint, setHint] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (preview || hasPref()) return;
    const show = setTimeout(() => setHint(true), 900);
    const hide = setTimeout(() => setHint(false), 6500);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [preview]);

  const on = enabled;
  const sounding = on && playing && !reduce;

  return (
    <div className="relative">
      <button
        type="button"
        data-bgm-toggle
        onClick={() => {
          tap(8);
          setHint(false);
          toggle();
        }}
        aria-pressed={on}
        aria-label={on ? "배경음악 끄기" : "배경음악 켜기"}
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-full border pl-2.5 pr-3 text-[13px] font-bold transition-[background-color,border-color,color,transform] duration-200 active:scale-95",
          on
            ? "border-blue bg-blue text-paper-light shadow-[0_6px_14px_-8px_rgb(42_92_170/0.9)] hover:bg-blue-deep"
            : "border-paper-edge bg-paper-light/80 text-ink-soft hover:bg-paper-deep/70 hover:text-ink",
        )}
      >
        {on ? (
          <span className="flex h-4 w-4 items-end justify-center gap-[2px] pb-[1px]" aria-hidden>
            {[0.55, 1, 0.7].map((h, i) => (
              <motion.span
                key={i}
                className="w-[3px] rounded-full bg-paper-light"
                animate={sounding ? { height: [`${h * 30}%`, "100%", `${h * 45}%`] } : { height: `${h * 70}%` }}
                transition={sounding ? { duration: 0.6 + i * 0.15, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" } : { duration: 0.25 }}
              />
            ))}
          </span>
        ) : (
          <IconMusicOff size={16} strokeWidth={2} />
        )}
        <span>{on ? "음악 끄기" : "음악 켜기"}</span>
      </button>

      <AnimatePresence>
        {hint && (
          <motion.p
            role="status"
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-[calc(100%+10px)] z-40 whitespace-nowrap rounded-2xl bg-ink px-3.5 py-2 text-[13px] font-semibold text-paper-light shadow-[var(--shadow-lift)]"
          >
            <span className="absolute -top-1.5 right-6 h-3 w-3 rotate-45 rounded-[2px] bg-ink" aria-hidden />
            배경음악과 함께 감상해 보세요
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
