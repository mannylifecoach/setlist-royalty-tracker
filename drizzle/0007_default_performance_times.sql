ALTER TABLE "users" ADD COLUMN "default_start_time_hour" text;
ALTER TABLE "users" ADD COLUMN "default_start_time_am_pm" text;
ALTER TABLE "users" ADD COLUMN "default_end_time_hour" text;
ALTER TABLE "users" ADD COLUMN "default_end_time_am_pm" text;

-- Set sensible defaults for existing users
UPDATE "users" SET
  "default_start_time_hour" = '8:00',
  "default_start_time_am_pm" = 'PM',
  "default_end_time_hour" = '11:00',
  "default_end_time_am_pm" = 'PM'
WHERE "onboarding_complete" IS NOT NULL;
