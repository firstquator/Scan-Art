import "server-only";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { artworkImages, artworks, type Artwork, type ArtworkImage } from "@/db/schema";
import type { AdminArtworkSummary, ArtworkLink, ArtworkView, ImageView } from "@/lib/types";
import type { ArtworkInput } from "@/lib/validation";

function toImageView(img: ArtworkImage): ImageView {
  return {
    urlLg: img.urlLg,
    urlSm: img.urlSm,
    width: img.width,
    height: img.height,
    blurData: img.blurData,
    alt: img.alt,
  };
}

function toView(row: Artwork, images: ArtworkImage[]): ArtworkView {
  return {
    id: row.id,
    title: row.title,
    artists: row.artists,
    material: row.material,
    size: row.size,
    description: row.description,
    ttsEnabled: row.ttsEnabled,
    youtubeUrl: row.youtubeUrl,
    audio: row.audioUrl ? { url: row.audioUrl, duration: row.audioDuration ?? 0 } : null,
    images: images.map(toImageView),
  };
}

async function imagesByArtwork(ids: string[]): Promise<Map<string, ArtworkImage[]>> {
  const map = new Map<string, ArtworkImage[]>();
  if (ids.length === 0) return map;
  const db = await getDb();
  const rows = await db
    .select()
    .from(artworkImages)
    .where(inArray(artworkImages.artworkId, ids))
    .orderBy(asc(artworkImages.artworkId), asc(artworkImages.sortOrder));
  for (const row of rows) {
    const list = map.get(row.artworkId) ?? [];
    list.push(row);
    map.set(row.artworkId, list);
  }
  return map;
}

function toLink(row: Artwork, images: ArtworkImage[] | undefined): ArtworkLink {
  return {
    id: row.id,
    title: row.title,
    artists: row.artists,
    cover: images?.[0] ? toImageView(images[0]) : null,
  };
}

const ordered = [asc(artworks.sortOrder), asc(artworks.createdAt)] as const;

// ── 관람 화면 ─────────────────────────────────────────

export async function listPublishedArtworks(): Promise<ArtworkLink[]> {
  const db = await getDb();
  const rows = await db.select().from(artworks).where(eq(artworks.isPublished, true)).orderBy(...ordered);
  const images = await imagesByArtwork(rows.map((r) => r.id));
  return rows.map((r) => toLink(r, images.get(r.id)));
}

export type PublicArtworkResult =
  | { status: "published"; artwork: ArtworkView; prev: ArtworkLink | null; next: ArtworkLink | null; index: number; total: number }
  | { status: "draft" }
  | { status: "missing" };

export async function getPublicArtwork(id: string): Promise<PublicArtworkResult> {
  const db = await getDb();
  const [row] = await db.select().from(artworks).where(eq(artworks.id, id));
  if (!row) return { status: "missing" };
  if (!row.isPublished) return { status: "draft" };

  const published = await db
    .select({ id: artworks.id })
    .from(artworks)
    .where(eq(artworks.isPublished, true))
    .orderBy(...ordered);
  const index = published.findIndex((p) => p.id === id);
  const prevId = index > 0 ? published[index - 1].id : null;
  const nextId = index >= 0 && index < published.length - 1 ? published[index + 1].id : null;

  const neighborIds = [prevId, nextId].filter((v): v is string => !!v);
  const neighborRows = neighborIds.length
    ? await db.select().from(artworks).where(inArray(artworks.id, neighborIds))
    : [];
  const images = await imagesByArtwork([id, ...neighborIds]);
  const link = (nid: string | null) => {
    const r = neighborRows.find((n) => n.id === nid);
    return r ? toLink(r, images.get(r.id)) : null;
  };

  return {
    status: "published",
    artwork: toView(row, images.get(id) ?? []),
    prev: link(prevId),
    next: link(nextId),
    index,
    total: published.length,
  };
}

// ── 관리자 화면 ────────────────────────────────────────

export async function listAllArtworks(): Promise<AdminArtworkSummary[]> {
  const db = await getDb();
  const rows = await db.select().from(artworks).orderBy(...ordered);
  const images = await imagesByArtwork(rows.map((r) => r.id));
  return rows.map((r) => {
    const imgs = images.get(r.id) ?? [];
    return {
      ...toLink(r, imgs),
      isPublished: r.isPublished,
      imageCount: imgs.length,
      hasAudio: !!r.audioUrl,
      hasVideo: !!r.youtubeUrl,
      material: r.material,
      size: r.size,
      updatedAt: r.updatedAt.toISOString(),
    };
  });
}

export interface EditableArtwork extends ArtworkInput {
  isNew: boolean;
}

export async function getEditableArtwork(id: string): Promise<EditableArtwork | null> {
  const db = await getDb();
  const [row] = await db.select().from(artworks).where(eq(artworks.id, id));
  if (!row) return null;
  const imgs = (await imagesByArtwork([id])).get(id) ?? [];
  return {
    isNew: false,
    id: row.id,
    title: row.title,
    artists: row.artists,
    material: row.material,
    size: row.size,
    description: row.description,
    ttsEnabled: row.ttsEnabled,
    youtubeUrl: row.youtubeUrl,
    isPublished: row.isPublished,
    images: imgs.map((img) => ({ ...toImageView(img), bytes: img.bytes })),
    audio: row.audioUrl
      ? { url: row.audioUrl, duration: row.audioDuration ?? 0, bytes: row.audioBytes }
      : null,
  };
}

function mediaUrlsOf(input: Pick<ArtworkInput, "images" | "audio">): string[] {
  return [...input.images.flatMap((i) => [i.urlLg, i.urlSm]), ...(input.audio ? [input.audio.url] : [])];
}

/** 새로 만들거나 고친다. 더 이상 쓰지 않게 된 파일 주소를 돌려준다. */
export async function saveArtwork(input: ArtworkInput): Promise<{ removedUrls: string[]; created: boolean }> {
  const db = await getDb();
  const before = await getEditableArtwork(input.id);
  const now = new Date();
  const values = {
    title: input.title,
    artists: input.artists,
    material: input.material,
    size: input.size,
    description: input.description,
    ttsEnabled: input.ttsEnabled,
    youtubeUrl: input.youtubeUrl,
    isPublished: input.isPublished,
    audioUrl: input.audio?.url ?? null,
    audioDuration: input.audio?.duration ?? null,
    audioBytes: input.audio?.bytes ?? 0,
    updatedAt: now,
  };

  if (before) {
    await db.update(artworks).set(values).where(eq(artworks.id, input.id));
  } else {
    const [{ max }] = await db
      .select({ max: sql<number>`coalesce(max(${artworks.sortOrder}), -1)` })
      .from(artworks);
    await db.insert(artworks).values({ id: input.id, ...values, sortOrder: Number(max) + 1, createdAt: now });
  }

  await db.delete(artworkImages).where(eq(artworkImages.artworkId, input.id));
  if (input.images.length > 0) {
    await db.insert(artworkImages).values(
      input.images.map((img, i) => ({
        artworkId: input.id,
        urlLg: img.urlLg,
        urlSm: img.urlSm,
        width: img.width,
        height: img.height,
        blurData: img.blurData,
        alt: img.alt,
        bytes: img.bytes,
        sortOrder: i,
      })),
    );
  }

  const kept = new Set(mediaUrlsOf(input));
  const removedUrls = before ? mediaUrlsOf(before).filter((u) => !kept.has(u)) : [];
  return { removedUrls, created: !before };
}

/** 지운 작품이 쓰던 파일 주소를 돌려준다. 없으면 null. */
export async function deleteArtwork(id: string): Promise<string[] | null> {
  const before = await getEditableArtwork(id);
  if (!before) return null;
  const db = await getDb();
  await db.delete(artworks).where(eq(artworks.id, id));
  return mediaUrlsOf(before);
}

export async function setPublished(id: string, isPublished: boolean): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .update(artworks)
    .set({ isPublished, updatedAt: new Date() })
    .where(eq(artworks.id, id))
    .returning({ id: artworks.id });
  return rows.length > 0;
}

/** 목록 순서대로 sort_order를 한 번의 쿼리로 다시 매긴다. */
export async function reorderArtworks(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  const cases = sql.join(
    ids.map((id, i) => sql`when ${id} then ${i}`),
    sql` `,
  );
  await db
    .update(artworks)
    .set({ sortOrder: sql`(case ${artworks.id} ${cases} else ${artworks.sortOrder} end)` })
    .where(inArray(artworks.id, ids));
}

/** 저장소에 올라가 있는 파일 용량 합계(바이트) */
export async function artworkMediaBytes(): Promise<number> {
  const db = await getDb();
  const [img] = await db.select({ total: sql<number>`coalesce(sum(${artworkImages.bytes}), 0)` }).from(artworkImages);
  const [aud] = await db.select({ total: sql<number>`coalesce(sum(${artworks.audioBytes}), 0)` }).from(artworks);
  return Number(img.total) + Number(aud.total);
}
