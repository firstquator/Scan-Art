"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { IconUser, IconX } from "@/components/ui/icons";
import { MAX_ARTISTS } from "@/lib/validation";
import { cn } from "@/lib/cn";

interface ArtistsInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
}

/** 작가 이름표 입력: 이름을 쓰고 Enter(또는 쉼표). 여러 명을 한 번에 붙여넣어도 나눠 준다. */
export function ArtistsInput({ value, onChange, error }: ArtistsInputProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  function add(raw: string) {
    const names = raw
      .split(/[,，、\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.slice(0, 40));
    if (names.length === 0) return;
    onChange([...value, ...names].slice(0, MAX_ARTISTS));
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return; // 한글 조합 중에는 무시
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-[15px] font-semibold text-ink">
        작가
      </label>
      <div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          "flex min-h-12 w-full cursor-text flex-wrap items-center gap-1.5 rounded-2xl border bg-paper-light/90 px-2 py-2 shadow-[var(--shadow-inset)] transition-[border-color,box-shadow]",
          "focus-within:border-blue focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgb(42_92_170/0.14)]",
          error ? "border-danger" : "border-paper-edge",
        )}
      >
        <AnimatePresence initial={false}>
          {value.map((name, i) => (
            <motion.span
              key={`${name}-${i}`}
              layout
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
              className="inline-flex h-9 items-center gap-1 rounded-full bg-blue-mist pl-1.5 pr-1 text-[15px] font-semibold text-blue-deep"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-paper-light/80">
                <IconUser size={13} strokeWidth={2.2} />
              </span>
              <span className="px-0.5">{name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(value.filter((_, j) => j !== i));
                }}
                aria-label={`${name} 빼기`}
                className="flex h-7 w-7 items-center justify-center rounded-full text-blue-deep/70 transition-colors hover:bg-paper-light hover:text-danger"
              >
                <IconX size={14} strokeWidth={2.4} />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          ref={inputRef}
          id={id}
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            if (/[,，、]/.test(v)) add(v);
            else setDraft(v);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => add(draft)}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (/[,，、\n]/.test(text)) {
              e.preventDefault();
              add(draft + text);
            }
          }}
          enterKeyHint="enter"
          placeholder={value.length === 0 ? "이름을 쓰고 Enter (여러 명 가능)" : "한 명 더 추가"}
          aria-invalid={!!error || undefined}
          className="h-9 min-w-[9rem] flex-1 bg-transparent px-2 text-[16px] text-ink placeholder:text-ink-faint/80 focus:outline-none"
        />
      </div>
      {error ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-[13px] text-ink-faint">실명이나 “3반 친구들”처럼 자유롭게 적을 수 있어요. 쉼표로 여러 명을 한 번에 넣을 수 있어요.</p>
      )}
    </div>
  );
}
