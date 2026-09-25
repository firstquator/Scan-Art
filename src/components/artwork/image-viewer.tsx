"use client";

import { AnimatePresence, animate, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import type { ImageView } from "@/lib/types";
import { tap } from "@/lib/haptics";
import { IconChevronLeft, IconChevronRight, IconX } from "@/components/ui/icons";

interface ImageViewerProps {
  open: boolean;
  images: ImageView[];
  startIndex: number;
  title: string;
  onClose: (index: number) => void;
}

const MAX_SCALE = 4;

/**
 * 전체 화면 사진 보기.
 * - 좌우로 밀어 다음/이전 사진, 아래로 쓸어내려 닫기
 * - 두 손가락으로 확대, 두 번 톡 치면 2.5배 확대/원래대로
 */
export function ImageViewer({ open, images, startIndex, title, onClose }: ImageViewerProps) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && <ViewerBody key="viewer" images={images} startIndex={startIndex} title={title} onClose={onClose} />}
    </AnimatePresence>,
    document.body,
  );
}

function ViewerBody({ images, startIndex, title, onClose }: Omit<ImageViewerProps, "open">) {
  const [index, setIndex] = useState(startIndex);
  const [direction, setDirection] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const dragY = useMotionValue(0);
  const backdropOpacity = useTransform(dragY, [0, 260], [1, 0.25]);
  const imageScale = useTransform(dragY, [0, 260], [1, 0.86]);

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => {
        const next = Math.min(images.length - 1, Math.max(0, i + delta));
        if (next !== i) {
          setDirection(delta);
          tap(6);
        }
        return next;
      });
    },
    [images.length],
  );

  const close = useCallback(() => onClose(index), [onClose, index]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [close, go]);

  function onDragEnd(_: unknown, info: PanInfo) {
    const { offset, velocity } = info;
    if (Math.abs(offset.y) > Math.abs(offset.x)) {
      if (offset.y > 120 || velocity.y > 700) close();
      else animate(dragY, 0, { type: "spring", stiffness: 400, damping: 34 });
      return;
    }
    if (offset.x < -70 || velocity.x < -500) go(1);
    else if (offset.x > 70 || velocity.x > 500) go(-1);
  }

  const image = images[index];

  return (
    <motion.div
      className="fixed inset-0 z-[95] flex flex-col text-paper-light"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} 사진 크게 보기`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div className="absolute inset-0 bg-[#171512]" style={{ opacity: backdropOpacity }} aria-hidden />

      <div className="relative z-10 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <span className="tabular rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold backdrop-blur">
          {index + 1} / {images.length}
        </span>
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          aria-label="닫기"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur transition-colors hover:bg-white/20"
        >
          <IconX size={22} />
        </button>
      </div>

      <div className="relative z-0 flex-1 overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={index}
            custom={direction}
            variants={{
              enter: (d: number) => ({ x: d > 0 ? "60%" : d < 0 ? "-60%" : 0, opacity: 0, scale: d === 0 ? 0.92 : 1 }),
              center: { x: 0, opacity: 1, scale: 1 },
              exit: (d: number) => ({ x: d > 0 ? "-40%" : "40%", opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <motion.div
              className="flex h-full w-full items-center justify-center p-3 sm:p-10"
              drag={!zoomed}
              dragDirectionLock
              dragSnapToOrigin
              dragElastic={0.55}
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              onDragEnd={onDragEnd}
              style={{ y: dragY, scale: imageScale }}
            >
              <ZoomableImage image={image} alt={image.alt || title} onZoomChange={setZoomed} />
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={index === 0}
              aria-label="이전 사진"
              className="absolute left-4 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 backdrop-blur transition hover:bg-white/20 disabled:opacity-0 sm:flex"
            >
              <IconChevronLeft />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={index === images.length - 1}
              aria-label="다음 사진"
              className="absolute right-4 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 backdrop-blur transition hover:bg-white/20 disabled:opacity-0 sm:flex"
            >
              <IconChevronRight />
            </button>
          </>
        )}
      </div>

      <p className="relative z-10 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 text-center text-sm text-white/70">
        {zoomed ? "두 번 톡 치면 원래 크기로 돌아갑니다" : images.length > 1 ? "옆으로 밀어 넘기고, 아래로 쓸어내려 닫습니다" : "아래로 쓸어내려 닫습니다"}
      </p>
    </motion.div>
  );
}

/** 두 손가락 확대·끌어서 이동·두 번 톡 확대를 지원하는 사진 */
function ZoomableImage({ image, alt, onZoomChange }: { image: ImageView; alt: string; onZoomChange: (zoomed: boolean) => void }) {
  const scale = useMotionValue(1);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const pan = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const lastTap = useRef(0);

  const setZoom = useCallback(
    (value: number) => {
      const next = Math.min(MAX_SCALE, Math.max(1, value));
      animate(scale, next, { type: "spring", stiffness: 380, damping: 32 });
      if (next === 1) {
        animate(x, 0, { type: "spring", stiffness: 380, damping: 32 });
        animate(y, 0, { type: "spring", stiffness: 380, damping: 32 });
      }
      onZoomChange(next > 1.01);
    },
    [scale, x, y, onZoomChange],
  );

  function distance() {
    const [a, b] = Array.from(pointers.current.values());
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      pinch.current = { dist: distance(), scale: scale.get() };
      e.stopPropagation();
    } else if (scale.get() > 1.01) {
      pan.current = { x: e.clientX, y: e.clientY, ox: x.get(), oy: y.get() };
      e.stopPropagation();
    }

    const now = Date.now();
    if (pointers.current.size === 1 && now - lastTap.current < 280) {
      setZoom(scale.get() > 1.01 ? 1 : 2.5);
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      e.stopPropagation();
      const next = Math.min(MAX_SCALE, Math.max(0.9, pinch.current.scale * (distance() / pinch.current.dist)));
      scale.set(next);
      onZoomChange(next > 1.01);
    } else if (pan.current && scale.get() > 1.01) {
      e.stopPropagation();
      x.set(pan.current.ox + (e.clientX - pan.current.x));
      y.set(pan.current.oy + (e.clientY - pan.current.y));
    }
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2 && pinch.current) {
      pinch.current = null;
      if (scale.get() < 1.05) setZoom(1);
    }
    if (pointers.current.size === 0) pan.current = null;
  }

  return (
    <motion.div
      className="relative flex h-full w-full touch-none items-center justify-center"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={(e) => setZoom(scale.get() * (e.deltaY < 0 ? 1.2 : 0.83))}
    >
      <motion.img
        src={image.urlLg}
        alt={alt}
        width={image.width}
        height={image.height}
        draggable={false}
        style={{ scale, x, y }}
        className="max-h-full max-w-full select-none rounded-md object-contain shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)]"
      />
    </motion.div>
  );
}
