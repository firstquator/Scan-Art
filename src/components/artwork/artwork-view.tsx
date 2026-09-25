"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { useMemo, useState, ViewTransition } from "react";
import type { ArtworkLink, ArtworkView as ArtworkData } from "@/lib/types";
import { allSentences, splitParagraphs } from "@/lib/sentences";
import { joinArtists } from "@/lib/format";
import { cn } from "@/lib/cn";
import { tap } from "@/lib/haptics";
import { Reveal } from "@/components/ui/reveal";
import { IconArrowLeft, IconChevronLeft, IconChevronRight, IconSpeaker, IconStop, IconUser } from "@/components/ui/icons";
import { ArtImage } from "./art-image";
import { ArtworkGallery } from "./artwork-gallery";
import { ScrollCue } from "./scroll-cue";
import { AudioPlayer } from "./audio-player";
import { Description, TextSizeControl } from "./description";
import { ShareButton } from "./share-button";
import { useSpeech } from "./use-speech";
import { YouTubeLite } from "./youtube-lite";

export interface ArtworkViewProps {
  artwork: ArtworkData;
  prev: ArtworkLink | null;
  next: ArtworkLink | null;
  index: number;
  total: number;
  exhibitionTitle: string;
  organizer: string;
  shareUrl: string;
  /** 관리자 미리보기: 링크·공유를 끄고 휴대폰 틀 안에서 보여준다. */
  preview?: boolean;
}

export function ArtworkView({ artwork, prev, next, index, total, exhibitionTitle, organizer, shareUrl, preview }: ArtworkViewProps) {
  const paragraphs = useMemo(() => splitParagraphs(artwork.description), [artwork.description]);
  const sentences = useMemo(() => allSentences(paragraphs), [paragraphs]);
  const speech = useSpeech(sentences);
  const showTts = !artwork.audio && artwork.ttsEnabled && sentences.length > 0 && speech.supported;
  const hasListen = !!artwork.audio || showTts;
  const title = artwork.title || "제목 없는 작품";

  return (
    <div className={cn("@container relative", preview ? "min-h-full" : "min-h-dvh")}>
      <TopBar exhibitionTitle={exhibitionTitle} index={index} total={total} shareUrl={shareUrl} title={title} preview={preview} />

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-2 @2xl:px-6">
        <ViewTransition name={`art-${artwork.id}`} share="artwork-morph" default="none">
          <div>
            <ArtworkGallery images={artwork.images} title={title} parallax={!preview} />
          </div>
        </ViewTransition>

        <div className="mx-auto mt-9 max-w-2xl">
          <Reveal>
            <h1 className="font-serif text-[2rem] font-bold leading-[1.25] tracking-[-0.02em] text-ink @2xl:text-[2.5rem]">{title}</h1>
          </Reveal>

          {artwork.artists.length > 0 && (
            <Reveal delay={0.06}>
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="작가">
                {artwork.artists.map((name, i) => (
                  <li
                    key={`${name}-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-paper-edge bg-paper-light/80 py-1.5 pl-2 pr-3.5 text-[15px] font-semibold text-ink shadow-[var(--shadow-inset)]"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-mist text-blue">
                      <IconUser size={14} strokeWidth={2} />
                    </span>
                    {name}
                  </li>
                ))}
              </ul>
            </Reveal>
          )}

          {(artwork.material || artwork.size) && (
            <Reveal delay={0.1}>
              <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-ink-soft">
                {artwork.material && (
                  <div className="flex gap-1.5">
                    <dt className="text-ink-faint">재료</dt>
                    <dd>{artwork.material}</dd>
                  </div>
                )}
                {artwork.size && (
                  <div className="flex gap-1.5">
                    <dt className="text-ink-faint">크기</dt>
                    <dd>{artwork.size}</dd>
                  </div>
                )}
              </dl>
            </Reveal>
          )}

          {hasListen && (
            <Reveal delay={0.12} className="mt-8">
              <section className="deckle rounded-[24px] px-5 py-5 @2xl:px-6" aria-label="듣기">
                {artwork.audio ? (
                  <AudioPlayer src={artwork.audio.url} duration={artwork.audio.duration} onPlay={speech.stop} />
                ) : (
                  <TtsButton speaking={speech.speaking} onStart={speech.start} onStop={speech.stop} />
                )}
              </section>
            </Reveal>
          )}

          {paragraphs.length > 0 && (
            <section className="mt-10" aria-labelledby="story-heading">
              <Reveal>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h2 id="story-heading" className="flex items-center gap-2.5 font-serif text-xl font-bold text-ink">
                    <span className="h-5 w-1 rounded-full bg-blue" aria-hidden />
                    작품 이야기
                  </h2>
                  <TextSizeControl />
                </div>
              </Reveal>
              <Reveal delay={0.05}>
                <Description paragraphs={paragraphs} activeSentence={speech.current} />
              </Reveal>
            </section>
          )}

          {artwork.youtubeUrl && (
            <section className="mt-12" aria-labelledby="video-heading">
              <Reveal>
                <h2 id="video-heading" className="mb-4 flex items-center gap-2.5 font-serif text-xl font-bold text-ink">
                  <span className="h-5 w-1 rounded-full bg-blue" aria-hidden />
                  영상
                </h2>
                <YouTubeLite url={artwork.youtubeUrl} title={title} />
              </Reveal>
            </section>
          )}

          {(prev || next) && (
            <nav className="mt-16" aria-label="다른 작품">
              <Reveal>
                <p className="mb-4 text-center font-hand text-[1.6rem] text-ink-soft">다른 친구들의 작품도 만나 보세요</p>
                <div className="grid grid-cols-2 gap-3">
                  <NeighborCard link={prev} direction="prev" preview={preview} />
                  <NeighborCard link={next} direction="next" preview={preview} />
                </div>
              </Reveal>
            </nav>
          )}

          <footer className="mt-16 flex flex-col items-center gap-3 text-center">
            {!preview && (
              <Link href="/exhibition" transitionTypes={["nav-back"]} className="brush-underline text-[15px] font-semibold text-blue">
                전시 전체 작품 보기
              </Link>
            )}
            <p className="text-sm text-ink-faint">
              {organizer} · {exhibitionTitle}
            </p>
          </footer>
        </div>
        <ScrollCue />
      </main>
    </div>
  );
}

function TopBar({
  exhibitionTitle,
  index,
  total,
  shareUrl,
  title,
  preview,
}: {
  exhibitionTitle: string;
  index: number;
  total: number;
  shareUrl: string;
  title: string;
  preview?: boolean;
}) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));

  return (
    <header
      className={cn(
        // 늘 불투명한 헤더: 스크롤해도 사진·글이 비쳐 겹쳐 보이지 않는다.
        "sticky top-0 z-30 border-b border-paper-edge/80 bg-paper/95 backdrop-blur-md transition-shadow duration-300",
        !preview && "pt-[env(safe-area-inset-top)]",
        scrolled ? "shadow-[0_6px_18px_-10px_rgb(70_52_24/0.35)]" : "shadow-[0_1px_0_rgb(255_255_255/0.6)_inset]",
      )}
    >
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-3 @2xl:px-5">
        {preview ? (
          <span className="flex min-w-0 items-center gap-1.5 px-2 text-sm font-semibold text-ink-soft">
            <IconArrowLeft size={18} />
            <span className="truncate">{exhibitionTitle}</span>
          </span>
        ) : (
          <Link
            href="/exhibition"
            transitionTypes={["nav-back"]}
            className="flex min-w-0 items-center gap-1.5 rounded-full px-2 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-paper-deep/70 hover:text-ink"
          >
            <IconArrowLeft size={18} className="shrink-0" />
            <span className="truncate">{exhibitionTitle}</span>
          </Link>
        )}
        <div className="flex shrink-0 items-center gap-1">
          {total > 0 && index >= 0 && (
            <span className="tabular rounded-full bg-paper-deep/80 px-2.5 py-1 text-xs font-semibold text-ink-soft">
              {index + 1} / {total}
            </span>
          )}
          {!preview && <ShareButton url={shareUrl} title={title} text={`${exhibitionTitle} · ${title}`} />}
        </div>
      </div>
    </header>
  );
}

function TtsButton({ speaking, onStart, onStop }: { speaking: boolean; onStart: () => void; onStop: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        tap();
        if (speaking) onStop();
        else onStart();
      }}
      aria-pressed={speaking}
      className="group flex w-full items-center gap-4 text-left"
    >
      <span
        className={cn(
          "relative flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-full text-paper-light shadow-[0_8px_20px_-8px_rgb(42_92_170/0.7)] transition-[background-color,transform] duration-200 group-active:scale-95",
          speaking ? "bg-blue-deep" : "bg-blue group-hover:bg-blue-deep",
        )}
      >
        {speaking && <span className="absolute inset-0 animate-ping rounded-full bg-blue/20 [animation-duration:2s]" aria-hidden />}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={speaking ? "stop" : "play"}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {speaking ? <IconStop size={22} /> : <IconSpeaker size={26} />}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="min-w-0">
        <span className="block font-hand text-[1.55rem] leading-none text-blue-deep">{speaking ? "읽는 중입니다" : "작품 이야기 읽어주기"}</span>
        <span className="mt-1.5 block text-sm text-ink-soft">{speaking ? "다시 누르면 멈춥니다" : "누르면 설명을 소리 내어 읽어 드립니다"}</span>
      </span>
    </button>
  );
}

function NeighborCard({ link, direction, preview }: { link: ArtworkLink | null; direction: "prev" | "next"; preview?: boolean }) {
  if (!link) return <div aria-hidden />;
  const isNext = direction === "next";
  const content = (
    <>
      <span className="relative block aspect-[4/3] overflow-hidden rounded-[12px] bg-paper-deep">
        {link.cover && (
          <ArtImage
            image={link.cover}
            alt=""
            sizes="(max-width: 640px) 50vw, 320px"
            className="h-full w-full transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-105"
          />
        )}
      </span>
      <span className={cn("mt-3 flex items-center gap-1 text-xs font-semibold text-blue", isNext && "justify-end")}>
        {!isNext && <IconChevronLeft size={14} strokeWidth={2.4} />}
        {isNext ? "다음 작품" : "이전 작품"}
        {isNext && <IconChevronRight size={14} strokeWidth={2.4} />}
      </span>
      <span className={cn("mt-1 block truncate font-serif text-[15px] font-bold text-ink", isNext && "text-right")}>{link.title}</span>
      <span className={cn("block truncate text-xs text-ink-faint", isNext && "text-right")}>{joinArtists(link.artists)}</span>
    </>
  );
  const className =
    "group deckle block rounded-[18px] p-2.5 pb-3 transition-transform duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-1 active:scale-[0.98]";

  if (preview) return <div className={className}>{content}</div>;
  return (
    <Link href={`/a/${link.id}`} transitionTypes={[isNext ? "nav-forward" : "nav-back"]} className={className}>
      {content}
    </Link>
  );
}
