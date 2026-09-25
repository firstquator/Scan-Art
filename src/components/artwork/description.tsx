"use client";

import { motion } from "motion/react";
import { useSyncExternalStore } from "react";
import type { Paragraph } from "@/lib/sentences";
import { cn } from "@/lib/cn";
import { tap } from "@/lib/haptics";

const SIZES = [
  { key: "base", label: "보통", className: "text-[17px] leading-[1.95]" },
  { key: "lg", label: "크게", className: "text-[20px] leading-[1.9]" },
  { key: "xl", label: "아주 크게", className: "text-[23.5px] leading-[1.85]" },
] as const;

type SizeKey = (typeof SIZES)[number]["key"];
const STORAGE_KEY = "scan-art:text-size";
const listeners = new Set<() => void>();

function readSize(): SizeKey {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v && SIZES.some((s) => s.key === v)) return v as SizeKey;
  } catch {
    // 개인정보 보호 모드 등에서는 저장소를 못 쓸 수 있다.
  }
  return "base";
}

function writeSize(value: SizeKey) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // 무시
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTextSize() {
  const size = useSyncExternalStore(subscribe, readSize, () => "base" as SizeKey);
  return [size, writeSize] as const;
}

export function TextSizeControl() {
  const [size, setSize] = useTextSize();
  return (
    <div className="inline-flex items-center rounded-full border border-paper-edge bg-paper-light/80 p-1 shadow-[var(--shadow-inset)]" role="radiogroup" aria-label="글자 크기">
      {SIZES.map((s, i) => {
        const active = s.key === size;
        return (
          <button
            key={s.key}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`글자 ${s.label}`}
            onClick={() => {
              tap(5);
              setSize(s.key);
            }}
            className={cn(
              "relative flex h-9 min-w-10 items-center justify-center rounded-full px-2.5 font-serif font-bold transition-colors",
              active ? "text-paper-light" : "text-ink-soft hover:text-ink",
            )}
          >
            {active && (
              <motion.span layoutId="text-size-pill" className="absolute inset-0 rounded-full bg-blue" transition={{ type: "spring", stiffness: 500, damping: 36 }} />
            )}
            <span className="relative" style={{ fontSize: 13 + i * 3.5 }}>
              가
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** 설명글. 읽어주는 중이면 지금 문장을 쪽빛으로 강조한다. */
export function Description({ paragraphs, activeSentence }: { paragraphs: Paragraph[]; activeSentence: number }) {
  const [size] = useTextSize();
  const sizeClass = SIZES.find((s) => s.key === size)?.className ?? SIZES[0].className;

  return (
    <div className={cn("space-y-[1.1em] text-ink transition-[font-size] duration-300", sizeClass)}>
      {paragraphs.map((p, pi) => (
        <p key={pi}>
          {p.sentences.map((s) => (
            <span
              key={s.index}
              className={cn(
                "rounded-md transition-[background-color,color,box-shadow] duration-300 [box-decoration-break:clone]",
                s.index === activeSentence && "bg-blue-mist text-blue-deep shadow-[0_0_0_3px_var(--color-blue-mist)]",
              )}
            >
              {s.text}{" "}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}
