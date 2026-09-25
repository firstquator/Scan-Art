"use client";

import { AnimatePresence, motion } from "motion/react";
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-2xl border border-paper-edge bg-paper-light/90 px-4 text-[16px] text-ink shadow-[var(--shadow-inset)] " +
  "placeholder:text-ink-faint/80 transition-[border-color,box-shadow,background-color] duration-200 " +
  "hover:border-[#cfc2a6] focus:border-blue focus:bg-white focus:shadow-[0_0_0_4px_rgb(42_92_170/0.14)] focus:outline-none";

interface FieldShellProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  htmlFor: string;
  children: ReactNode;
  className?: string;
  counter?: ReactNode;
}

export function FieldShell({ label, hint, error, optional, htmlFor, children, className, counter }: FieldShellProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[15px] font-semibold text-ink">
          {label}
          {optional && <span className="ml-1.5 text-[13px] font-normal text-ink-faint">선택</span>}
        </label>
        {counter}
      </div>
      {children}
      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-sm font-medium text-danger"
            role="alert"
          >
            {error}
          </motion.p>
        ) : hint ? (
          <motion.p key="hint" initial={false} className="text-[13px] leading-relaxed text-ink-faint">
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  wrapperClassName?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, optional, className, wrapperClassName, id, maxLength, value, ...props },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const length = typeof value === "string" ? value.length : 0;
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      htmlFor={fieldId}
      className={wrapperClassName}
      counter={maxLength && length > maxLength * 0.8 ? <Counter value={length} max={maxLength} /> : null}
    >
      <input
        ref={ref}
        id={fieldId}
        value={value}
        maxLength={maxLength}
        aria-invalid={!!error || undefined}
        className={cn(control, "h-12", error && "!border-danger focus:!border-danger", className)}
        {...props}
      />
    </FieldShell>
  );
});

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  wrapperClassName?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hint, error, optional, className, wrapperClassName, id, maxLength, value, ...props },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const length = typeof value === "string" ? value.length : 0;
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      htmlFor={fieldId}
      className={wrapperClassName}
      counter={maxLength ? <Counter value={length} max={maxLength} /> : null}
    >
      <textarea
        ref={ref}
        id={fieldId}
        value={value}
        maxLength={maxLength}
        aria-invalid={!!error || undefined}
        className={cn(control, "min-h-36 resize-y py-3.5 leading-relaxed [field-sizing:content]", error && "border-danger", className)}
        {...props}
      />
    </FieldShell>
  );
});

function Counter({ value, max }: { value: number; max: number }) {
  return (
    <span className={cn("tabular text-xs", value >= max ? "text-danger" : "text-ink-faint")}>
      {value.toLocaleString("ko-KR")} / {max.toLocaleString("ko-KR")}
    </span>
  );
}

export const inputClass = control;
