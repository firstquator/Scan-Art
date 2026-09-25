import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtworkView } from "@/components/artwork/artwork-view";
import { PageTransition } from "@/components/page-transition";
import { InkMark, StatusPage } from "@/components/status-page";
import { isArtworkId } from "@/lib/ids";
import { loadPublicArtwork, loadSettings } from "@/lib/data/public";
import { joinArtists } from "@/lib/format";
import { nanumPen } from "@/lib/fonts";
import { artworkUrl } from "@/lib/site";

// 요청마다 그리되, 데이터는 lib/data/public.ts 캐시에서 읽는다(관리자가 바꾸면 즉시 반영).
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/a/[id]">): Promise<Metadata> {
  const { id } = await params;
  if (!isArtworkId(id)) return { title: "작품을 찾을 수 없습니다" };
  const [result, settings] = await Promise.all([loadPublicArtwork(id), loadSettings()]);
  if (result.status !== "published") return { title: settings.title };

  const { artwork } = result;
  const artists = joinArtists(artwork.artists);
  const description = (artwork.description.replace(/\s+/g, " ").trim().slice(0, 90) || `${artists}의 작품`) + "";
  const title = `${artwork.title} · ${settings.title}`;
  return {
    title,
    description,
    alternates: { canonical: artworkUrl(id) },
    openGraph: {
      type: "article",
      title: artwork.title,
      description: artists ? `${artists} · ${settings.title}` : settings.title,
      url: artworkUrl(id),
      siteName: settings.title,
      locale: "ko_KR",
    },
    twitter: { card: "summary_large_image", title: artwork.title, description },
  };
}

export default async function ArtworkPage({ params }: PageProps<"/a/[id]">) {
  const { id } = await params;
  if (!isArtworkId(id)) notFound();

  const [result, settings] = await Promise.all([loadPublicArtwork(id), loadSettings()]);

  if (result.status === "missing") notFound();

  if (result.status === "draft") {
    return (
      <StatusPage
        mark={
          <InkMark>
            <span className="font-serif text-3xl font-bold">…</span>
          </InkMark>
        }
        title="작품 이야기를 준비하고 있습니다"
      >
        <p>선생님과 친구들이 작품 소개를 열심히 만들고 있습니다.</p>
        <p>조금 뒤에 다시 QR 코드를 찍어 주세요!</p>
      </StatusPage>
    );
  }

  return (
    <PageTransition>
      <div className={nanumPen.variable}>
        <ArtworkView
          artwork={result.artwork}
          prev={result.prev}
          next={result.next}
          index={result.index}
          total={result.total}
          exhibitionTitle={settings.title}
          organizer={settings.organizer}
          shareUrl={artworkUrl(id)}
        />
      </div>
    </PageTransition>
  );
}
