"use client";

import { useState, type CSSProperties } from "react";
import type { ImageView } from "@/lib/types";
import { InkLoader } from "@/components/ui/ink-loader";
import { cn } from "@/lib/cn";

interface ArtImageProps {
  image: ImageView;
  /** 화면에서 차지하는 너비(srcset 선택용) */
  sizes: string;
  alt: string;
  className?: string;
  fit?: "cover" | "contain";
  priority?: boolean;
  style?: CSSProperties;
  draggable?: boolean;
  /** 사진을 받는 동안 한지 결 반짝임 + 먹 고리 로딩을 덮어 보여 준다. */
  loader?: boolean;
}

/**
 * 업로드 때 미리 만든 800/1600px WebP 중 화면에 맞는 쪽을 쓴다.
 * 로딩 전에는 흐린 미리보기를 깔아 레이아웃이 밀리지 않게 한다.
 */
export function ArtImage({ image, sizes, alt, className, fit = "cover", priority, style, draggable = false, loader = false }: ArtImageProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <span
      className={cn("relative block overflow-hidden", className)}
      style={{
        backgroundImage: image.blurData ? `url(${image.blurData})` : undefined,
        backgroundSize: fit,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        ...style,
      }}
    >
      <img
        src={image.urlLg}
        srcSet={`${image.urlSm} 800w, ${image.urlLg} 1600w`}
        sizes={sizes}
        width={image.width}
        height={image.height}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        draggable={draggable}
        ref={(el) => {
          if (el?.complete && el.naturalWidth > 0) setLoaded(true);
        }}
        onLoad={() => setLoaded(true)}
        className={cn(
          "h-full w-full transition-[opacity,filter,transform] duration-700 ease-[var(--ease-out-soft)]",
          fit === "cover" ? "object-cover" : "object-contain",
          loaded ? "opacity-100 blur-0" : "opacity-0 blur-md",
        )}
      />
      {loader && (
        <span
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-500 ease-[var(--ease-out-soft)]",
            loaded ? "opacity-0" : "opacity-100",
          )}
          aria-hidden
        >
          <span className="paper-skeleton absolute inset-0 !bg-paper-deep/55" />
          <span className="relative flex items-center justify-center rounded-full bg-paper-light/85 p-2 shadow-[var(--shadow-paper)] backdrop-blur-sm">
            <InkLoader size={38} />
          </span>
        </span>
      )}
    </span>
  );
}
