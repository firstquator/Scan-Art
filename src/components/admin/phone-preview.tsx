"use client";

import type { ReactNode } from "react";

/** 관리자 미리보기용 휴대폰 틀. 안쪽은 따로 스크롤된다. */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[390px]">
      <div className="rounded-[46px] bg-[#1d1c1a] p-[11px] shadow-[0_40px_80px_-30px_rgb(40_30_10/0.55),inset_0_0_0_1.5px_rgb(255_255_255/0.08)]">
        <div className="relative h-[min(780px,calc(100dvh-9rem))] overflow-hidden rounded-[36px] bg-paper">
          <div className="pointer-events-none absolute left-1/2 top-2.5 z-50 h-[26px] w-[104px] -translate-x-1/2 rounded-full bg-[#1d1c1a]" aria-hidden />
          <div
            className="h-full overflow-y-auto overscroll-contain pt-9 no-scrollbar"
            style={{
              backgroundImage: "var(--hanji-noise), var(--hanji-fiber), var(--hanji-fleck)",
              backgroundSize: "220px 220px, 600px 600px, 300px 300px",
            }}
          >
            {children}
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[13px] text-ink-faint">관람객 휴대폰에서 이렇게 보여요</p>
    </div>
  );
}
