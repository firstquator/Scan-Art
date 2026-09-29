import type { Metadata } from "next";
import { Fragment } from "react";
import { ArtworkGrid } from "@/components/home/artwork-grid";
import { ArtImage } from "@/components/artwork/art-image";
import { PageTransition } from "@/components/page-transition";
import { Reveal } from "@/components/ui/reveal";
import { loadPublishedArtworks, loadSettings } from "@/lib/data/public";
import { nanumPen } from "@/lib/fonts";
import { formatPeriod } from "@/lib/format";
import { exhibitionUrl } from "@/lib/site";
import { cn } from "@/lib/cn";

// 요청마다 그리되, 데이터는 lib/data/public.ts 캐시에서 읽는다(관리자가 바꾸면 즉시 반영).
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadSettings();
  return {
    title: settings.title,
    description: settings.subtitle || `${settings.organizer} 학생 작품 전시`,
    openGraph: {
      type: "website",
      title: settings.title,
      description: settings.subtitle || `${settings.organizer} 학생 작품 전시`,
      url: exhibitionUrl(),
      siteName: settings.title,
      locale: "ko_KR",
    },
  };
}

export default async function HomePage() {
  const [settings, artworks] = await Promise.all([loadSettings(), loadPublishedArtworks()]);
  const period = formatPeriod(settings.startDate, settings.endDate);
  const intro = introParagraphs(settings.intro);
  // 짧은 첫 문단은 글머리 문장으로 크게 보여 준다.
  const lead = intro.length > 1 && intro[0].join(" ").length <= 70 ? intro[0] : null;
  const body = lead ? intro.slice(1) : intro;
  const facts = [
    period ? { label: "기간", value: period, tabular: true } : null,
    settings.venue ? { label: "장소", value: settings.venue, tabular: false } : null,
    artworks.length > 0 ? { label: "작품", value: `${artworks.length}점`, tabular: true } : null,
  ].filter((f) => f !== null);

  return (
    <PageTransition>
      <div className={nanumPen.variable}>
        <header className="relative isolate overflow-hidden pb-9 pt-[max(3.25rem,calc(env(safe-area-inset-top)+2.25rem))] sm:pb-12 sm:pt-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-5">
            <Reveal>
              <p className="flex items-center gap-2.5 font-hand text-[1.6rem] leading-none text-blue-deep">
                <Seal />
                {settings.organizer}
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-4 font-serif text-[2.5rem] font-bold leading-[1.12] tracking-[-0.035em] text-ink sm:text-[3.9rem]">
                {settings.title}
              </h1>
            </Reveal>
            {settings.subtitle && (
              <Reveal delay={0.14}>
                <p className="mt-3 max-w-xl text-[1.1rem] leading-snug text-ink-soft sm:text-[1.3rem]">{settings.subtitle}</p>
              </Reveal>
            )}
            {facts.length > 0 && (
              <Reveal delay={0.2}>
                <dl className="mt-6 inline-flex max-w-full flex-wrap gap-px overflow-hidden rounded-[18px] border border-paper-edge bg-paper-edge shadow-[var(--shadow-paper)]">
                  {facts.map((f) => (
                    <div key={f.label} className="flex min-w-0 grow flex-col justify-center bg-paper-light px-4 py-2.5 sm:grow-0 sm:px-5">
                      <dt className="text-[11.5px] font-bold tracking-[0.08em] text-blue">{f.label}</dt>
                      <dd className={cn("mt-0.5 text-[14.5px] font-semibold leading-tight text-ink sm:text-[15px]", f.tabular && "tabular")}>{f.value}</dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
            )}
          </div>
          <BrushStroke />
        </header>

        <main className="mx-auto max-w-4xl px-4 pb-20 sm:px-5">
          {(settings.cover || intro.length > 0) && (
            <section className="mb-16" aria-label="전시 소개">
              {settings.cover && (
                <Reveal>
                  {/* 표지는 글씨가 든 포스터일 수 있어 자르지 않고 원래 비율 그대로 건다. */}
                  <figure className="deckle rounded-[24px] p-2 sm:p-2.5">
                    <ArtImage
                      image={settings.cover}
                      alt={`${settings.title} 대표 사진`}
                      sizes="(max-width: 900px) 100vw, 880px"
                      priority
                      fit="contain"
                      className="w-full rounded-[17px]"
                      style={{ aspectRatio: `${settings.cover.width} / ${settings.cover.height}` }}
                    />
                  </figure>
                </Reveal>
              )}

              {intro.length > 0 && (
                <Reveal delay={settings.cover ? 0.08 : 0}>
                  <article className={cn("deckle relative rounded-[24px] px-6 pb-7 pt-7 sm:px-12 sm:pb-10 sm:pt-10", settings.cover && "mt-4 sm:mt-5")}>
                    <p className="flex items-center gap-3 font-hand text-[1.55rem] leading-none text-blue-deep">
                      여는 글
                      <span className="h-px w-10 bg-blue/35" aria-hidden />
                    </p>

                    {lead && (
                      <p className="mt-5 font-serif text-[1.4rem] font-bold leading-[1.5] tracking-[-0.02em] text-ink [text-wrap:balance] sm:text-[1.75rem] sm:leading-[1.45]">
                        {lines(lead)}
                      </p>
                    )}

                    {body.length > 0 && (
                      <div className={cn("mt-5 space-y-2.5 text-[16px] leading-[1.62] text-ink/85 [text-wrap:pretty] sm:text-[17px]", lead && "border-l-2 border-blue-mist pl-4 sm:pl-5")}>
                        {body.map((p, i) => (
                          <p key={i}>{lines(p)}</p>
                        ))}
                      </div>
                    )}

                    <p className="mt-7 flex items-center justify-end gap-2 text-[14px] font-semibold text-ink-soft">
                      <span className="h-px w-6 bg-ink-faint/50" aria-hidden />
                      {settings.organizer}
                      <Seal size={22} />
                    </p>
                  </article>
                </Reveal>
              )}
            </section>
          )}

          <section aria-labelledby="works-heading">
            <Reveal>
              <div className="mb-7 flex items-end justify-between gap-4">
                <h2 id="works-heading" className="font-serif text-[1.7rem] font-bold tracking-[-0.02em] text-ink">
                  전시 작품
                  <span className="tabular ml-2 align-middle text-base font-semibold text-blue">{artworks.length}</span>
                </h2>
                <p className="hidden font-hand text-2xl text-ink-soft sm:block">작품을 눌러 이야기를 들어 보세요</p>
              </div>
            </Reveal>
            <ArtworkGrid artworks={artworks} />
          </section>

          <footer className="mt-20 text-center text-sm text-ink-faint">
            {settings.organizer} · {settings.title}
          </footer>
        </main>
      </div>
    </PageTransition>
  );
}

/** 소개글: 빈 줄은 문단, 한 번 바꾼 줄은 그대로 줄바꿈으로 살린다(관리자가 맞춘 줄 모양을 지킨다). */
function introParagraphs(text: string): string[][] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) =>
      p
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    )
    .filter((p) => p.length > 0);
}

function lines(paragraph: string[]) {
  return paragraph.map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line}
    </Fragment>
  ));
}

/** 쪽빛 낙관(도장) */
function Seal({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden className="shrink-0">
      <rect x="2.5" y="2.5" width="25" height="25" rx="5" fill="var(--color-blue)" transform="rotate(-4 15 15)" />
      <text x="15" y="20.5" textAnchor="middle" fontSize="14" fontWeight="700" fill="#fbf8f2" fontFamily="var(--font-serif)" transform="rotate(-4 15 15)">
        展
      </text>
    </svg>
  );
}

/** 제목 뒤를 지나가는 옅은 쪽빛 붓자국 */
function BrushStroke() {
  return (
    <svg
      className="pointer-events-none absolute -right-24 top-6 -z-10 w-[560px] max-w-none opacity-90 sm:right-[-4rem] sm:w-[720px]"
      viewBox="0 0 720 260"
      aria-hidden
    >
      <path
        d="M24 170C120 92 238 58 366 70c118 11 198 58 330 34"
        fill="none"
        stroke="var(--color-blue-mist)"
        strokeWidth="58"
        strokeLinecap="round"
      />
      <path d="M86 214c98-30 206-40 318-30" fill="none" stroke="var(--color-blue-soft)" strokeWidth="10" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}
