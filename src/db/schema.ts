import {
  pgTable,
  text,
  timestamp,
  uuid,
  date,
  integer,
  boolean,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').unique().notNull(),
  name: text('name'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  country: text('country'), // ISO 3166-1 alpha-2 code
  city: text('city'),
  stageName: text('stage_name'),
  capabilities: text('capabilities')
    .array()
    .$type<Array<'write' | 'perform' | 'dj' | 'produce' | 'publish'>>(),
  referralSource: text('referral_source'),
  pro: text('pro').$type<'bmi' | 'ascap' | 'sesac' | 'gmr' | 'prs' | 'socan' | 'apra' | 'gema' | 'sacem' | 'buma'>(),
  role: text('role').$type<'songwriter' | 'performer' | 'dj' | 'publisher' | 'manager'>(),
  onboardingComplete: timestamp('onboarding_complete', { mode: 'date' }),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  apiKey: text('api_key').unique(),
  emailNotifications: boolean('email_notifications').default(true).notNull(),
  defaultStartTimeHour: text('default_start_time_hour'),
  defaultStartTimeAmPm: text('default_start_time_am_pm'),
  defaultEndTimeHour: text('default_end_time_hour'),
  defaultEndTimeAmPm: text('default_end_time_am_pm'),
});

export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionToken: text('session_token').unique().notNull(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (table) => [uniqueIndex('verification_tokens_token_idx').on(table.token)]
);

export const songs = pgTable(
  'songs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    iswc: text('iswc'),
    bmiWorkId: text('bmi_work_id'),
    ascapWorkId: text('ascap_work_id'),
    workMbid: text('work_mbid'),
    recordingMbid: text('recording_mbid'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('songs_user_title_idx').on(table.userId, table.title)]
);

export const trackedArtists = pgTable(
  'tracked_artists',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    artistName: text('artist_name').notNull(),
    mbid: text('mbid'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('tracked_artists_user_name_idx').on(table.userId, table.artistName),
  ]
);

export const songArtists = pgTable(
  'song_artists',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    songId: uuid('song_id')
      .references(() => songs.id, { onDelete: 'cascade' })
      .notNull(),
    artistId: uuid('artist_id')
      .references(() => trackedArtists.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [
    uniqueIndex('song_artists_pair_idx').on(table.songId, table.artistId),
  ]
);

export const performances = pgTable('performances', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  songId: uuid('song_id')
    .references(() => songs.id, { onDelete: 'cascade' })
    .notNull(),
  artistId: uuid('artist_id')
    .references(() => trackedArtists.id, { onDelete: 'cascade' })
    .notNull(),
  setlistFmId: text('setlist_fm_id'),
  source: text('source')
    .$type<'setlist_fm' | 'serato_import' | 'manual'>()
    .default('setlist_fm')
    .notNull(),
  matchMethod: text('match_method').$type<'fuzzy' | 'work_mbid' | 'exact' | 'manual'>(),
  importBatchId: uuid('import_batch_id'),
  eventDate: date('event_date', { mode: 'string' }).notNull(),
  tourName: text('tour_name'),
  venueName: text('venue_name'),
  venueCity: text('venue_city'),
  venueState: text('venue_state'),
  venueCountry: text('venue_country'),
  venueAddress: text('venue_address'),
  venuePhone: text('venue_phone'),
  attendance: integer('attendance'),
  eventName: text('event_name'),
  eventType: text('event_type').default('Concert (Most Common)'),
  startTimeHour: text('start_time_hour'),
  startTimeAmPm: text('start_time_am_pm'),
  endTimeHour: text('end_time_hour'),
  endTimeAmPm: text('end_time_am_pm'),
  venueZip: text('venue_zip'),
  venueType: text('venue_type'),
  venueCapacity: text('venue_capacity'),
  ticketCharge: text('ticket_charge'),
  status: text('status')
    .$type<'discovered' | 'confirmed' | 'submitted' | 'expired' | 'ineligible'>()
    .default('discovered')
    .notNull(),
  expiresAt: date('expires_at', { mode: 'string' }),
  setlistFmUrl: text('setlist_fm_url'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const venueCapacityCache = pgTable(
  'venue_capacity_cache',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    venueName: text('venue_name').notNull(),
    venueCity: text('venue_city').notNull(),
    wikidataCapacity: integer('wikidata_capacity'),
    wikidataEntityId: text('wikidata_entity_id'),
    osmCapacity: integer('osm_capacity'),
    osmId: text('osm_id'),
    resolvedCapacity: integer('resolved_capacity'),
    source: text('source')
      .$type<'auto' | 'user' | 'wikidata_only' | 'osm_only'>()
      .notNull(),
    confidence: text('confidence').$type<'high' | 'low' | 'user'>(),
    lookedUpAt: timestamp('looked_up_at', { mode: 'date' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('venue_cache_name_city_idx').on(table.venueName, table.venueCity),
  ]
);

export const scanLog = pgTable('scan_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  artistId: uuid('artist_id')
    .references(() => trackedArtists.id, { onDelete: 'cascade' })
    .notNull(),
  scannedAt: timestamp('scanned_at', { mode: 'date' }).defaultNow().notNull(),
  setlistsFound: integer('setlists_found').default(0).notNull(),
  newPerformances: integer('new_performances').default(0).notNull(),
});

export const importBatches = pgTable('import_batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  source: text('source').$type<'serato' | 'traktor' | 'rekordbox'>().notNull(),
  venueName: text('venue_name'),
  venueCity: text('venue_city'),
  venueState: text('venue_state'),
  venueCountry: text('venue_country'),
  eventDate: date('event_date', { mode: 'string' }),
  tracksFound: integer('tracks_found').default(0).notNull(),
  performancesCreated: integer('performances_created').default(0).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});
