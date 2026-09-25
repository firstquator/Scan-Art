"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { addMonths, monthGrid, parseDate, pickRange, todayString, type YearMonth } from "@/lib/calendar";
import { formatDate } from "@/lib/format";
import { tap } from "@/lib/haptics";
import { cn } from "@/lib/cn";
import { IconCalendar, IconChevronLeft, IconChevronRight, IconX } from "./icons";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

interface DateRangePickerProps {
  label: string;
  start: string;
  end: string;
  onChange: (range: { start: string; end: string }) => void;
  error?: string;
  optional?: boolean;
}

/** 달력에서 시작일과 종료일을 차례로 눌러 기간을 고른다. */
export function DateRangePicker({ label, start, end, onChange, error, optional }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [view, setView] = useState<YearMonth>(() => initialView(start));
  const rootRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const today = todayString();

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    if (!open) setView(initialView(start));
    setOpen((v) => !v);
  }

  function choose(date: string) {
    tap(6);
    const next = pickRange({ start, end }, date);
    onChange(next);
    if (next.start && next.end) setTimeout(() => setOpen(false), 180);
  }

  // 시작일만 고른 상태에서 마우스를 올린 날짜까지 미리 칠해 보여준다.
  const rangeEnd = end || (start && hover && hover > start ? hover : "");
  const cells = monthGrid(view.year, view.month);

  return (
    <div ref={rootRef} className="relative space-y-2">
      <div className="flex items-baseline justify-between">
        <span id={labelId} className="text-[15px] font-semibold text-ink">
          {label}
          {optional && <span className="ml-1.5 text-[13px] font-normal text-ink-faint">선택</span>}
        </span>
        {(start || end) && (
          <button type="button" onClick={() => onChange({ start: "", end: "" })} className="flex items-center gap-1 text-[13px] font-semibold text-ink-faint hover:text-danger">
            <IconX size={13} /> 지우기
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={toggle}
        aria-labelledby={labelId}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-describedby={error ? `${labelId}-error` : undefined}
        className={cn(
          "grid h-14 w-full grid-cols-[auto_1fr_auto_1fr] items-center gap-3 rounded-2xl border bg-paper-light/90 px-4 text-left shadow-[var(--shadow-inset)] transition-[border-color,box-shadow,background-color]",
          open ? "border-blue/60 bg-white shadow-[0_0_0_3px_rgb(42_92_170/0.08)]" : "border-paper-edge hover:border-[#cfc2a6]",
          error && "!border-danger",
        )}
      >
        <IconCalendar size={20} className="text-blue" />
        <DateSlot caption="시작일" value={start} />
        <span className="text-ink-faint" aria-hidden>
          →
        </span>
        <DateSlot caption="종료일" value={end} placeholder={start ? "끝나는 날을 고르세요" : undefined} />
      </button>
      {error && (
        <p id={`${labelId}-error`} className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={`${label} 고르기`}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="deckle absolute left-0 top-full z-50 mt-2 w-full max-w-[360px] origin-top rounded-[22px] p-4"
            onPointerLeave={() => setHover(null)}
          >
            <div className="mb-3 flex items-center justify-between">
              <button type="button" onClick={() => setView((v) => addMonths(v, -1))} aria-label="이전 달" className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-paper-deep hover:text-ink">
                <IconChevronLeft size={18} />
              </button>
              <p className="tabular font-serif text-[1.1rem] font-bold text-ink" aria-live="polite">
                {view.year}년 {view.month}월
              </p>
              <button type="button" onClick={() => setView((v) => addMonths(v, 1))} aria-label="다음 달" className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-paper-deep hover:text-ink">
                <IconChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 text-center text-[12.5px] font-semibold">
              {WEEKDAYS.map((w, i) => (
                <span key={w} className={cn("pb-2", i === 0 ? "text-danger" : i === 6 ? "text-blue" : "text-ink-faint")}>
                  {w}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((date, i) => {
                if (!date) return <span key={`empty-${i}`} />;
                const day = Number(date.slice(8));
                const weekday = i % 7;
                const isStart = date === start;
                const isEnd = date === rangeEnd && !!rangeEnd;
                const inRange = !!start && !!rangeEnd && date > start && date < rangeEnd;
                const selected = isStart || isEnd;
                return (
                  <div
                    key={date}
                    className={cn(
                      "relative flex h-10 items-center justify-center",
                      inRange && "bg-blue-mist",
                      isStart && rangeEnd && "bg-gradient-to-r from-transparent from-50% to-blue-mist to-50%",
                      isEnd && start && "bg-gradient-to-l from-transparent from-50% to-blue-mist to-50%",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => choose(date)}
                      onPointerEnter={() => setHover(date)}
                      aria-pressed={selected}
                      aria-label={formatDate(date)}
                      className={cn(
                        "tabular relative flex h-10 w-10 items-center justify-center rounded-full text-[14.5px] transition-[background-color,color,transform] active:scale-90",
                        selected
                          ? "bg-blue font-bold text-paper-light shadow-[0_4px_10px_-4px_rgb(42_92_170/0.7)]"
                          : cn("hover:bg-paper-deep", weekday === 0 ? "text-danger" : weekday === 6 ? "text-blue" : "text-ink"),
                        date === today && !selected && "font-bold ring-1 ring-blue/40",
                      )}
                    >
                      {day}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-dashed border-paper-edge pt-3 text-[13px]">
              <button
                type="button"
                onClick={() => {
                  const t = parseDate(today)!;
                  setView({ year: t.year, month: t.month });
                }}
                className="rounded-lg px-2 py-1 font-semibold text-blue hover:bg-blue-mist"
              >
                오늘로 이동
              </button>
              <span className="text-ink-faint">{start && !end ? "끝나는 날을 눌러 주세요" : "시작하는 날을 눌러 주세요"}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DateSlot({ caption, value, placeholder }: { caption: string; value: string; placeholder?: string }) {
  return (
    <span className="min-w-0">
      <span className="block text-[11.5px] font-semibold text-ink-faint">{caption}</span>
      <span className={cn("tabular block truncate text-[15.5px]", value ? "font-semibold text-ink" : "text-ink-faint/80")}>
        {value ? formatDate(value) : (placeholder ?? "날짜 고르기")}
      </span>
    </span>
  );
}

function initialView(start: string): YearMonth {
  const d = parseDate(start) ?? parseDate(todayString())!;
  return { year: d.year, month: d.month };
}
