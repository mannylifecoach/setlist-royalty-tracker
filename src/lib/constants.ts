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

// BMI Live attendance ranges
export const BMI_ATTENDANCE_RANGES = [
  { min: 0, max: 250, label: '0 - 250' },
  { min: 251, max: 1000, label: '251 - 1000' },
  { min: 1001, max: 5000, label: '1001 - 5000' },
  { min: 5001, max: Infinity, label: '5001+' },
] as const;

export function mapAttendanceToBmiRange(attendance: number | null): string {
  if (attendance === null || attendance === undefined) return '0 - 250';
  const range = BMI_ATTENDANCE_RANGES.find(
    (r) => attendance >= r.min && attendance <= r.max
  );
  return range?.label ?? '5001+';
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
