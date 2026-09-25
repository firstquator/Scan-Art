"use client";

import { useLayoutEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const PX_PER_MM = 96 / 25.4;

interface FitTextProps {
  children: ReactNode;
  /** 가장 큰 글자 크기(mm) */
  max: number;
  /** 이보다 작게는 줄이지 않는다(mm) */
  min: number;
  /** 우선 이 줄 수 안에 맞춘다 */
  lines?: number;
  /** 가장 작게 줄여도 넘치면 이 줄 수까지 허용하고 다시 맞춘다 */
  fallbackLines?: number;
  /** 첫 줄 수로 맞출 때 max의 이 비율보다 작아져야 하면, 더 줄이지 않고 fallbackLines로 넘어간다(0~1) */
  wrapBelow?: number;
  lineHeight?: number;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

/**
 * 정해진 줄 수 안에 들어가도록 글자 크기를 자동으로 줄이는 글자 상자(인쇄용, mm 단위).
 * 말줄임표(…)로 자르지 않는다. 화면에 그린 뒤 실제 크기를 재서 맞춘다.
 */
export function FitText({ children, max, min, lines = 1, fallbackLines, wrapBelow, lineHeight = 1.2, as: Tag = "p", className, style }: FitTextProps) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fits = (sizeMm: number, allowed: number) => {
      el.style.fontSize = `${sizeMm}mm`;
      el.style.whiteSpace = allowed === 1 ? "nowrap" : "normal";
      const limit = sizeMm * PX_PER_MM * lineHeight * allowed + 1;
      return el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= limit;
    };

    const fit = () => {
      const attempts = fallbackLines ? [lines, fallbackLines] : [lines];
      for (const [i, allowed] of attempts.entries()) {
        // 줄바꿈 전 단계에서는 너무 작아지기 전에 멈추고 다음 줄 수로 넘어간다.
        const floor = i === 0 && fallbackLines && wrapBelow ? Math.max(min, max * wrapBelow) : min;
        let size = max;
        while (size > floor && !fits(size, allowed)) size = Math.max(floor, size * 0.94);
        if (fits(size, allowed)) return;
      }
      // 가장 작게 줄여도 넘치면 마지막 줄 수에서 가장 작은 크기로 둔다(잘라내지 않는다).
      fits(min, fallbackLines ?? lines);
    };

    fit();
    let alive = true;
    // 글꼴이 늦게 불러와지면 폭이 바뀌므로 한 번 더 맞춘다.
    document.fonts?.ready.then(() => alive && fit());
    return () => {
      alive = false;
    };
  }, [children, max, min, lines, fallbackLines, wrapBelow, lineHeight]);

  return (
    <Tag ref={ref} className={cn("min-w-0 max-w-full overflow-hidden [text-wrap:balance]", className)} style={{ lineHeight, fontSize: `${max}mm`, ...style }}>
      {children}
    </Tag>
  );
}
