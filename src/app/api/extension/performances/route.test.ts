import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockUser, mockSelectChain } = vi.hoisted(() => ({
  mockUser: { value: null as { id: string; email: string } | null },
  mockSelectChain: {
    profile: null as Record<string, unknown> | null,
    rows: [] as unknown[],
    writers: [] as unknown[],
  },
}));

vi.mock('@/lib/api-key-auth', () => ({
  authenticateApiKey: vi.fn(async () => mockUser.value),
}));

// Build a "terminal-or-chainable" where() result so the same mock supports
// `from().where()` (awaited directly — used by user profile + joined rows
// selects) and `from().where().orderBy()` (awaited at the end — used by the
// writers select). Return a thenable that resolves to dataset and also exposes
// a chainable orderBy.
function thenableChain(dataset: unknown[]) {
  return {
    then: (resolve: (v: unknown[]) => void) => resolve(dataset),
    orderBy: () => Promise.resolve(dataset),
  };
}

// Per-call counter steers select() to the right mocked dataset (profile, then
// joined rows, then writers). The route's order of selects is fixed.
let selectCallIdx = 0;
vi.mock('@/db', () => ({
  db: {
    select: () => {
      const idx = selectCallIdx++;
      const dataset =
        idx === 0
          ? mockSelectChain.profile
            ? [mockSelectChain.profile]
            : []
          : idx === 1
            ? mockSelectChain.rows
            : mockSelectChain.writers;
      return {
        from: () => ({
          where: () => thenableChain(dataset),
          innerJoin: () => ({
            innerJoin: () => ({
              where: () => thenableChain(dataset),
            }),
          }),
        }),
      };
    },
  },
}));

import { GET } from './route';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const SONG_ID = '22222222-2222-2222-2222-222222222222';
const PERF_ID = '33333333-3333-3333-3333-333333333333';

function makeRequest(): unknown {
  // We only need the bits the route reads: headers + nextUrl.searchParams.
  return {
    headers: new Headers({ authorization: 'Bearer test-key' }),
    nextUrl: { searchParams: new URLSearchParams() },
  };
}

beforeEach(() => {
  selectCallIdx = 0;
  mockUser.value = null;
  mockSelectChain.profile = null;
  mockSelectChain.rows = [];
  mockSelectChain.writers = [];
});

describe('GET /api/extension/performances — auth', () => {
  it('returns 401 when API key is invalid', async () => {
    const res = await GET(makeRequest() as never);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('unauthorized');
  });
});

describe('GET /api/extension/performances — ASCAP fields', () => {
  beforeEach(() => {
    mockUser.value = { id: USER_ID, email: 'manny@example.com' };
    mockSelectChain.profile = {
      defaultStartTimeHour: '8:00',
      defaultStartTimeAmPm: 'PM',
      defaultEndTimeHour: '11:00',
      defaultEndTimeAmPm: 'PM',
      pro: 'ascap',
      ipi: '123456789',
      defaultRole: 'CA',
      publisherName: 'Manny Music',
      publisherIpi: '987654321',
      noPublisher: false,
    };
    mockSelectChain.rows = [
      {
        performance: {
          id: PERF_ID,
          eventDate: '2026-04-15',
          eventName: null,
          eventType: null,
          startTimeHour: null,
          startTimeAmPm: null,
          endTimeHour: null,
          endTimeAmPm: null,
          venueName: 'The Independent',
          venueAddress: null,
          venueCity: 'San Francisco',
          venueState: 'CA',
          venueCountry: 'US',
          venueZip: null,
          venuePhone: null,
          venueType: null,
          venueCapacity: null,
          attendance: null,
          ticketCharge: 'Yes',
        },
        song: {
          id: SONG_ID,
          title: 'Midnight Bass',
          bmiWorkId: 'BMI-1',
          ascapWorkId: 'ASCAP-1',
          isrc: 'USRC11234567',
          alternateTitles: ['Midnight Bass (Radio Edit)'],
          durationSeconds: 213,
          ascapRegisteredAt: null,
        },
        artist: { artistName: 'Manny' },
      },
    ];
    mockSelectChain.writers = [
      {
        id: 'w1',
        songId: SONG_ID,
        name: 'Manny Alboroto',
        ipi: '123456789',
        role: 'CA',
        sharePercent: '50.00',
      },
    ];
  });

  it('returns the user ASCAP profile at the top level', async () => {
    const res = await GET(makeRequest() as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toEqual({
      pro: 'ascap',
      ipi: '123456789',
      defaultRole: 'CA',
      publisherName: 'Manny Music',
      publisherIpi: '987654321',
      noPublisher: false,
    });
  });

  it('includes co-writers, isrc, alternateTitles, durationSeconds, ascapWorkId per song', async () => {
    const res = await GET(makeRequest() as never);
    const body = await res.json();
    const song = body.events[0].songs[0];
    expect(song).toMatchObject({
      title: 'Midnight Bass',
      ascapWorkId: 'ASCAP-1',
      isrc: 'USRC11234567',
      alternateTitles: ['Midnight Bass (Radio Edit)'],
      durationSeconds: 213,
      ascapRegisteredAt: null,
      coWriters: [
        { name: 'Manny Alboroto', ipi: '123456789', role: 'CA', sharePercent: 50 },
      ],
    });
  });

  it('derives ticketFee=true when ticketCharge is "Yes"', async () => {
    const res = await GET(makeRequest() as never);
    const body = await res.json();
    expect(body.events[0].ticketFee).toBe(true);
  });

  it('defaults perfType to "CNCRT" and advanceTickets to false', async () => {
    const res = await GET(makeRequest() as never);
    const body = await res.json();
    expect(body.events[0].perfType).toBe('CNCRT');
    expect(body.events[0].advanceTickets).toBe(false);
    expect(body.events[0].liveStreamViews).toBeNull();
  });

  it('preserves existing BMI shape — events array with bmiWorkId per song', async () => {
    const res = await GET(makeRequest() as never);
    const body = await res.json();
    expect(Array.isArray(body.events)).toBe(true);
    expect(body.events[0].songs[0].bmiWorkId).toBe('BMI-1');
    expect(body.events[0].attendanceRange).toBeDefined();
  });
});

describe('GET /api/extension/performances — empty/edge cases', () => {
  it('handles user with no performances and no profile fields', async () => {
    mockUser.value = { id: USER_ID, email: 'newbie@example.com' };
    mockSelectChain.profile = null;
    mockSelectChain.rows = [];
    mockSelectChain.writers = [];
    const res = await GET(makeRequest() as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.events).toEqual([]);
    expect(body.user).toEqual({
      pro: null,
      ipi: null,
      defaultRole: null,
      publisherName: null,
      publisherIpi: null,
      noPublisher: false,
    });
  });
});
