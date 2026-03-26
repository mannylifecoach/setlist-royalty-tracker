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
