import { describe, it, expect } from 'vitest';
import { parseSeratoCsv, decodeSeratoFile } from './serato-import';

describe('decodeSeratoFile', () => {
  it('decodes UTF-16 LE with BOM', () => {
    // BOM + "hi"
    const buf = Buffer.from([0xff, 0xfe, 0x68, 0x00, 0x69, 0x00]);
    expect(decodeSeratoFile(buf)).toBe('hi');
  });

  it('decodes UTF-8 with BOM', () => {
    const buf = Buffer.from([0xef, 0xbb, 0xbf, 0x68, 0x69]);
    expect(decodeSeratoFile(buf)).toBe('hi');
  });

  it('decodes plain UTF-8', () => {
    const buf = Buffer.from('hello', 'utf8');
    expect(decodeSeratoFile(buf)).toBe('hello');
  });
});

describe('parseSeratoCsv', () => {
  it('parses a standard tab-separated Serato export', () => {
    const csv = `name\tartist\tstart time\tbpm
Midnight Bass\tProducer A\t2025-12-26 22:15:30\t128
Sunset Drive\tProducer B\t2025-12-26 22:18:45\t124
Bassline Lover\tProducer A & Skrillex\t2025-12-26 22:22:10\t140`;

    const result = parseSeratoCsv(csv);
    expect(result.tracks).toHaveLength(3);
    expect(result.tracks[0]).toMatchObject({
      title: 'Midnight Bass',
      artistName: 'Producer A',
      startTime: '2025-12-26 22:15:30',
    });
    expect(result.tracks[2].artistName).toBe('Producer A & Skrillex');
    expect(result.warnings).toHaveLength(0);
  });

  it('handles "title" instead of "name" column', () => {
    const csv = `title\tartist
Track One\tArtist One`;
    const result = parseSeratoCsv(csv);
    expect(result.tracks).toHaveLength(1);
    expect(result.tracks[0].title).toBe('Track One');
  });

  it('handles comma-separated fallback', () => {
    const csv = `name,artist
"Track","Artist"`;
    const result = parseSeratoCsv(csv);
    expect(result.tracks).toHaveLength(1);
    // Note: simple CSV parser — quoted fields not specially handled,
    // but the quotes shouldn't break parsing
    expect(result.tracks[0].artistName).toContain('Artist');
  });

  it('skips session delimiter rows', () => {
    const csv = `name\tartist
#1 session start\t-
Real Track\tReal Artist`;
    const result = parseSeratoCsv(csv);
    expect(result.tracks).toHaveLength(1);
    expect(result.tracks[0].title).toBe('Real Track');
  });

  it('warns when required columns are missing', () => {
    const csv = `bpm\tkey
128\tAm`;
    const result = parseSeratoCsv(csv);
    expect(result.tracks).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes('required columns'))).toBe(true);
  });

  it('warns when file is empty', () => {
    const result = parseSeratoCsv('');
    expect(result.tracks).toHaveLength(0);
    expect(result.warnings).toContain('file is empty');
  });

  it('skips rows with missing title or artist', () => {
    const csv = `name\tartist
Full Track\tFull Artist
\tOrphan Artist
Orphan Title\t`;
    const result = parseSeratoCsv(csv);
    expect(result.tracks).toHaveLength(1);
    expect(result.tracks[0].title).toBe('Full Track');
  });

  it('handles UTF-16 LE buffer with BOM', () => {
    // Construct a small UTF-16 LE BOM + header + one row
    const text = `name\tartist\nTrack\tArtist`;
    const bom = Buffer.from([0xff, 0xfe]);
    const body = Buffer.from(text, 'utf16le');
    const buf = Buffer.concat([bom, body]);

    const result = parseSeratoCsv(buf);
    expect(result.tracks).toHaveLength(1);
    expect(result.tracks[0].title).toBe('Track');
  });

  it('preserves whitespace in titles but trims leading/trailing', () => {
    const csv = `name\tartist
  Track With Spaces  \t  Artist  `;
    const result = parseSeratoCsv(csv);
    expect(result.tracks[0].title).toBe('Track With Spaces');
    expect(result.tracks[0].artistName).toBe('Artist');
  });

  it('finds header row even if preceded by session metadata', () => {
    const csv = `DJ Session Log
Exported from Serato DJ Pro
name\tartist
Track\tArtist`;
    const result = parseSeratoCsv(csv);
    expect(result.tracks).toHaveLength(1);
    expect(result.tracks[0].title).toBe('Track');
  });
});
