"use client";

import { motion } from "motion/react";
import { tap } from "@/lib/haptics";
import { cn } from "@/lib/cn";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** 라벨을 화면에 보이지 않게(스크린리더용으로만) */
  hideLabel?: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function Switch({ checked, onChange, label, hideLabel, disabled, size = "md", className }: SwitchProps) {
  const w = size === "sm" ? 40 : 50;
  const h = size === "sm" ? 24 : 30;
  const knob = h - 6;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        tap();
        onChange(!checked);
      }}
      className={cn("group inline-flex items-center gap-2.5 disabled:opacity-50", className)}
    >
      <span
        className={cn(
          "relative inline-flex shrink-0 rounded-full p-[3px] transition-colors duration-300",
          checked ? "bg-blue" : "bg-paper-edge",
        )}
        style={{ width: w, height: h }}
      >
        <motion.span
          className="block rounded-full bg-paper-light shadow-[0_1px_3px_rgb(0_0_0/0.2)]"
          style={{ width: knob, height: knob }}
          animate={{ x: checked ? w - knob - 6 : 0 }}
          transition={{ type: "spring", stiffness: 600, damping: 34 }}
        />
      </span>
      <span className={cn("text-[15px] font-medium text-ink", hideLabel && "sr-only")}>{label}</span>
    </button>
  );
}
