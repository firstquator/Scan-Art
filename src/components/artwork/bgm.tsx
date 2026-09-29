"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { IconMusicOff } from "@/components/ui/icons";
import { tap } from "@/lib/haptics";
import { cn } from "@/lib/cn";

/**
 * 작품 화면 배경음악.
 * - 오디오 요소를 하나만 두고 페이지를 옮겨 다녀도 유지한다: 다음 작품도 같은 음악이면 끊기지 않고 이어진다.
 * - 처음에는 켜져 있다: 브라우저가 자동 재생을 막으면 화면을 처음 누를 때 시작한다. 끈 선택은 3시간만 기억한다.
 * - 작가 목소리·읽어주기가 나오는 동안에는 잠시 줄였다가(멈췄다가) 끝나면 다시 튼다.
 *   (아이폰은 소리 크기를 코드로 바꿀 수 없어 줄이는 대신 멈춘다.)
 */

// 키를 바꾸면 예전에 저장된 "끔"이 모두 초기화된다(v2: 기본 켜짐으로 바꾸며 초기화).
const STORAGE_KEY = "scan-art:bgm:v2";
/** "끔"은 한 번 관람하는 동안만 기억한다. 나중에 다시 오면 다시 켜진 채로 시작한다. */
const OFF_TTL_MS = 3 * 60 * 60 * 1000;
const VOLUME = 0.45;
// 브라우저가 '사용자가 직접 한 동작'으로 인정해 소리를 허락하는 이벤트들.
// (pointerdown은 휴대폰 터치에서 인정되지 않아 넣지 않는다.)
const GESTURES = ["touchend", "pointerup", "click", "keydown"] as const;

interface BgmState {
  enabled: boolean;
  playing: boolean;
  /** 켜져 있지만 브라우저가 막아서 화면을 누르기를 기다리는 중 */
  blocked: boolean;
}

let audio: HTMLAudioElement | null = null;
let loadedSrc: string | null = null;
let wantedSrc: string | null = null;
let enabled = false;
let ducked = false;
let prefLoaded = false;
let releaseTimer: ReturnType<typeof setTimeout> | undefined;
let fadeRaf = 0;
let blocked = false;
let state: BgmState = { enabled: false, playing: false, blocked: false };
const listeners = new Set<() => void>();

function emit() {
  state = { enabled, playing: !!audio && !audio.paused, blocked: enabled && blocked };
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

/**
 * 재생한다. a.play()는 await 전에 동기로 불리므로 터치 이벤트 안에서 부르면 '사용자 동작'으로 인정된다.
 * 휴대폰 브라우저는 화면을 한 번도 누르지 않은 페이지의 소리 재생을 막는다(어떤 코드로도 우회할 수 없다).
 * 막히면 화면을 누를 때마다 다시 시도하고, 성공하면 기다리기를 멈춘다.
 */
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
    setBlocked(false);
    fadeTo(VOLUME, 1100);
  } catch {
    if (enabled) setBlocked(true);
  }
}

function onGesture(e: Event) {
  // 음악 버튼을 누른 경우는 버튼이 알아서 처리한다.
  if (e.target instanceof Element && e.target.closest("[data-bgm-toggle]")) return;
  void play();
}

function setBlocked(value: boolean) {
  if (blocked === value) return;
  blocked = value;
  if (value) GESTURES.forEach((t) => document.addEventListener(t, onGesture, { capture: true, passive: true }));
  else GESTURES.forEach((t) => document.removeEventListener(t, onGesture, { capture: true }));
  emit();
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
  if (!value) setBlocked(false);
  if (persist) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? "on" : `off:${Date.now()}`);
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
    enabled = !isFreshOff(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    enabled = true;
  }
  emit();
}

function isFreshOff(value: string | null): boolean {
  if (!value?.startsWith("off:")) return false;
  return Date.now() - Number(value.slice(4)) < OFF_TTL_MS;
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

const serverState: BgmState = { enabled: false, playing: false, blocked: false };

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
    blocked: snapshot.blocked,
    // 켜져 있는데 막혀서 못 나오는 중이면, 버튼은 끄는 대신 바로 틀어 준다.
    toggle: () => (enabled && blocked ? void play() : setEnabled(!enabled, persist)),
  };
}

/** 머리말의 배경음악 켜기/끄기 버튼. 처음 온 관람객에게는 잠깐 말풍선으로 알려 준다. */
export function BgmToggle({ src, duck, preview }: { src: string; duck: boolean; preview?: boolean }) {
  const { enabled, playing, blocked, toggle } = useBgm(src, { persist: !preview, duck });
  const [hint, setHint] = useState(false);
  const waiting = blocked && !preview;
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
  const label = waiting ? "음악 듣기" : on ? "음악 끄기" : "음악 켜기";

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
        aria-label={waiting ? "배경음악 듣기" : on ? "배경음악 끄기" : "배경음악 켜기"}
        className={cn(
          "relative flex h-9 items-center gap-1.5 rounded-full border pl-2.5 pr-3 text-[13px] font-bold transition-[background-color,border-color,color,transform] duration-200 active:scale-95",
          on
            ? "border-blue bg-blue text-paper-light shadow-[0_6px_14px_-8px_rgb(42_92_170/0.9)] hover:bg-blue-deep"
            : "border-paper-edge bg-paper-light/80 text-ink-soft hover:bg-paper-deep/70 hover:text-ink",
        )}
      >
        {waiting && !reduce && <span className="absolute -inset-1 animate-ping rounded-full border-2 border-blue/40 [animation-duration:1.8s]" aria-hidden />}
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
        <span>{label}</span>
      </button>

      <AnimatePresence>
        {(hint || waiting) && (
          <motion.p
            role="status"
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-[calc(100%+10px)] z-40 whitespace-nowrap rounded-2xl bg-ink px-3.5 py-2 text-[13px] font-semibold text-paper-light shadow-[var(--shadow-lift)]"
          >
            <span className="absolute -top-1.5 right-6 h-3 w-3 rotate-45 rounded-[2px] bg-ink" aria-hidden />
            {waiting ? "화면을 누르면 배경음악이 나와요" : "배경음악이 흘러요 · 누르면 꺼집니다"}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
