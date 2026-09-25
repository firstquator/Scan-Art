import type { Metadata } from "next";
import { ArtworkGrid } from "@/components/home/artwork-grid";
import { ArtImage } from "@/components/artwork/art-image";
import { PageTransition } from "@/components/page-transition";
import { Reveal } from "@/components/ui/reveal";
import { loadPublishedArtworks, loadSettings } from "@/lib/data/public";
import { nanumPen } from "@/lib/fonts";
import { formatPeriod } from "@/lib/format";
import { splitParagraphs } from "@/lib/sentences";
import { exhibitionUrl } from "@/lib/site";

export const revalidate = 86400;

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
  const intro = splitParagraphs(settings.intro);

  return (
    <PageTransition>
      <div className={nanumPen.variable}>
        <header className="relative isolate overflow-hidden pb-10 pt-[max(3.5rem,calc(env(safe-area-inset-top)+2.5rem))] sm:pb-14 sm:pt-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-5">
            <Reveal>
              <p className="flex items-center gap-2.5 font-hand text-[1.7rem] leading-none text-blue-deep">
                <Seal />
                {settings.organizer}
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-5 font-serif text-[2.6rem] font-bold leading-[1.15] tracking-[-0.03em] text-ink sm:text-[4rem]">
                {settings.title}
              </h1>
            </Reveal>
            {settings.subtitle && (
              <Reveal delay={0.14}>
                <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-soft sm:text-xl">{settings.subtitle}</p>
              </Reveal>
            )}
            {(period || settings.venue) && (
              <Reveal delay={0.2}>
                <dl className="mt-7 flex flex-wrap gap-2.5 text-[15px]">
                  {period && (
                    <div className="flex items-center gap-2 rounded-full border border-paper-edge bg-paper-light/80 px-4 py-2 shadow-[var(--shadow-inset)]">
                      <dt className="font-semibold text-blue">기간</dt>
                      <dd className="tabular text-ink">{period}</dd>
                    </div>
                  )}
                  {settings.venue && (
                    <div className="flex items-center gap-2 rounded-full border border-paper-edge bg-paper-light/80 px-4 py-2 shadow-[var(--shadow-inset)]">
                      <dt className="font-semibold text-blue">장소</dt>
                      <dd className="text-ink">{settings.venue}</dd>
                    </div>
                  )}
                </dl>
              </Reveal>
            )}
          </div>
          <BrushStroke />
        </header>

        <main className="mx-auto max-w-4xl px-4 pb-20 sm:px-5">
          {(settings.cover || intro.length > 0) && (
            <Reveal className="mb-14">
              <section
                className={`deckle overflow-hidden rounded-[26px] ${settings.cover && intro.length > 0 ? "sm:grid sm:grid-cols-[1.1fr_1fr]" : ""}`}
                aria-label="전시 소개"
              >
                {settings.cover && (
                  <ArtImage
                    image={settings.cover}
                    alt={`${settings.title} 대표 사진`}
                    sizes="(max-width: 640px) 100vw, 480px"
                    priority
                    className="aspect-[4/3] w-full sm:aspect-auto sm:h-full"
                  />
                )}
                {intro.length > 0 && (
                  <div className="space-y-4 px-6 py-7 text-[16.5px] leading-[1.9] text-ink sm:px-8 sm:py-9">
                    {intro.map((p, i) => (
                      <p key={i}>{p.sentences.map((s) => s.text).join(" ")}</p>
                    ))}
                  </div>
                )}
              </section>
            </Reveal>
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

/** 쪽빛 낙관(도장) */
function Seal() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden className="shrink-0">
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
