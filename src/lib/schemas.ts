import { z } from 'zod';

export const uuidParam = z.string().uuid('Invalid UUID format');

// POST /api/songs
export const createSongSchema = z.object({
  title: z.string().min(1, 'title is required').max(500),
  iswc: z.string().max(20).nullish(),
  bmiWorkId: z.string().max(50).nullish(),
  ascapWorkId: z.string().max(50).nullish(),
});

// POST /api/artists
export const createArtistSchema = z.object({
  artistName: z.string().min(1, 'artistName is required').max(500),
  mbid: z.string().uuid().nullish(),
});

// POST /api/artists/[id]/resolve
export const resolveArtistSchema = z.object({
  mbid: z.string().uuid('mbid must be a valid UUID'),
});

// PATCH /api/performances/[id]
export const updatePerformanceSchema = z
  .object({
    status: z.enum(['discovered', 'confirmed', 'submitted', 'expired', 'ineligible']).optional(),
    venueName: z.string().max(500).optional(),
    venueCity: z.string().max(200).optional(),
    venueState: z.string().max(100).optional(),
    venueCountry: z.string().max(100).optional(),
    venueAddress: z.string().max(500).optional(),
    venuePhone: z.string().max(50).optional(),
    attendance: z.number().int().min(0).optional(),
    eventName: z.string().max(500).optional(),
    eventType: z.string().max(100).optional(),
    startTimeHour: z.string().max(10).optional(),
    startTimeAmPm: z.string().max(5).optional(),
    endTimeHour: z.string().max(10).optional(),
    endTimeAmPm: z.string().max(5).optional(),
    venueZip: z.string().max(20).optional(),
    venueType: z.string().max(100).optional(),
    venueCapacity: z.string().max(20).optional(),
    ticketCharge: z.string().max(20).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, 'At least one field is required');

// POST /api/performances/bulk-confirm
export const bulkConfirmSchema = z.object({
  ids: z.array(uuidParam).min(1, 'ids array must not be empty'),
});

// POST /api/extension/performances/mark-submitted
export const markSubmittedSchema = z.object({
  performanceIds: z.array(uuidParam).min(1, 'performanceIds array must not be empty'),
});

// PATCH /api/settings
export const updateSettingsSchema = z
  .object({
    name: z.string().max(200).nullish(),
    firstName: z.string().max(100).nullish(),
    lastName: z.string().max(100).nullish(),
    country: z.string().max(20).nullish(),
    city: z.string().max(200).nullish(),
    stageName: z.string().max(500).nullish(),
    pro: z.enum(['bmi', 'ascap', 'sesac', 'gmr', 'prs', 'socan', 'apra', 'gema', 'sacem', 'buma']).nullish(),
    capabilities: z
      .array(z.enum(['write', 'perform', 'dj', 'produce', 'publish']))
      .optional(),
    role: z.enum(['songwriter', 'performer', 'dj', 'publisher', 'manager']).nullish(),
    emailNotifications: z.boolean().optional(),
    defaultStartTimeHour: z.string().max(10).nullish(),
    defaultStartTimeAmPm: z.string().max(5).nullish(),
    defaultEndTimeHour: z.string().max(10).nullish(),
    defaultEndTimeAmPm: z.string().max(5).nullish(),
  })
  .refine((obj) => Object.keys(obj).length > 0, 'At least one field is required');

// POST /api/onboarding
export const onboardingSchema = z.object({
  firstName: z.string().min(1, 'first name is required').max(100).transform((s) => s.trim()),
  lastName: z.string().min(1, 'last name is required').max(100).transform((s) => s.trim()),
  country: z.string().min(2, 'country is required').max(20),
  city: z.string().max(200).nullish().transform((s) => s?.trim() || null),
  stageName: z
    .string()
    .min(1, 'stage name is required')
    .max(500)
    .transform((s) => s.trim()),
  pro: z.enum(['bmi', 'ascap', 'sesac', 'gmr', 'prs', 'socan', 'apra', 'gema', 'sacem', 'buma']).nullish(),
  capabilities: z
    .array(z.enum(['write', 'perform', 'dj', 'produce', 'publish']))
    .min(1, 'please select at least one capability'),
  referralSource: z.string().max(100).nullish().transform((s) => s?.trim() || null),
});

// POST & DELETE /api/songs/[id]/artists
export const songArtistSchema = z.object({
  artistId: uuidParam,
});

// POST /api/pitch/verify
export const pitchVerifySchema = z.object({
  password: z.string().min(1),
});

// GET /api/performances/export query params
export const exportQuerySchema = z.object({
  pro: z.enum(['bmi', 'ascap']),
  ids: z.string().optional(),
});

// GET /api/setlistfm/search query params
export const setlistfmSearchSchema = z.object({
  q: z.string().min(1, 'q parameter is required').max(200),
});

// POST /api/import/serato — form fields (file is handled separately)
export const seratoImportSchema = z.object({
  venueName: z.string().min(1, 'venueName is required').max(500),
  venueCity: z.string().min(1, 'venueCity is required').max(200),
  venueState: z.string().max(100).nullish(),
  venueCountry: z.string().max(100).nullish(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'eventDate must be YYYY-MM-DD'),
});
