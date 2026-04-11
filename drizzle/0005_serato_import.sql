-- Performance source tracking
ALTER TABLE "performances" ADD COLUMN IF NOT EXISTS "source" text NOT NULL DEFAULT 'setlist_fm';
ALTER TABLE "performances" ADD COLUMN IF NOT EXISTS "import_batch_id" uuid;

CREATE INDEX IF NOT EXISTS "performances_source_idx" ON "performances" ("source");

-- Import batches audit table
CREATE TABLE IF NOT EXISTS "import_batches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "source" text NOT NULL,
  "venue_name" text,
  "venue_city" text,
  "venue_state" text,
  "venue_country" text,
  "event_date" date,
  "tracks_found" integer NOT NULL DEFAULT 0,
  "performances_created" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "import_batches_user_id_idx" ON "import_batches" ("user_id");
