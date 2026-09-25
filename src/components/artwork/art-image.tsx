"use client";

import { useState, type CSSProperties } from "react";
import type { ImageView } from "@/lib/types";
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
}

/**
 * 업로드 때 미리 만든 800/1600px WebP 중 화면에 맞는 쪽을 쓴다.
 * 로딩 전에는 흐린 미리보기를 깔아 레이아웃이 밀리지 않게 한다.
 */
export function ArtImage({ image, sizes, alt, className, fit = "cover", priority, style, draggable = false }: ArtImageProps) {
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
    </span>
  );
}
