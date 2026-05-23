-- Per-user cooldown for Bandsintown scans. Prevents the daily cron AND the
-- upcoming manual /api/scan/bandsintown endpoint from hammering Bandsintown's
-- API. 24h between full Bandsintown scans per user — the scanner records the
-- timestamp on every attempt (success or 429) and short-circuits with a
-- "cooldown_active" skipped reason until the window expires.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_bandsintown_scan_at" timestamp;
