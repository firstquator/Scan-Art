import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { settings, type Settings } from "@/db/schema";
import type { SiteSettingsView } from "@/lib/types";
import type { SettingsInput } from "@/lib/validation";

async function loadRow(): Promise<Settings> {
  const db = await getDb();
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  if (row) return row;
  const [created] = await db.insert(settings).values({ id: 1 }).onConflictDoNothing().returning();
  if (created) return created;
  const [again] = await db.select().from(settings).where(eq(settings.id, 1));
  return again;
}

export async function getSettings(): Promise<SiteSettingsView> {
  const row = await loadRow();
  return {
    title: row.title,
    subtitle: row.subtitle,
    startDate: row.startDate ?? "",
    endDate: row.endDate ?? "",
    venue: row.venue,
    intro: row.intro,
    organizer: row.organizer,
    cover:
      row.coverUrlLg && row.coverUrlSm && row.coverWidth && row.coverHeight
        ? {
            urlLg: row.coverUrlLg,
            urlSm: row.coverUrlSm,
            width: row.coverWidth,
            height: row.coverHeight,
            blurData: row.coverBlur ?? "",
            alt: "",
            bytes: row.coverBytes,
          }
        : null,
  };
}

/** 저장 후 더 이상 쓰지 않게 된 파일 주소를 돌려준다. */
export async function saveSettings(input: SettingsInput): Promise<string[]> {
  const db = await getDb();
  const before = await loadRow();
  await db
    .update(settings)
    .set({
      title: input.title,
      subtitle: input.subtitle,
      startDate: input.startDate || null,
      endDate: input.endDate || null,
      venue: input.venue,
      intro: input.intro,
      organizer: input.organizer,
      coverUrlLg: input.cover?.urlLg ?? null,
      coverUrlSm: input.cover?.urlSm ?? null,
      coverWidth: input.cover?.width ?? null,
      coverHeight: input.cover?.height ?? null,
      coverBlur: input.cover?.blurData ?? null,
      coverBytes: input.cover?.bytes ?? 0,
      updatedAt: new Date(),
    })
    .where(eq(settings.id, 1));

  const kept = new Set([input.cover?.urlLg, input.cover?.urlSm]);
  return [before.coverUrlLg, before.coverUrlSm].filter((u): u is string => !!u && !kept.has(u));
}

export async function settingsBytes(): Promise<number> {
  return (await loadRow()).coverBytes;
}
