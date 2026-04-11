-- Add profile fields for the redesigned onboarding flow.
-- All additive — existing rows remain valid.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "first_name" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_name" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stage_name" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "capabilities" text[];
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referral_source" text;
