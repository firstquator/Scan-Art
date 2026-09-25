import { ArtworkBoard } from "@/components/admin/artwork-board";
import { artworkMediaBytes, listAllArtworks } from "@/lib/data/artworks";
import { settingsBytes } from "@/lib/data/settings";
import { STORAGE_LIMIT_BYTES } from "@/lib/storage/server";

export default async function AdminHomePage() {
  const [artworks, mediaBytes, coverBytes] = await Promise.all([listAllArtworks(), artworkMediaBytes(), settingsBytes()]);
  return <ArtworkBoard initial={artworks} usage={{ used: mediaBytes + coverBytes, limit: STORAGE_LIMIT_BYTES }} />;
}
