-- Default setlist template: users can pick a typical setlist once in /settings.
-- New performance creation (manual entry now, Bandsintown imports later) pre-fills
-- from this template when songIds is missing/empty. Empty template = no pre-fill.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "default_setlist_song_ids" jsonb;
