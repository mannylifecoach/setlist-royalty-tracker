CREATE TABLE IF NOT EXISTS "venue_capacity_cache" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "venue_name" text NOT NULL,
  "venue_city" text NOT NULL,
  "wikidata_capacity" integer,
  "wikidata_entity_id" text,
  "osm_capacity" integer,
  "osm_id" text,
  "resolved_capacity" integer,
  "source" text NOT NULL,
  "confidence" text,
  "looked_up_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "venue_cache_name_city_idx" ON "venue_capacity_cache" ("venue_name", "venue_city");
