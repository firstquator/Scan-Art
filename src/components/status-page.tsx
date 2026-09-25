import Link from "next/link";
import type { ReactNode } from "react";
import { nanumPen } from "@/lib/fonts";

/** 준비 중·없음·오류 화면 공통 틀 (한지 카드) */
export function StatusPage({
  mark,
  title,
  children,
  action,
}: {
  mark: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <main className={`${nanumPen.variable} flex min-h-dvh items-center justify-center px-5 py-16`}>
      <div className="deckle w-full max-w-md animate-float-in rounded-[28px] px-7 py-10 text-center sm:px-10">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center">{mark}</div>
        <h1 className="font-serif text-[1.65rem] font-bold leading-snug tracking-[-0.01em] text-ink">{title}</h1>
        {children && <div className="mt-3 text-[15.5px] leading-relaxed text-ink-soft">{children}</div>}
        <div className="mt-8 flex flex-col items-center gap-3">
          {action ?? (
            <Link
              href="/exhibition"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue px-6 font-semibold text-paper-light shadow-[0_6px_16px_-6px_rgb(42_92_170/0.55)] transition-[background-color,transform] hover:bg-blue-deep active:scale-[0.97]"
            >
              전시 작품 둘러보기
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

/** 붓으로 그린 듯한 원 + 가운데 기호 */
export function InkMark({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "ink" }) {
  const color = tone === "blue" ? "var(--color-blue)" : "var(--color-ink-soft)";
  return (
    <span className="relative flex h-20 w-20 items-center justify-center">
      <svg viewBox="0 0 80 80" className="absolute inset-0" aria-hidden>
        <path
          d="M40 6c19 0 34 14.5 34 33.5S59.8 74 40.5 74 6 59 6 40 21 6 40 6z"
          fill="none"
          stroke={color}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeDasharray="196 30"
          opacity="0.85"
        />
      </svg>
      <span style={{ color }} className="relative">
        {children}
      </span>
    </span>
  );
}
