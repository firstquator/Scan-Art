"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { ViewTransition } from "react";
import type { ArtworkLink } from "@/lib/types";
import { joinArtists } from "@/lib/format";
import { TiltCard } from "@/components/ui/tilt-card";
import { IconImage } from "@/components/ui/icons";
import { ArtImage } from "@/components/artwork/art-image";

/** 전시 표지의 작품 목록: 두 줄(모바일)~세 줄 격자, 들어올 때 차례로 떠오른다. */
export function ArtworkGrid({ artworks }: { artworks: ArtworkLink[] }) {
  const reduce = useReducedMotion();

  if (artworks.length === 0) {
    return (
      <div className="deckle mx-auto max-w-md rounded-[24px] px-6 py-12 text-center">
        <p className="font-hand text-3xl text-blue-deep">곧 공개됩니다!</p>
        <p className="mt-2 text-[15px] text-ink-soft">작품들을 전시장에 걸고 있습니다.</p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-x-3.5 gap-y-6 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-9">
      {artworks.map((art, i) => (
        <motion.li
          key={art.id}
          initial={reduce ? false : { opacity: 0, y: 26, rotate: i % 2 ? 0.8 : -0.8 }}
          whileInView={{ opacity: 1, y: 0, rotate: 0 }}
          viewport={{ once: true, margin: "0px 0px -6% 0px" }}
          transition={{ duration: 0.75, delay: (i % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            href={`/a/${art.id}`}
            transitionTypes={["nav-forward"]}
            aria-label={`${art.title}, ${joinArtists(art.artists)}`}
            className="block rounded-[20px]"
          >
            <TiltCard className="rounded-[20px]">
              <article className="deckle rounded-[20px] p-2 pb-3.5 sm:p-2.5 sm:pb-4">
                <ViewTransition name={`art-${art.id}`} share="artwork-morph" default="none">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[13px] bg-paper-deep">
                    {art.cover ? (
                      <ArtImage
                        image={art.cover}
                        alt=""
                        sizes="(max-width: 640px) 48vw, 300px"
                        priority={i < 4}
                        className="h-full w-full transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-ink-faint">
                        <IconImage size={32} strokeWidth={1.3} />
                      </span>
                    )}
                    <span className="tabular absolute left-2 top-2 rounded-full bg-paper-light/85 px-2 py-0.5 text-[11px] font-bold text-ink-soft backdrop-blur-sm">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                </ViewTransition>
                <div className="px-1.5 pt-3">
                  <h3 className="line-clamp-2 font-serif text-[16px] font-bold leading-snug text-ink sm:text-[17px]">{art.title}</h3>
                  <p className="mt-1 truncate text-[13px] text-ink-soft">{joinArtists(art.artists)}</p>
                </div>
              </article>
            </TiltCard>
          </Link>
        </motion.li>
      ))}
    </ul>
  );
}
