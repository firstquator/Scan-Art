"use client";

import { animate, AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { tap } from "@/lib/haptics";

/** 스크롤되는 상자: 관리자 미리보기(휴대폰 틀)는 data-scroll-root, 실제 화면은 창 전체 */
function findScroller(el: HTMLElement | null): HTMLElement | Window {
  return (el?.closest("[data-scroll-root]") as HTMLElement | null) ?? window;
}

function metrics(scroller: HTMLElement | Window) {
  if (scroller instanceof Window) {
    const doc = document.documentElement;
    return { top: window.scrollY, height: window.innerHeight, full: doc.scrollHeight };
  }
  return { top: scroller.scrollTop, height: scroller.clientHeight, full: scroller.scrollHeight };
}

/**
 * 첫 화면 아래쪽에 떠 있는 "아래로" 안내. 조금이라도 내리면 사라지고,
 * 아래에 더 볼 내용이 없으면 처음부터 나타나지 않는다. 누르면 한 화면쯤 내려 준다.
 */
export function ScrollCue({ label = "아래로 내려 작품 이야기 보기" }: { label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const scroller = findScroller(ref.current);
    const update = () => {
      const { top, height, full } = metrics(scroller);
      setVisible(top < 40 && full - height > 120);
    };
    update();
    const t = window.setTimeout(update, 600); // 사진·글꼴이 늦게 불러와져 높이가 바뀌는 경우
    scroller.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.clearTimeout(t);
      scroller.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  function go() {
    tap(6);
    const scroller = findScroller(ref.current);
    const { top, height } = metrics(scroller);
    const target = top + height * 0.7;
    const scrollTo = (y: number) => scroller.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
    if (reduce) {
      scrollTo(target);
      return;
    }
    // 브라우저 기본 부드러운 스크롤은 페이지가 막 뜬 직후에 취소되는 경우가 있어 직접 움직인다.
    const controls = animate(top, target, { duration: 0.7, ease: [0.22, 1, 0.36, 1], onUpdate: scrollTo });
    const stop = () => controls.stop();
    window.addEventListener("wheel", stop, { once: true, passive: true });
    window.addEventListener("touchstart", stop, { once: true, passive: true });
  }

  return (
    // 흐름에서 자리를 차지하지 않고, 화면(또는 미리보기 틀) 아래쪽에 붙어 있는다.
    <div ref={ref} className="pointer-events-none sticky bottom-5 z-20 h-0" aria-hidden={!visible}>
      <AnimatePresence>
        {visible && (
          <motion.div
            className="absolute inset-x-0 bottom-0 flex justify-center"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10, transition: { duration: 0.2 } }}
            transition={{ delay: 0.8, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              type="button"
              onClick={go}
              className="pointer-events-auto flex items-center gap-2 rounded-full border border-paper-edge bg-paper-light/95 py-2 pl-4 pr-3 text-[13.5px] font-semibold text-blue-deep shadow-[0_10px_24px_-10px_rgb(70_52_24/0.45)] backdrop-blur-md transition-transform active:scale-95"
            >
              {label}
              <motion.span
                className="flex h-6 w-6 items-center justify-center rounded-full bg-blue text-paper-light"
                animate={reduce ? undefined : { y: [0, 4, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </motion.span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
