"use client";

import { useState } from "react";
import { ArtImage } from "@/components/artwork/art-image";
import { ImageViewer } from "@/components/artwork/image-viewer";
import { IconExpand } from "@/components/ui/icons";
import { tap } from "@/lib/haptics";
import type { ImageView } from "@/lib/types";

/** 전시 표지 포스터. 누르면 전체 화면으로 크게 본다(두 손가락 확대 가능). */
export function CoverImage({ image, title }: { image: ImageView; title: string }) {
  const [open, setOpen] = useState(false);
  const alt = `${title} 대표 사진`;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          tap(6);
          setOpen(true);
        }}
        aria-label={`${alt} 크게 보기`}
        className="group relative block w-full cursor-zoom-in overflow-hidden rounded-[17px]"
      >
        <ArtImage
          image={image}
          alt={alt}
          sizes="(max-width: 900px) 100vw, 880px"
          priority
          fit="contain"
          loader
          className="w-full transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.015]"
          style={{ aspectRatio: `${image.width} / ${image.height}` }}
        />
        <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-ink/70 py-1.5 pl-2.5 pr-3 text-[12.5px] font-semibold text-paper-light backdrop-blur-sm transition-transform duration-300 group-hover:scale-105">
          <IconExpand size={14} strokeWidth={2.2} />
          크게 보기
        </span>
      </button>
      <ImageViewer open={open} images={[image]} startIndex={0} title={title} onClose={() => setOpen(false)} />
    </>
  );
}
