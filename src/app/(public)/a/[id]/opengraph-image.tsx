import { isArtworkId } from "@/lib/ids";
import { loadPublicArtwork, loadSettings } from "@/lib/data/public";
import { joinArtists } from "@/lib/format";
import { OG_SIZE, renderOgCard } from "@/lib/og";

export const alt = "작품 소개";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const settings = await loadSettings();
  const result = isArtworkId(id) ? await loadPublicArtwork(id) : { status: "missing" as const };

  if (result.status !== "published") {
    return renderOgCard({
      eyebrow: settings.organizer,
      title: settings.title,
      subtitle: "학생 작품 전시",
      imageUrl: settings.cover?.urlLg,
      cta: "전시 둘러보기",
    });
  }

  const { artwork } = result;
  return renderOgCard({
    eyebrow: settings.title,
    title: artwork.title,
    subtitle: joinArtists(artwork.artists),
    imageUrl: artwork.images[0]?.urlLg,
    cta: "작품 이야기 보기",
  });
}
