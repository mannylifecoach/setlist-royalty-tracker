-- Add API key to users
ALTER TABLE "users" ADD COLUMN "api_key" text UNIQUE;

-- Add BMI-specific fields to performances
ALTER TABLE "performances" ADD COLUMN "event_name" text;
ALTER TABLE "performances" ADD COLUMN "event_type" text DEFAULT 'Concert (Most Common)';
ALTER TABLE "performances" ADD COLUMN "start_time_hour" text;
ALTER TABLE "performances" ADD COLUMN "start_time_am_pm" text;
ALTER TABLE "performances" ADD COLUMN "end_time_hour" text;
ALTER TABLE "performances" ADD COLUMN "end_time_am_pm" text;
ALTER TABLE "performances" ADD COLUMN "venue_zip" text;
ALTER TABLE "performances" ADD COLUMN "venue_type" text;
ALTER TABLE "performances" ADD COLUMN "venue_capacity" text;
ALTER TABLE "performances" ADD COLUMN "ticket_charge" text;
