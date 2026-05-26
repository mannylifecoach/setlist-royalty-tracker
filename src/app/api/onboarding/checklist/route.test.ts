import { describe, it, expect, vi, beforeEach } from 'vitest';

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const { mockSession, mockCounts } = vi.hoisted(() => ({
  mockSession: { value: null as { user: { id: string; email: string } } | null },
  mockCounts: {
    artistCount: 0,
    songCount: 0,
    linkedSongCount: 0,
    scanCount: 0,
    perfCount: 0,
    confirmedPerfCount: 0,
    submittedPerfCount: 0,
    apiKey: null as string | null,
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => mockSession.value),
}));

// Track which select() call is which by counting them in order. The route
// fires the queries in a fixed sequence via Promise.all, so a counter is
// enough to map each call to the right mock value.
let selectCallIndex = 0;
const SELECT_ORDER = [
  'artistCount',
  'songCount',
  'linkedSongCount',
  'scanCount',
  'perfCount',
  'confirmedPerfCount',
  'submittedPerfCount',
  'apiKey',
] as const;

vi.mock('@/db', () => {
  // Each db.select() call here returns a thenable chain that ultimately
  // resolves to the right mock value based on call order.
  return {
    db: {
      select: () => {
        const idx = selectCallIndex++;
        const key = SELECT_ORDER[idx];
        const result =
          key === 'apiKey'
            ? [{ apiKey: mockCounts.apiKey }]
            : [{ c: mockCounts[key as keyof typeof mockCounts] }];
        return {
          from: () => ({
            where: () => Promise.resolve(result),
            innerJoin: () => ({
              where: () => Promise.resolve(result),
            }),
          }),
        };
      },
    },
  };
});

import { GET } from './route';

beforeEach(() => {
  mockSession.value = { user: { id: USER_ID, email: 'test@example.com' } };
  mockCounts.artistCount = 0;
  mockCounts.songCount = 0;
  mockCounts.linkedSongCount = 0;
  mockCounts.scanCount = 0;
  mockCounts.perfCount = 0;
  mockCounts.confirmedPerfCount = 0;
  mockCounts.submittedPerfCount = 0;
  mockCounts.apiKey = null;
  selectCallIndex = 0;
});

describe('GET /api/onboarding/checklist — auth', () => {
  it('returns 401 when no session', async () => {
    mockSession.value = null;
    const res = await GET();
    expect(res.status).toBe(401);
  });
});

describe('GET /api/onboarding/checklist — empty state (brand new user)', () => {
  it('returns 7 items all undone for a user with nothing yet', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(7);
    expect(body.completed).toBe(0);
    expect(body.items).toHaveLength(7);
    expect(body.items.every((i: { done: boolean }) => !i.done)).toBe(true);
  });

  it('every item has id + label + href, and links go to the right pages', async () => {
    const res = await GET();
    const body = await res.json();
    const expected = [
      { id: 'add-artist', href: '/artists' },
      { id: 'register-song', href: '/songs' },
      { id: 'link-song-artist', href: '/songs' },
      { id: 'find-perf', href: '/performances' },
      { id: 'confirm-perf', href: '/performances' },
      { id: 'install-ext', href: '/settings' },
      { id: 'file-perf', href: '/export' },
    ];
    expect(body.items.map((i: { id: string; href: string }) => ({ id: i.id, href: i.href }))).toEqual(expected);
    expect(body.items.every((i: { label: string }) => i.label.length > 0)).toBe(true);
  });
});

describe('GET /api/onboarding/checklist — per-item state derivation', () => {
  it('checks "add-artist" when trackedArtists count > 0', async () => {
    mockCounts.artistCount = 1;
    const body = await (await GET()).json();
    expect(body.items.find((i: { id: string }) => i.id === 'add-artist').done).toBe(true);
    expect(body.completed).toBe(1);
  });

  it('checks "register-song" when songs count > 0', async () => {
    mockCounts.songCount = 1;
    const body = await (await GET()).json();
    expect(body.items.find((i: { id: string }) => i.id === 'register-song').done).toBe(true);
  });

  it('checks "link-song-artist" when songArtists join count > 0', async () => {
    mockCounts.linkedSongCount = 1;
    const body = await (await GET()).json();
    expect(body.items.find((i: { id: string }) => i.id === 'link-song-artist').done).toBe(true);
  });

  it('checks "find-perf" when EITHER scanLog OR performances > 0 (any discovery path counts)', async () => {
    mockCounts.scanCount = 0;
    mockCounts.perfCount = 1;
    const body1 = await (await GET()).json();
    expect(body1.items.find((i: { id: string }) => i.id === 'find-perf').done).toBe(true);

    selectCallIndex = 0;
    mockCounts.scanCount = 1;
    mockCounts.perfCount = 0;
    const body2 = await (await GET()).json();
    expect(body2.items.find((i: { id: string }) => i.id === 'find-perf').done).toBe(true);
  });

  it('checks "confirm-perf" when at least one performance is confirmed or submitted', async () => {
    mockCounts.confirmedPerfCount = 1;
    const body = await (await GET()).json();
    expect(body.items.find((i: { id: string }) => i.id === 'confirm-perf').done).toBe(true);
  });

  it('checks "install-ext" when the user has generated an API key (proxy for extension setup)', async () => {
    mockCounts.apiKey = 'srt_abc123';
    const body = await (await GET()).json();
    expect(body.items.find((i: { id: string }) => i.id === 'install-ext').done).toBe(true);
  });

  it('checks "file-perf" only when a performance has status=submitted', async () => {
    mockCounts.confirmedPerfCount = 1; // confirmed alone shouldn't trigger this one
    const body = await (await GET()).json();
    expect(body.items.find((i: { id: string }) => i.id === 'file-perf').done).toBe(false);

    selectCallIndex = 0;
    mockCounts.submittedPerfCount = 1;
    const body2 = await (await GET()).json();
    expect(body2.items.find((i: { id: string }) => i.id === 'file-perf').done).toBe(true);
  });
});

describe('GET /api/onboarding/checklist — completion summary', () => {
  it('returns completed === total when every signal is set', async () => {
    mockCounts.artistCount = 1;
    mockCounts.songCount = 1;
    mockCounts.linkedSongCount = 1;
    mockCounts.scanCount = 1;
    mockCounts.perfCount = 1;
    mockCounts.confirmedPerfCount = 1;
    mockCounts.submittedPerfCount = 1;
    mockCounts.apiKey = 'srt_full';
    const body = await (await GET()).json();
    expect(body.completed).toBe(7);
    expect(body.total).toBe(7);
    expect(body.items.every((i: { done: boolean }) => i.done)).toBe(true);
  });

  it('completed reflects partial progress (3 of 7 mid-onboarding)', async () => {
    mockCounts.artistCount = 1; // 1
    mockCounts.songCount = 1; // 2
    mockCounts.linkedSongCount = 1; // 3
    const body = await (await GET()).json();
    expect(body.completed).toBe(3);
    expect(body.total).toBe(7);
  });
});
