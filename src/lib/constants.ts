export const PERFORMANCE_STATUSES = [
  'discovered',
  'confirmed',
  'submitted',
  'expired',
  'ineligible',
] as const;

export type PerformanceStatus = (typeof PERFORMANCE_STATUSES)[number];

export const STATUS_LABELS: Record<PerformanceStatus, string> = {
  discovered: 'discovered',
  confirmed: 'confirmed',
  submitted: 'submitted',
  expired: 'expired',
  ineligible: 'ineligible',
};

export const PRO_OPTIONS = ['bmi', 'ascap'] as const;
export type ProOption = (typeof PRO_OPTIONS)[number];

// All PROs SRT supports (Chrome extension targets the US PROs for now,
// but we store the affiliation for non-US users so they're ready when
// international form support lands).
export const ALL_PROS = ['bmi', 'ascap', 'sesac', 'gmr', 'prs', 'socan', 'apra', 'gema', 'sacem', 'buma'] as const;
export type AllPro = (typeof ALL_PROS)[number];

// Country → list of PROs to offer in onboarding.
// ISO 3166-1 alpha-2 country code → array of PRO options.
// Countries not listed fall back to showing all PROs.
export const COUNTRY_PROS: Record<string, AllPro[]> = {
  US: ['bmi', 'ascap', 'sesac', 'gmr'],
  CA: ['socan'],
  GB: ['prs'],
  UK: ['prs'],
  AU: ['apra'],
  NZ: ['apra'],
  DE: ['gema'],
  AT: ['gema'],
  FR: ['sacem'],
  NL: ['buma'],
};

// Country list for the onboarding dropdown — ISO alpha-2 → display name.
// Prioritizes English-speaking and major music markets at the top.
export const COUNTRY_OPTIONS: Array<{ code: string; name: string }> = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'IE', name: 'Ireland' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'PT', name: 'Portugal' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'AR', name: 'Argentina' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'OTHER', name: 'Other / not listed' },
];

export function getProsForCountry(country: string | null | undefined): AllPro[] {
  if (!country) return [...ALL_PROS];
  return COUNTRY_PROS[country] || [...ALL_PROS];
}

// User capabilities — multi-select in onboarding.
// Drives which tools appear on the dashboard.
export const CAPABILITY_OPTIONS = [
  { value: 'write', label: 'write songs', desc: 'I compose music or lyrics' },
  { value: 'perform', label: 'perform live', desc: 'I play shows — solo, band, or singer-songwriter' },
  { value: 'dj', label: 'dj', desc: 'I play dj sets at clubs, festivals, or events' },
  { value: 'produce', label: 'produce tracks', desc: 'I make original music in the studio' },
  { value: 'publish', label: 'publish or manage catalogs', desc: 'I handle royalties or catalogs for others' },
] as const;
export type Capability = (typeof CAPABILITY_OPTIONS)[number]['value'];

// Referral sources for the optional "how did you hear about us" field.
export const REFERRAL_SOURCES = [
  'friend or referral',
  'twitter / x',
  'instagram',
  'reddit',
  'google search',
  'music industry news',
  'at a show or conference',
  'other',
] as const;

// BMI Live requires submission within 9 months of performance
export const BMI_EXPIRATION_MONTHS = 9;

// BMI Live CSV field mappings
export const BMI_LIVE_FIELDS = [
  'Venue Name',
  'Venue Address',
  'Venue City',
  'Venue State',
  'Venue Country',
  'Venue Phone',
  'Performance Date',
  'Song Title',
  'BMI Work ID',
  'Attendance',
] as const;

// ASCAP OnStage CSV field mappings
export const ASCAP_ONSTAGE_FIELDS = [
  'Venue Name',
  'Venue State',
  'Performance Date',
  'Song Title',
  'ASCAP Work ID',
] as const;

export const SETLISTFM_BASE_URL = 'https://api.setlist.fm/rest/1.0';
export const SETLISTFM_RATE_LIMIT_MS = 100;

// Venue capacity enrichment
export const WIKIDATA_SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
export const WIKIDATA_RATE_LIMIT_MS = 1000;
export const OSM_OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
export const OSM_RATE_LIMIT_MS = 1000;
export const VENUE_CAPACITY_CACHE_TTL_DAYS = 90;
export const VENUE_CAPACITY_AGREEMENT_THRESHOLD = 0.10;

// Song metadata enrichment via MusicBrainz
export const MUSICBRAINZ_BASE_URL = 'https://musicbrainz.org/ws/2';
export const MUSICBRAINZ_RATE_LIMIT_MS = 1100; // 1 req/sec + buffer
export const MUSICBRAINZ_USER_AGENT =
  'SetlistRoyaltyTracker/1.0 (https://setlistroyalty.com)';

// CISAC writer/composer role codes used by ASCAP Work Registration.
// CA (Composer/Author) is the most common — covers writers who do both music + lyrics.
export const CISAC_ROLES = [
  { code: 'CA', label: 'composer / author' },
  { code: 'C', label: 'composer (music only)' },
  { code: 'A', label: 'author (lyrics only)' },
  { code: 'AR', label: 'arranger' },
  { code: 'AD', label: 'adapter' },
  { code: 'TR', label: 'translator' },
  { code: 'SR', label: 'sub-author' },
] as const;
export type CisacRole = (typeof CISAC_ROLES)[number]['code'];

// ASCAP enforces a hard 50/50 split between writers and publishers. All writer
// rows for a single song must sum to exactly this value (publishers get the other 50%).
export const WRITER_SHARE_TOTAL = 50;

// BMI Live attendance ranges
export const BMI_ATTENDANCE_RANGES = [
  { min: 0, max: 250, label: '0 - 250' },
  { min: 251, max: 1000, label: '251 - 1000' },
  { min: 1001, max: 5000, label: '1001 - 5000' },
  { min: 5001, max: Infinity, label: '5001+' },
] as const;

export function mapAttendanceToBmiRange(
  attendance: number | null | undefined,
  venueCapacity?: number | null
): string {
  const inRange = (n: number) =>
    BMI_ATTENDANCE_RANGES.find((r) => n >= r.min && n <= r.max)?.label ?? '5001+';
  if (attendance !== null && attendance !== undefined) return inRange(attendance);
  if (venueCapacity !== null && venueCapacity !== undefined && venueCapacity > 0) {
    return inRange(venueCapacity);
  }
  // No data — default to the middle range so the user doesn't silently under-claim.
  // Working songwriters more often play theaters/clubs (1001-5000) than small rooms.
  return '1001 - 5000';
}

// BMI Live event types
export const BMI_EVENT_TYPES = [
  'Concert (Most Common)',
  'Festival',
  'Corporate Event',
  'Private Event',
  'Benefit/Charity',
  'Other',
] as const;

// BMI Live venue types
export const BMI_VENUE_TYPES = [
  'Arena',
  'Amphitheater',
  'Bar/Lounge',
  'Casino',
  'Church',
  'Club/Nightclub',
  'College/University',
  'Concert Hall',
  'Convention Center',
  'Fair/Festival Grounds',
  'Hotel/Resort',
  'Outdoor Venue',
  'Performing Arts Center',
  'Restaurant',
  'Stadium',
  'Theater',
  'Winery/Brewery',
  'Other',
] as const;

// BMI time hour options (for dropdowns)
export const BMI_HOURS = [
  '12:00', '1:00', '2:00', '3:00', '4:00', '5:00',
  '6:00', '7:00', '8:00', '9:00', '10:00', '11:00',
] as const;
