-- ASCAP foundation: user IPI/publisher fields + song duration/isrc/alternate titles +
-- song_writers join table for co-writer splits. All additive — existing rows unaffected.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ipi" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "default_role" text DEFAULT 'CA';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "publisher_name" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "publisher_ipi" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "no_publisher" boolean DEFAULT false NOT NULL;

ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "duration_seconds" integer;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "isrc" text;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "alternate_titles" jsonb;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "ascap_registered_at" timestamp;

CREATE TABLE IF NOT EXISTS "song_writers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "song_id" uuid NOT NULL REFERENCES "songs"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "ipi" text,
  "role" text DEFAULT 'CA' NOT NULL,
  "share_percent" numeric(5, 2) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "song_writers_song_idx" ON "song_writers" ("song_id");

-- Backfill: every existing song gets a single writer row using its owner's name
-- (first+last, falling back to stage name, falling back to email local-part) at
-- the full 50% writer share. Users edit/add writers via the songs page.
INSERT INTO "song_writers" ("song_id", "name", "ipi", "role", "share_percent")
SELECT
  s.id,
  COALESCE(
    NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''),
    NULLIF(u.stage_name, ''),
    SPLIT_PART(u.email, '@', 1)
  ),
  u.ipi,
  COALESCE(u.default_role, 'CA'),
  50.00
FROM "songs" s
INNER JOIN "users" u ON s.user_id = u.id
WHERE NOT EXISTS (
  SELECT 1 FROM "song_writers" sw WHERE sw.song_id = s.id
);
