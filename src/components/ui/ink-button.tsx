"use client";

import { forwardRef, useRef, type ButtonHTMLAttributes, type PointerEvent, type ReactNode } from "react";
import { tap } from "@/lib/haptics";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "danger-soft" | "paper";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-blue text-paper-light shadow-[0_1px_0_rgb(255_255_255/0.2)_inset,0_6px_16px_-6px_rgb(42_92_170/0.55)] hover:bg-blue-deep",
  secondary: "bg-blue-mist text-blue-deep hover:bg-[#cfdcef]",
  outline: "border border-blue/35 bg-paper-light text-blue-deep hover:border-blue/60 hover:bg-blue-mist/50",
  ghost: "bg-transparent text-ink-soft hover:bg-paper-deep/70 hover:text-ink",
  "danger-soft": "border border-danger/20 bg-danger-mist/70 text-danger hover:border-danger/40 hover:bg-danger-mist",
  danger: "bg-danger text-paper-light hover:bg-[#9a3826] shadow-[0_6px_16px_-6px_rgb(180_67_47/0.5)]",
  paper: "hanji-surface text-ink paper-shadow hover:shadow-[var(--shadow-lift)] border border-paper-edge/70",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5 rounded-xl",
  md: "h-11 px-5 text-[15px] gap-2 rounded-2xl",
  lg: "h-14 px-7 text-base gap-2.5 rounded-2xl",
  icon: "h-11 w-11 rounded-full",
};

export interface InkButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

/** 누른 자리에서 먹물이 번지는 버튼. 누르면 살짝 눌리고, 안드로이드에서는 짧게 진동한다. */
export const InkButton = forwardRef<HTMLButtonElement, InkButtonProps>(function InkButton(
  { variant = "primary", size = "md", loading, icon, className, children, onPointerDown, disabled, ...props },
  ref,
) {
  const hostRef = useRef<HTMLSpanElement>(null);

  function handlePointerDown(e: PointerEvent<HTMLButtonElement>) {
    onPointerDown?.(e);
    if (disabled || loading) return;
    tap();
    const host = hostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const drop = document.createElement("span");
    const diameter = Math.max(rect.width, rect.height) * 2.4;
    drop.className = "ink-drop";
    drop.style.width = drop.style.height = `${diameter}px`;
    drop.style.left = `${e.clientX - rect.left}px`;
    drop.style.top = `${e.clientY - rect.top}px`;
    host.appendChild(drop);
    drop.addEventListener("animationend", () => drop.remove(), { once: true });
  }

  return (
    <button
      ref={ref}
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onPointerDown={handlePointerDown}
      className={cn(
        "relative inline-flex select-none items-center justify-center overflow-hidden font-semibold tracking-[-0.01em]",
        "transition-[transform,background-color,box-shadow,color] duration-200 ease-[var(--ease-out-soft)]",
        "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      <span ref={hostRef} className="pointer-events-none absolute inset-0" aria-hidden />
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
});

/** 링크를 버튼처럼 보이게 할 때 쓰는 클래스(링크 안에 버튼을 넣지 않기 위해). */
export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "relative inline-flex select-none items-center justify-center overflow-hidden font-semibold tracking-[-0.01em]",
    "transition-[transform,background-color,box-shadow,color] duration-200 ease-[var(--ease-out-soft)] active:scale-[0.97]",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("h-[1.1em] w-[1.1em] animate-spin", className)} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 00-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
