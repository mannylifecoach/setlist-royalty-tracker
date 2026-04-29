import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockUser, mockProfile, mockSongs, mockWriters } = vi.hoisted(() => ({
  mockUser: { value: null as { id: string; email: string } | null },
  mockProfile: { value: null as Record<string, unknown> | null },
  mockSongs: { value: [] as Record<string, unknown>[] },
  mockWriters: { value: [] as Record<string, unknown>[] },
}));

vi.mock('@/lib/api-key-auth', () => ({
  authenticateApiKey: vi.fn(async () => mockUser.value),
}));

// Build a "terminal-or-chainable" where() result so the same mock supports
// `from().where()` (awaited directly — used by the user profile select) and
// `from().where().orderBy()` (awaited at the end — used by the songs and
// writers selects). The trick: return a thenable object that is itself a
// resolved-with-dataset Promise AND exposes a chainable orderBy.
function thenableChain(dataset: unknown[]) {
  return {
    then: (resolve: (v: unknown[]) => void) => resolve(dataset),
    orderBy: () => Promise.resolve(dataset),
  };
}

let selectCallIdx = 0;
vi.mock('@/db', () => ({
  db: {
    select: () => {
      const idx = selectCallIdx++;
      const dataset =
        idx === 0
          ? mockProfile.value
            ? [mockProfile.value]
            : []
          : idx === 1
            ? mockSongs.value
            : mockWriters.value;
      return {
        from: () => ({
          where: () => thenableChain(dataset),
        }),
      };
    },
  },
}));

import { GET } from './route';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const SONG_A = '22222222-2222-2222-2222-222222222222';
const SONG_B = '33333333-3333-3333-3333-333333333333';

function makeRequest(): unknown {
  return {
    headers: new Headers({ authorization: 'Bearer test-key' }),
  };
}

beforeEach(() => {
  selectCallIdx = 0;
  mockUser.value = null;
  mockProfile.value = null;
  mockSongs.value = [];
  mockWriters.value = [];
});

describe('GET /api/extension/works-registration — auth', () => {
  it('returns 401 when API key is invalid', async () => {
    const res = await GET(makeRequest() as never);
    expect(res.status).toBe(401);
  });
});

describe('GET /api/extension/works-registration — happy path', () => {
  beforeEach(() => {
    mockUser.value = { id: USER_ID, email: 'manny@example.com' };
    mockProfile.value = {
      ipi: '123456789',
      defaultRole: 'CA',
      publisherName: 'Manny Music',
      publisherIpi: '987654321',
      noPublisher: false,
    };
    mockSongs.value = [
      {
        id: SONG_A,
        title: 'Midnight Bass',
        alternateTitles: ['Midnight Bass (Radio Edit)'],
        isrc: 'USRC11234567',
        durationSeconds: 213,
        recordingMbid: 'rec-1',
        workMbid: 'work-1',
        iswc: 'T-123',
      },
      {
        id: SONG_B,
        title: 'Sunrise Anthem',
        alternateTitles: null,
        isrc: null,
        durationSeconds: null,
        recordingMbid: null,
        workMbid: null,
        iswc: null,
      },
    ];
    mockWriters.value = [
      { id: 'w1', songId: SONG_A, name: 'Manny', ipi: '123456789', role: 'CA', sharePercent: '50.00' },
      { id: 'w2', songId: SONG_B, name: 'Manny', ipi: '123456789', role: 'CA', sharePercent: '25.00' },
      { id: 'w3', songId: SONG_B, name: 'Co-writer', ipi: '999999999', role: 'A', sharePercent: '25.00' },
    ];
  });

  it('returns user profile + unregistered songs with writers', async () => {
    const res = await GET(makeRequest() as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toEqual({
      ipi: '123456789',
      defaultRole: 'CA',
      publisherName: 'Manny Music',
      publisherIpi: '987654321',
      noPublisher: false,
    });
    expect(body.songs).toHaveLength(2);
  });

  it('attaches the right writers to each song (no cross-contamination)', async () => {
    const res = await GET(makeRequest() as never);
    const body = await res.json();
    const songA = body.songs.find((s: { id: string }) => s.id === SONG_A);
    const songB = body.songs.find((s: { id: string }) => s.id === SONG_B);
    expect(songA.writers).toHaveLength(1);
    expect(songA.writers[0].name).toBe('Manny');
    expect(songB.writers).toHaveLength(2);
    // sharePercent comes back as a number, not a string
    expect(songB.writers[0].sharePercent).toBe(25);
    expect(songB.writers[1].sharePercent).toBe(25);
  });

  it('exposes recordingMbid + workMbid + iswc when MusicBrainz enrichment populated them', async () => {
    const res = await GET(makeRequest() as never);
    const body = await res.json();
    const songA = body.songs.find((s: { id: string }) => s.id === SONG_A);
    expect(songA.recordingMbid).toBe('rec-1');
    expect(songA.workMbid).toBe('work-1');
    expect(songA.iswc).toBe('T-123');
  });
});

describe('GET /api/extension/works-registration — empty', () => {
  it('returns empty songs array + null profile fields when nothing registered', async () => {
    mockUser.value = { id: USER_ID, email: 'newbie@example.com' };
    mockProfile.value = null;
    mockSongs.value = [];
    mockWriters.value = [];
    const res = await GET(makeRequest() as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.songs).toEqual([]);
    expect(body.user.ipi).toBeNull();
  });

  it('returns empty array when user has only ASCAP-registered songs (none unregistered)', async () => {
    // The route's WHERE clause filters to ascap_registered_at IS NULL, so the
    // db mock simply returns nothing and we trust the SQL — assert the empty
    // payload shape.
    mockUser.value = { id: USER_ID, email: 'manny@example.com' };
    mockProfile.value = { ipi: '1', defaultRole: 'CA', publisherName: null, publisherIpi: null, noPublisher: true };
    mockSongs.value = [];
    mockWriters.value = [];
    const res = await GET(makeRequest() as never);
    const body = await res.json();
    expect(body.songs).toEqual([]);
    expect(body.user.noPublisher).toBe(true);
  });
});
