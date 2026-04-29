import { performances, songs, trackedArtists } from '@/db/schema';

type Performance = typeof performances.$inferSelect;
type Song = typeof songs.$inferSelect;
type Artist = typeof trackedArtists.$inferSelect;

interface ExportRow {
  performance: Performance;
  song: Song;
  artist: Artist;
}

function escapeCsvField(value: string | null | undefined): string {
  if (!value) return '';
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function generateBmiLiveCsv(rows: ExportRow[]): string {
  const headers = [
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
  ];

  const csvRows = rows.map((row) =>
    [
      escapeCsvField(row.performance.venueName),
      escapeCsvField(row.performance.venueAddress),
      escapeCsvField(row.performance.venueCity),
      escapeCsvField(row.performance.venueState),
      escapeCsvField(row.performance.venueCountry),
      escapeCsvField(row.performance.venuePhone),
      row.performance.eventDate,
      escapeCsvField(row.song.title),
      escapeCsvField(row.song.bmiWorkId),
      row.performance.attendance?.toString() || '',
    ].join(',')
  );

  return [headers.join(','), ...csvRows].join('\n');
}

export function generateAscapOnStageCsv(rows: ExportRow[]): string {
  const headers = [
    'Venue Name',
    'Venue State',
    'Performance Date',
    'Song Title',
    'ASCAP Work ID',
  ];

  const csvRows = rows.map((row) =>
    [
      escapeCsvField(row.performance.venueName),
      escapeCsvField(row.performance.venueState),
      row.performance.eventDate,
      escapeCsvField(row.song.title),
      escapeCsvField(row.song.ascapWorkId),
    ].join(',')
  );

  return [headers.join(','), ...csvRows].join('\n');
}

// Single source of truth for "what's required to file this performance with the PRO?"
// Both the export wizard and the performance detail readiness indicator call this.
//
// BMI Live: the wizard searches BMI's "previously performed venues" by name+city+state and
// either picks a hit (which auto-fills address/phone/capacity) or opens the create-new-venue
// modal which auto-fills via Google Places. So name+city+state is the minimum we must have;
// address/phone are not required. Songs are added by catalog search by title — no work id
// field exists on the wizard. Attendance is optional in the wizard (extension defaults to a
// reasonable range when missing).
//
// ASCAP OnStage: CSV export needs an ASCAP work id; the portal otherwise needs venue + state.
type RequiredFieldsRow = {
  performance: { venueName: string | null; venueCity?: string | null; venueState: string | null };
  song: { bmiWorkId?: string | null; ascapWorkId: string | null };
};

export function getMissingFields(
  row: RequiredFieldsRow,
  pro: 'bmi' | 'ascap'
): string[] {
  const missing: string[] = [];
  if (!row.performance.venueName) missing.push('venue name');
  if (pro === 'bmi') {
    if (!row.performance.venueCity) missing.push('venue city');
    if (!row.performance.venueState) missing.push('venue state');
  }
  if (pro === 'ascap') {
    if (!row.performance.venueState) missing.push('venue state');
    if (!row.song.ascapWorkId) missing.push('ascap work id');
  }
  return missing;
}
