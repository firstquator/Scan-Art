"use client";

import useEmblaCarousel from "embla-carousel-react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ImageView } from "@/lib/types";
import { tap } from "@/lib/haptics";
import { cn } from "@/lib/cn";
import { IconChevronLeft, IconChevronRight, IconExpand, IconImage } from "@/components/ui/icons";
import { ArtImage } from "./art-image";
import { ImageViewer } from "./image-viewer";

interface ArtworkGalleryProps {
  images: ImageView[];
  title: string;
  /** 스크롤 패럴랙스(관리자 미리보기처럼 창이 아닌 틀 안에서 스크롤될 때는 끈다) */
  parallax?: boolean;
}

/**
 * 대표 사진 영역: 한지 액자 위에 사진을 올리고, 여러 장이면 좌우로 넘긴다. 누르면 전체 화면으로 연다.
 */
export function ArtworkGallery({ images, title, parallax = true }: ArtworkGalleryProps) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: false, align: "center", containScroll: false, skipSnaps: false });
  const [selected, setSelected] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // 스크롤할 때 액자가 살짝 느리게 올라가는 패럴랙스
  const { scrollYProgress } = useScroll({ target: frameRef, offset: ["start start", "end start"] });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 70]);
  const parallaxScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 0.96]);

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => {
      setSelected(embla.selectedScrollSnap());
      tap(6);
    };
    embla.on("select", onSelect);
    return () => {
      embla.off("select", onSelect);
    };
  }, [embla]);

  // Embla가 끌기 뒤에 오는 클릭은 스스로 막아 주므로, 여기로 오는 클릭은 진짜 누름이다.
  const openViewer = useCallback(() => setViewerOpen(true), []);

  const closeViewer = useCallback(
    (index: number) => {
      setViewerOpen(false);
      embla?.scrollTo(index, true);
    },
    [embla],
  );

  if (images.length === 0) {
    return (
      <div ref={frameRef} className="deckle mx-auto flex aspect-[4/3] w-full max-w-2xl flex-col items-center justify-center gap-3 rounded-[22px] text-ink-faint">
        <IconImage size={40} strokeWidth={1.3} />
        <p className="text-sm">작품 사진을 준비하고 있어요</p>
      </div>
    );
  }

  const many = images.length > 1;

  return (
    <motion.div ref={frameRef} style={parallax ? { y: parallaxY, scale: parallaxScale } : undefined} className="relative mx-auto w-full max-w-3xl">
      <div className="deckle rounded-[22px] p-2.5 @2xl:p-3.5">
        <div className="relative overflow-hidden rounded-[14px] bg-paper-deep/60 shadow-[inset_0_0_0_1px_rgb(120_100_60/0.08)]">
          <div ref={emblaRef} className="overflow-hidden">
            <div className="flex touch-pan-y">
              {images.map((image, i) => (
                <div
                  key={image.urlLg}
                  className="relative min-w-0 flex-[0_0_100%]"
                  role="group"
                  aria-roledescription="사진"
                  aria-label={`${images.length}장 중 ${i + 1}번째 사진`}
                >
                  <button
                    type="button"
                    onClick={openViewer}
                    className="group block h-[min(68svh,118cqw)] w-full cursor-zoom-in @2xl:h-[min(70svh,640px)]"
                    aria-label={`${image.alt || title} 크게 보기`}
                  >
                    <ArtImage
                      image={image}
                      alt={image.alt || title}
                      fit="contain"
                      sizes="(max-width: 768px) 100vw, 768px"
                      priority={i === 0}
                      className="h-full w-full transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.015]"
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setViewerOpen(true)}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-paper-light/85 text-ink shadow-[var(--shadow-paper)] backdrop-blur-sm transition-transform active:scale-95"
            aria-label="전체 화면으로 보기"
          >
            <IconExpand size={18} />
          </button>

          {many && (
            <>
              <NavArrow side="left" disabled={selected === 0} onClick={() => embla?.scrollPrev()} />
              <NavArrow side="right" disabled={selected === images.length - 1} onClick={() => embla?.scrollNext()} />
              <span className="tabular absolute left-3 top-3 rounded-full bg-ink/70 px-2.5 py-1 text-xs font-semibold text-paper-light backdrop-blur-sm">
                {selected + 1} / {images.length}
              </span>
            </>
          )}
        </div>
      </div>

      {many && (
        <div className="mt-4 flex justify-center gap-2" role="tablist" aria-label="사진 고르기">
          {images.map((image, i) => (
            <button
              key={image.urlLg}
              type="button"
              role="tab"
              aria-selected={i === selected}
              aria-label={`${i + 1}번째 사진`}
              onClick={() => embla?.scrollTo(i)}
              className="flex h-6 items-center px-0.5"
            >
              <span
                className={cn(
                  "block h-2 rounded-full transition-all duration-500 ease-[var(--ease-out-soft)]",
                  i === selected ? "w-7 bg-blue" : "w-2 bg-paper-edge hover:bg-ink-faint",
                )}
              />
            </button>
          ))}
        </div>
      )}

      <ImageViewer open={viewerOpen} images={images} startIndex={selected} title={title} onClose={closeViewer} />
    </motion.div>
  );
}

function NavArrow({ side, disabled, onClick }: { side: "left" | "right"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "이전 사진" : "다음 사진"}
      className={cn(
        "absolute top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-paper-light/90 text-ink shadow-[var(--shadow-paper)] backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-paper-light disabled:pointer-events-none disabled:opacity-0 @2xl:flex",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      {side === "left" ? <IconChevronLeft /> : <IconChevronRight />}
    </button>
  );
}
