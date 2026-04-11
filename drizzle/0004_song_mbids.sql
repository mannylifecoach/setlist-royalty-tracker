ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "work_mbid" text;
ALTER TABLE "songs" ADD COLUMN IF NOT EXISTS "recording_mbid" text;

CREATE INDEX IF NOT EXISTS "songs_work_mbid_idx" ON "songs" ("work_mbid");
