/**
 * Serato DJ Pro history CSV parser.
 *
 * Serato exports history as a tab-separated file with a header row.
 * On macOS the default encoding is UTF-16 LE with a BOM; on Windows it's
 * usually UTF-8 or UTF-16 LE. We detect the encoding by checking the BOM
 * and strip it before parsing.
 *
 * Expected columns (order can vary):
 * - "name" or "track" or "title" — the song title
 * - "artist" — the artist name
 * - "start time" — when the track started playing (ISO-like timestamp)
 * - optional: "bpm", "key", "genre", "album", "label"
 *
 * We tolerate missing columns as long as `name`/`title` and `artist` are present.
 */

export interface SeratoTrack {
  title: string;
  artistName: string;
  startTime: string | null;
  row: number;
}

export interface SeratoParseResult {
  tracks: SeratoTrack[];
  warnings: string[];
}

/**
 * Decode a Buffer into a string, handling UTF-16 LE with BOM and UTF-8.
 */
export function decodeSeratoFile(buffer: Buffer): string {
  // UTF-16 LE BOM: 0xFF 0xFE
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.slice(2).toString('utf16le');
  }
  // UTF-16 BE BOM: 0xFE 0xFF
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    // Swap byte order and decode as LE
    const swapped = Buffer.alloc(buffer.length - 2);
    for (let i = 2; i < buffer.length; i += 2) {
      swapped[i - 2] = buffer[i + 1];
      swapped[i - 1] = buffer[i];
    }
    return swapped.toString('utf16le');
  }
  // UTF-8 BOM: 0xEF 0xBB 0xBF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  ) {
    return buffer.slice(3).toString('utf8');
  }
  // Default: UTF-8
  return buffer.toString('utf8');
}

/**
 * Split a text file into lines, handling CRLF, LF, and CR line endings.
 */
function splitLines(text: string): string[] {
  return text.split(/\r\n|\r|\n/);
}

/**
 * Detect the delimiter (tab for Serato exports, fallback to comma).
 */
function detectDelimiter(headerLine: string): string {
  if (headerLine.includes('\t')) return '\t';
  if (headerLine.includes(',')) return ',';
  return '\t';
}

/**
 * Normalize a column header for matching.
 */
function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * Find the index of the first column matching any of the given aliases.
 */
function findColumnIndex(
  headers: string[],
  aliases: string[]
): number {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const idx = normalized.indexOf(normalizeHeader(alias));
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Parse a Serato DJ Pro history export.
 * Accepts the raw file content as a Buffer or string.
 */
export function parseSeratoCsv(input: Buffer | string): SeratoParseResult {
  const text = typeof input === 'string' ? input : decodeSeratoFile(input);
  const lines = splitLines(text).filter((l) => l.trim().length > 0);

  const result: SeratoParseResult = { tracks: [], warnings: [] };

  if (lines.length === 0) {
    result.warnings.push('file is empty');
    return result;
  }

  // Skip any session header lines Serato sometimes adds (e.g. "#1 session …")
  // Find the real header row — the first line that contains "name" or "title" as a column
  let headerIdx = 0;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const lower = lines[i].toLowerCase();
    if (
      (lower.includes('name') || lower.includes('title')) &&
      lower.includes('artist')
    ) {
      headerIdx = i;
      break;
    }
  }

  const headerLine = lines[headerIdx];
  const delimiter = detectDelimiter(headerLine);
  const headers = headerLine.split(delimiter);

  const titleIdx = findColumnIndex(headers, ['name', 'title', 'track']);
  const artistIdx = findColumnIndex(headers, ['artist']);
  const startTimeIdx = findColumnIndex(headers, ['starttime', 'start time', 'start']);

  if (titleIdx === -1 || artistIdx === -1) {
    result.warnings.push(
      'required columns not found — expected a "name" (or "title") column and an "artist" column'
    );
    return result;
  }

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const row = lines[i];
    const fields = row.split(delimiter);

    const title = fields[titleIdx]?.trim();
    const artistName = fields[artistIdx]?.trim();
    const startTime =
      startTimeIdx !== -1 ? fields[startTimeIdx]?.trim() || null : null;

    if (!title || !artistName) continue;

    // Skip rows where the "title" is actually a session delimiter (e.g. "#1 session start")
    if (/^#?\d+\s*session/i.test(title)) continue;

    result.tracks.push({
      title,
      artistName,
      startTime,
      row: i + 1,
    });
  }

  if (result.tracks.length === 0) {
    result.warnings.push('no tracks found in file');
  }

  return result;
}
