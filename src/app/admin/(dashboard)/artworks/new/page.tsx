import type { Metadata } from "next";
import { ArtworkEditor } from "@/components/admin/artwork-editor";
import { newArtworkId } from "@/lib/ids";

export const metadata: Metadata = { title: "새 작품 등록" };

export default function NewArtworkPage() {
  // 번호를 미리 정해 두어, 저장 전에도 사진을 올리고 QR을 볼 수 있게 한다.
  return (
    <ArtworkEditor
      initial={{
        isNew: true,
        id: newArtworkId(),
        title: "",
        artists: [],
        material: "",
        size: "",
        description: "",
        ttsEnabled: true,
        youtubeUrl: "",
        isPublished: true,
        images: [],
        audio: null,
      }}
    />
  );
}
