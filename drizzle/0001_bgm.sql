ALTER TABLE "artworks" ADD COLUMN "bgm_mode" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "artworks" ADD COLUMN "bgm_url" text;--> statement-breakpoint
ALTER TABLE "artworks" ADD COLUMN "bgm_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "artworks" ADD COLUMN "bgm_bytes" integer DEFAULT 0 NOT NULL;