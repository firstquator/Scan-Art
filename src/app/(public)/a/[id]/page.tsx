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

// 한 번 만든 페이지는 캐시해 두고, 관리자가 저장하면 그때 바로 다시 만든다(revalidatePath).
export const revalidate = 86400;

export async function generateStaticParams() {
  return [];
}

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
