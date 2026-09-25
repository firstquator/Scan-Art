"use client";

import { AnimatePresence, motion } from "motion/react";
import { useActionState, useEffect, useRef, useState } from "react";
import { loginAction } from "@/app/admin/actions";
import { InkButton } from "@/components/ui/ink-button";
import { IconAlert, IconEye, IconEyeOff } from "@/components/ui/icons";
import { inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  const [visible, setVisible] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [seenState, setSeenState] = useState(state);
  const inputRef = useRef<HTMLInputElement>(null);
  const error = state && !state.ok ? state.message : null;

  // 새 결과가 올 때마다(같은 오류가 반복돼도) 한 번씩 흔든다.
  if (state !== seenState) {
    setSeenState(state);
    if (state && !state.ok) setShakeKey((k) => k + 1);
  }

  useEffect(() => {
    if (shakeKey > 0) inputRef.current?.select();
  }, [shakeKey]);

  return (
    <form action={action} className="deckle rounded-[28px] px-6 pb-7 pt-8 sm:px-8">
      <label htmlFor="password" className="text-[15px] font-semibold text-ink">
        관리자 비밀번호
      </label>
      <div key={shakeKey} className={cn("relative mt-2.5", shakeKey > 0 && "animate-shake")}>
        <input
          ref={inputRef}
          id="password"
          name="password"
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          autoFocus
          required
          aria-invalid={!!error || undefined}
          aria-describedby={error ? "login-error" : undefined}
          className={cn(inputClass, "h-14 pr-14 text-lg tracking-wide", error && "border-danger")}
          placeholder="비밀번호를 입력해 주세요"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
          className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-paper-deep hover:text-ink"
        >
          {visible ? <IconEyeOff size={20} /> : <IconEye size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            id="login-error"
            role="alert"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="flex items-start gap-2 overflow-hidden text-[14.5px] font-medium text-danger"
          >
            <IconAlert size={18} className="mt-px shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <InkButton type="submit" size="lg" loading={pending} className="mt-6 w-full">
        들어가기
      </InkButton>

    </form>
  );
}
