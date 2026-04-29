CREATE TABLE IF NOT EXISTS "performance_status_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "performance_id" uuid NOT NULL REFERENCES "performances"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "from_status" text,
  "to_status" text NOT NULL,
  "source" text NOT NULL,
  "changed_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "psh_performance_idx" ON "performance_status_history" ("performance_id", "changed_at" DESC);
CREATE INDEX IF NOT EXISTS "psh_user_idx" ON "performance_status_history" ("user_id", "changed_at" DESC);
