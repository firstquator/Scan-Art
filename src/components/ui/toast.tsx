"use client";

import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toUserMessage } from "@/lib/errors";
import { cn } from "@/lib/cn";
import { IconAlert, IconCheck, IconInfo, IconX } from "./icons";

type Tone = "success" | "error" | "info";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  tone: Tone;
  message: string;
  action?: ToastAction;
  duration: number;
}

interface ToastApi {
  success: (message: string, opts?: { action?: ToastAction }) => void;
  error: (message: string, opts?: { action?: ToastAction }) => void;
  info: (message: string, opts?: { action?: ToastAction }) => void;
  /** 어떤 오류든 한국어 문구로 바꿔 보여준다. */
  fromError: (error: unknown, opts?: { action?: ToastAction }) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const toneStyle: Record<Tone, { icon: ReactNode; dot: string; label: string }> = {
  success: { icon: <IconCheck size={16} strokeWidth={2.4} />, dot: "bg-success text-paper-light", label: "완료" },
  error: { icon: <IconAlert size={16} strokeWidth={2.2} />, dot: "bg-danger text-paper-light", label: "알림" },
  info: { icon: <IconInfo size={16} strokeWidth={2.2} />, dot: "bg-blue text-paper-light", label: "안내" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((tone: Tone, message: string, action?: ToastAction) => {
    const id = nextId.current++;
    const duration = tone === "error" ? 6500 : 3800;
    setItems((list) => {
      // 같은 문구가 이미 떠 있으면 새로 쌓지 않는다.
      const rest = list.filter((t) => t.message !== message).slice(-2);
      return [...rest, { id, tone, message, action, duration }];
    });
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m, o) => push("success", m, o?.action),
      error: (m, o) => push("error", m, o?.action),
      info: (m, o) => push("info", m, o?.action),
      fromError: (e, o) => push("error", toUserMessage(e), o?.action),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2.5 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] print:hidden"
        aria-live="polite"
        aria-relevant="additions"
      >
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <ToastCard key={item.id} item={item} dismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, dismiss }: { item: ToastItem; dismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const onDismiss = useCallback(() => dismiss(item.id), [dismiss, item.id]);
  const style = toneStyle[item.tone];

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(onDismiss, item.duration);
    return () => window.clearTimeout(timer);
  }, [paused, item.duration, onDismiss]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (Math.abs(info.offset.x) > 90 || Math.abs(info.velocity.x) > 500 || info.offset.y > 50) onDismiss();
  }

  return (
    <motion.div
      layout
      role={item.tone === "error" ? "alert" : "status"}
      initial={{ opacity: 0, y: 28, scale: 0.94, rotate: -0.6 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, y: 12, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={{ left: 0.7, right: 0.7, top: 0.05, bottom: 0.6 }}
      onDragEnd={handleDragEnd}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        "deckle pointer-events-auto flex w-full max-w-[26rem] cursor-grab touch-pan-y items-start gap-3 rounded-2xl py-3.5 pl-3.5 pr-2.5 active:cursor-grabbing",
      )}
    >
      <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", style.dot)}>
        {style.icon}
        <span className="sr-only">{style.label}</span>
      </span>
      <p className="min-w-0 flex-1 pt-[3px] text-[15px] leading-snug text-ink">{item.message}</p>
      {item.action && (
        <button
          type="button"
          onClick={() => {
            item.action?.onClick();
            onDismiss();
          }}
          className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-blue transition-colors hover:bg-blue-mist"
        >
          {item.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="알림 닫기"
        className="shrink-0 rounded-full p-1.5 text-ink-faint transition-colors hover:bg-paper-deep hover:text-ink"
      >
        <IconX size={16} />
      </button>
    </motion.div>
  );
}
