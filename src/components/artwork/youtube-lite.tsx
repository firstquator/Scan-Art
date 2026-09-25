"use client";

import { useState } from "react";
import { IconPlay } from "@/components/ui/icons";
import { parseYouTubeId, youTubeEmbedUrl, youTubeThumbnail } from "@/lib/youtube";

/** 처음에는 썸네일만 보여주고, 누르면 그때 유튜브 플레이어를 불러온다(첫 화면이 가볍다). */
export function YouTubeLite({ url, title }: { url: string; title: string }) {
  const [active, setActive] = useState(false);
  const id = parseYouTubeId(url);
  if (!id) return null;

  return (
    <div className="deckle rounded-[20px] p-2">
      <div className="relative aspect-video overflow-hidden rounded-[13px] bg-ink">
        {active ? (
          <iframe
            src={youTubeEmbedUrl(id)}
            title={`${title} 영상`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button type="button" onClick={() => setActive(true)} className="group absolute inset-0" aria-label={`${title} 영상 재생`}>
            <img
              src={youTubeThumbnail(id)}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover opacity-90 transition-[transform,opacity] duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.03] group-hover:opacity-100"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent" />
            <span className="absolute left-1/2 top-1/2 flex h-[68px] w-[68px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-paper-light/95 text-blue shadow-[0_10px_30px_-8px_rgb(0_0_0/0.5)] transition-transform duration-300 group-hover:scale-110 group-active:scale-95">
              <IconPlay size={28} className="translate-x-[2px]" />
            </span>
            <span className="absolute bottom-3 left-4 text-sm font-semibold text-paper-light drop-shadow">영상 보기</span>
          </button>
        )}
      </div>
    </div>
  );
}
