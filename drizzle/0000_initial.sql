CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL UNIQUE,
  "name" text,
  "pro" text,
  "email_verified" timestamp,
  "image" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "provider" text NOT NULL,
  "provider_account_id" text NOT NULL,
  "refresh_token" text,
  "access_token" text,
  "expires_at" integer,
  "token_type" text,
  "scope" text,
  "id_token" text,
  "session_state" text
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_token" text NOT NULL UNIQUE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "expires" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification_tokens" (
  "identifier" text NOT NULL,
  "token" text NOT NULL,
  "expires" timestamp NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_token_idx" ON "verification_tokens" ("token");

CREATE TABLE IF NOT EXISTS "songs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "iswc" text,
  "bmi_work_id" text,
  "ascap_work_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "songs_user_title_idx" ON "songs" ("user_id", "title");

CREATE TABLE IF NOT EXISTS "tracked_artists" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "artist_name" text NOT NULL,
  "mbid" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "tracked_artists_user_name_idx" ON "tracked_artists" ("user_id", "artist_name");

CREATE TABLE IF NOT EXISTS "song_artists" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "song_id" uuid NOT NULL REFERENCES "songs"("id") ON DELETE CASCADE,
  "artist_id" uuid NOT NULL REFERENCES "tracked_artists"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "song_artists_pair_idx" ON "song_artists" ("song_id", "artist_id");

CREATE TABLE IF NOT EXISTS "performances" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "song_id" uuid NOT NULL REFERENCES "songs"("id") ON DELETE CASCADE,
  "artist_id" uuid NOT NULL REFERENCES "tracked_artists"("id") ON DELETE CASCADE,
  "setlist_fm_id" text,
  "event_date" date NOT NULL,
  "tour_name" text,
  "venue_name" text,
  "venue_city" text,
  "venue_state" text,
  "venue_country" text,
  "venue_address" text,
  "venue_phone" text,
  "attendance" integer,
  "status" text DEFAULT 'discovered' NOT NULL,
  "expires_at" date,
  "setlist_fm_url" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "scan_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "artist_id" uuid NOT NULL REFERENCES "tracked_artists"("id") ON DELETE CASCADE,
  "scanned_at" timestamp DEFAULT now() NOT NULL,
  "setlists_found" integer DEFAULT 0 NOT NULL,
  "new_performances" integer DEFAULT 0 NOT NULL
);
