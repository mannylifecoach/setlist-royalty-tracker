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

export function getMissingFields(
  row: ExportRow,
  pro: 'bmi' | 'ascap'
): string[] {
  const missing: string[] = [];

  if (!row.performance.venueName) missing.push('venue name');

  if (pro === 'bmi') {
    if (!row.performance.venueAddress) missing.push('venue address');
    if (!row.performance.venueCity) missing.push('venue city');
    if (!row.performance.venueState) missing.push('venue state');
    if (!row.performance.venueCountry) missing.push('venue country');
    if (!row.performance.venuePhone) missing.push('venue phone');
    if (!row.performance.attendance) missing.push('attendance');
    if (!row.song.bmiWorkId) missing.push('bmi work id');
  }

  if (pro === 'ascap') {
    if (!row.performance.venueState) missing.push('venue state');
    if (!row.song.ascapWorkId) missing.push('ascap work id');
  }

  return missing;
}
