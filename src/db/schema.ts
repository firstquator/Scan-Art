import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

/** 사이트(전시) 설정. 항상 id=1 한 줄만 쓴다. */
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  title: text("title").notNull().default("우리들의 작품 전시"),
  subtitle: text("subtitle").notNull().default(""),
  startDate: date("start_date"),
  endDate: date("end_date"),
  venue: text("venue").notNull().default(""),
  intro: text("intro").notNull().default(""),
  organizer: text("organizer").notNull().default("평택특수교육지원센터"),
  coverUrlLg: text("cover_url_lg"),
  coverUrlSm: text("cover_url_sm"),
  coverWidth: integer("cover_width"),
  coverHeight: integer("cover_height"),
  coverBlur: text("cover_blur"),
  coverBytes: integer("cover_bytes").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const artworks = pgTable(
  "artworks",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    artists: text("artists")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    material: text("material").notNull().default(""),
    size: text("size").notNull().default(""),
    description: text("description").notNull().default(""),
    audioUrl: text("audio_url"),
    audioDuration: integer("audio_duration"),
    audioBytes: integer("audio_bytes").notNull().default(0),
    ttsEnabled: boolean("tts_enabled").notNull().default(true),
    youtubeUrl: text("youtube_url").notNull().default(""),
    isPublished: boolean("is_published").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("artworks_sort_idx").on(t.sortOrder)],
);

export const artworkImages = pgTable(
  "artwork_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    artworkId: text("artwork_id")
      .notNull()
      .references(() => artworks.id, { onDelete: "cascade" }),
    urlLg: text("url_lg").notNull(),
    urlSm: text("url_sm").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    blurData: text("blur_data").notNull(),
    alt: text("alt").notNull().default(""),
    bytes: integer("bytes").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("artwork_images_artwork_idx").on(t.artworkId, t.sortOrder)],
);

export const loginAttempts = pgTable("login_attempts", {
  ip: text("ip").primaryKey(),
  failCount: integer("fail_count").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Artwork = typeof artworks.$inferSelect;
export type ArtworkImage = typeof artworkImages.$inferSelect;
export type Settings = typeof settings.$inferSelect;
