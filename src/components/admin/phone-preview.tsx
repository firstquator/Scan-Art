"use client";

import type { ReactNode } from "react";

/** 관리자 미리보기용 휴대폰 틀. 안쪽은 따로 스크롤된다. */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[390px]">
      <div className="rounded-[46px] bg-[#1d1c1a] p-[11px] shadow-[0_40px_80px_-30px_rgb(40_30_10/0.55),inset_0_0_0_1.5px_rgb(255_255_255/0.08)]">
        <div className="relative h-[min(780px,calc(100dvh-9rem))] overflow-hidden rounded-[36px] bg-paper">
          {/* 상태 표시줄 자리(불투명). 스크롤되는 내용이 이 위로 비치지 않는다. */}
          <div className="absolute inset-x-0 top-0 z-40 h-10 bg-paper" style={{ backgroundImage: "var(--hanji)", backgroundSize: "512px 512px" }} aria-hidden>
            <div className="absolute left-1/2 top-2.5 h-[26px] w-[104px] -translate-x-1/2 rounded-full bg-[#1d1c1a]" />
          </div>
          <div
            data-scroll-root
            className="absolute inset-x-0 bottom-0 top-10 overflow-y-auto overscroll-contain no-scrollbar"
            style={{
              backgroundImage: "var(--hanji)",
              backgroundSize: "512px 512px",
            }}
          >
            {children}
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[13px] text-ink-faint">관람객 휴대폰에서는 이렇게 보입니다</p>
    </div>
  );
}
