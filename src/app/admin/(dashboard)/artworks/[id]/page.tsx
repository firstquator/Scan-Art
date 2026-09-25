import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtworkEditor } from "@/components/admin/artwork-editor";
import { getEditableArtwork } from "@/lib/data/artworks";
import { isArtworkId } from "@/lib/ids";

export const metadata: Metadata = { title: "작품 수정" };

export default async function EditArtworkPage({ params }: PageProps<"/admin/artworks/[id]">) {
  const { id } = await params;
  if (!isArtworkId(id)) notFound();
  const artwork = await getEditableArtwork(id);
  if (!artwork) notFound();
  return <ArtworkEditor key={artwork.id} initial={artwork} />;
}
