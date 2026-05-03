import { describe, it, expect, vi, beforeEach } from 'vitest';

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ARTIST_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const SONG_ID_1 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SONG_ID_2 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const NEW_PERF_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

const { mockSession, mockState, mockInsertedRows } = vi.hoisted(() => ({
  mockSession: { value: null as { user: { id: string; email: string } } | null },
  mockState: {
    artistMatches: true,
    songMatchCount: 2,
    userDefaults: {
      defaultStartTimeHour: '8',
      defaultStartTimeAmPm: 'PM',
      defaultEndTimeHour: '11',
      defaultEndTimeAmPm: 'PM',
    } as Record<string, string | null> | null,
  },
  mockInsertedRows: { value: [] as unknown[] },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => mockSession.value),
}));

// Mock db.select() / db.insert() — three select calls happen in order:
//   1. artist ownership check  → returns [{id}] when artistMatches is true
//   2. songs ownership check   → returns N rows where N == songMatchCount
//   3. user defaults lookup    → returns mockState.userDefaults wrapped
let selectCallIdx = 0;
vi.mock('@/db', () => ({
  db: {
    select: () => {
      const idx = selectCallIdx++;
      let dataset: unknown[];
      if (idx === 0) dataset = mockState.artistMatches ? [{ id: ARTIST_ID }] : [];
      else if (idx === 1) {
        dataset = Array.from({ length: mockState.songMatchCount }, (_, i) => ({
          id: i === 0 ? SONG_ID_1 : SONG_ID_2,
        }));
      } else dataset = mockState.userDefaults ? [mockState.userDefaults] : [];

      return {
        from: () => ({
          where: () => ({
            then: (resolve: (v: unknown[]) => void) => resolve(dataset),
          }),
        }),
      };
    },
    insert: () => ({
      values: (rows: unknown[]) => {
        mockInsertedRows.value = rows;
        return {
          returning: () =>
            Promise.resolve(
              (rows as unknown[]).map(() => ({ id: NEW_PERF_ID }))
            ),
        };
      },
    }),
  },
}));

import { POST } from './route';

function makeRequest(body: unknown): unknown {
  return {
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  };
}

const validBody = {
  eventDate: '2026-04-15',
  artistId: ARTIST_ID,
  songIds: [SONG_ID_1, SONG_ID_2],
  venueName: 'The Echo',
  venueCity: 'Los Angeles',
  venueState: 'CA',
  venueCountry: 'US',
};

beforeEach(() => {
  selectCallIdx = 0;
  mockSession.value = { user: { id: USER_ID, email: 'test@example.com' } };
  mockState.artistMatches = true;
  mockState.songMatchCount = 2;
  mockState.userDefaults = {
    defaultStartTimeHour: '8',
    defaultStartTimeAmPm: 'PM',
    defaultEndTimeHour: '11',
    defaultEndTimeAmPm: 'PM',
  };
  mockInsertedRows.value = [];
});

describe('POST /api/performances — auth', () => {
  it('returns 401 when no session', async () => {
    mockSession.value = null;
    const res = await POST(makeRequest(validBody) as never);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/performances — validation', () => {
  it('returns 400 when eventDate is malformed', async () => {
    const res = await POST(makeRequest({ ...validBody, eventDate: '04/15/2026' }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 when songIds is empty', async () => {
    const res = await POST(makeRequest({ ...validBody, songIds: [] }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 when venueName is missing', async () => {
    const withoutVenue: Record<string, unknown> = { ...validBody };
    delete withoutVenue.venueName;
    const res = await POST(makeRequest(withoutVenue) as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 when artistId is not a UUID', async () => {
    const res = await POST(makeRequest({ ...validBody, artistId: 'not-a-uuid' }) as never);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/performances — IDOR protection', () => {
  it('returns 404 when artist does not belong to caller', async () => {
    mockState.artistMatches = false;
    const res = await POST(makeRequest(validBody) as never);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/artist/i);
  });

  it('returns 404 when one or more songs do not belong to caller', async () => {
    mockState.songMatchCount = 1;
    const res = await POST(makeRequest(validBody) as never);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/song/i);
  });
});

describe('POST /api/performances — happy path', () => {
  it('creates one row per song and returns 201', async () => {
    const res = await POST(makeRequest(validBody) as never);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.created).toBe(2);
    expect(body.performanceIds).toHaveLength(2);
  });

  it('writes source=manual + matchMethod=manual + status=confirmed', async () => {
    await POST(makeRequest(validBody) as never);
    const rows = mockInsertedRows.value as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.source).toBe('manual');
      expect(row.matchMethod).toBe('manual');
      expect(row.status).toBe('confirmed');
      expect(row.userId).toBe(USER_ID);
      expect(row.artistId).toBe(ARTIST_ID);
    }
  });

  it('applies user default times to inserted rows', async () => {
    await POST(makeRequest(validBody) as never);
    const rows = mockInsertedRows.value as Array<Record<string, unknown>>;
    expect(rows[0].startTimeHour).toBe('8');
    expect(rows[0].startTimeAmPm).toBe('PM');
    expect(rows[0].endTimeHour).toBe('11');
  });

  it('passes through venue + event metadata to inserted rows', async () => {
    await POST(makeRequest({ ...validBody, eventName: 'Coachella', tourName: 'Spring 26' }) as never);
    const rows = mockInsertedRows.value as Array<Record<string, unknown>>;
    expect(rows[0].venueName).toBe('The Echo');
    expect(rows[0].venueCity).toBe('Los Angeles');
    expect(rows[0].venueState).toBe('CA');
    expect(rows[0].eventName).toBe('Coachella');
    expect(rows[0].tourName).toBe('Spring 26');
  });

  it('calculates expiresAt 9 months out from eventDate (BMI deadline)', async () => {
    await POST(makeRequest(validBody) as never);
    const rows = mockInsertedRows.value as Array<Record<string, unknown>>;
    expect(rows[0].expiresAt).toBe('2027-01-15');
  });

  it('handles missing user defaults without crashing', async () => {
    mockState.userDefaults = null;
    const res = await POST(makeRequest(validBody) as never);
    expect(res.status).toBe(201);
    const rows = mockInsertedRows.value as Array<Record<string, unknown>>;
    expect(rows[0].startTimeHour).toBeNull();
  });
});
