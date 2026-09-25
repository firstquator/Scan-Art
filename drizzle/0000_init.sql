CREATE TABLE "artwork_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artwork_id" text NOT NULL,
	"url_lg" text NOT NULL,
	"url_sm" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"blur_data" text NOT NULL,
	"alt" text DEFAULT '' NOT NULL,
	"bytes" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artworks" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"artists" text[] DEFAULT '{}'::text[] NOT NULL,
	"material" text DEFAULT '' NOT NULL,
	"size" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"audio_url" text,
	"audio_duration" integer,
	"audio_bytes" integer DEFAULT 0 NOT NULL,
	"tts_enabled" boolean DEFAULT true NOT NULL,
	"youtube_url" text DEFAULT '' NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"ip" text PRIMARY KEY NOT NULL,
	"fail_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"title" text DEFAULT '우리들의 작품 전시' NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"start_date" date,
	"end_date" date,
	"venue" text DEFAULT '' NOT NULL,
	"intro" text DEFAULT '' NOT NULL,
	"organizer" text DEFAULT '평택특수교육지원센터' NOT NULL,
	"cover_url_lg" text,
	"cover_url_sm" text,
	"cover_width" integer,
	"cover_height" integer,
	"cover_blur" text,
	"cover_bytes" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artwork_images" ADD CONSTRAINT "artwork_images_artwork_id_artworks_id_fk" FOREIGN KEY ("artwork_id") REFERENCES "public"."artworks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artwork_images_artwork_idx" ON "artwork_images" USING btree ("artwork_id","sort_order");--> statement-breakpoint
CREATE INDEX "artworks_sort_idx" ON "artworks" USING btree ("sort_order");