-- Bandsintown Path A (BYO key per user): users provide their own API key + artist
-- slug from the Bandsintown for Artists dashboard. SRT pulls THAT user's past
-- tour dates as a discovery source to fill the setlist.fm coverage gap.
--
-- Storage matches the Chrome ext API key pattern (plain text in users; access
-- gated by session auth). Public Bandsintown API was retired 2026-05-04 — the
-- per-artist key model is the only free path. Cross-artist access requires
-- partnership (separate Backlog card).

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bandsintown_api_key" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bandsintown_artist_slug" text;
