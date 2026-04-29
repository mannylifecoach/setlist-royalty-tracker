import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockInserts } = vi.hoisted(() => ({
  mockInserts: { value: [] as Array<Record<string, unknown> | Record<string, unknown>[]> },
}));

vi.mock('@/db', () => ({
  db: {
    insert: () => ({
      values: (val: Record<string, unknown> | Record<string, unknown>[]) => {
        mockInserts.value.push(val);
        return Promise.resolve();
      },
    }),
  },
}));

import { recordStatusChange, recordStatusChanges } from './status-history';

const PERF_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('recordStatusChange — single', () => {
  beforeEach(() => {
    mockInserts.value = [];
  });

  it('inserts a row capturing the from/to/source for a forward transition', async () => {
    await recordStatusChange({
      performanceId: PERF_ID,
      userId: USER_ID,
      fromStatus: 'discovered',
      toStatus: 'confirmed',
      source: 'user',
    });
    expect(mockInserts.value).toHaveLength(1);
    expect(mockInserts.value[0]).toMatchObject({
      performanceId: PERF_ID,
      userId: USER_ID,
      fromStatus: 'discovered',
      toStatus: 'confirmed',
      source: 'user',
    });
  });

  // The reverse transitions exposed in the new performance-detail UI — one test
  // per path so a regression to any single arrow shows up as a named failure.
  const reversePaths = [
    { from: 'submitted', to: 'confirmed' },
    { from: 'submitted', to: 'discovered' },
    { from: 'confirmed', to: 'discovered' },
    { from: 'ineligible', to: 'discovered' },
  ] as const;

  for (const { from, to } of reversePaths) {
    it(`logs reverse path ${from} → ${to}`, async () => {
      await recordStatusChange({
        performanceId: PERF_ID,
        userId: USER_ID,
        fromStatus: from,
        toStatus: to,
        source: 'user',
      });
      expect(mockInserts.value[0]).toMatchObject({ fromStatus: from, toStatus: to, source: 'user' });
    });
  }

  it('accepts null fromStatus (e.g. row created with status defaulted)', async () => {
    await recordStatusChange({
      performanceId: PERF_ID,
      userId: USER_ID,
      fromStatus: null,
      toStatus: 'discovered',
      source: 'user',
    });
    expect(mockInserts.value[0]).toMatchObject({ fromStatus: null, toStatus: 'discovered' });
  });

  it('records extension as the source when the chrome extension marks submitted', async () => {
    await recordStatusChange({
      performanceId: PERF_ID,
      userId: USER_ID,
      fromStatus: 'confirmed',
      toStatus: 'submitted',
      source: 'extension',
    });
    expect(mockInserts.value[0]).toMatchObject({ source: 'extension' });
  });
});

describe('recordStatusChanges — bulk', () => {
  beforeEach(() => {
    mockInserts.value = [];
  });

  it('is a no-op when given an empty array (no SQL hit)', async () => {
    await recordStatusChanges([]);
    expect(mockInserts.value).toHaveLength(0);
  });

  it('inserts all rows in a single multi-row call', async () => {
    await recordStatusChanges([
      {
        performanceId: PERF_ID,
        userId: USER_ID,
        fromStatus: 'discovered',
        toStatus: 'confirmed',
        source: 'bulk',
      },
      {
        performanceId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        userId: USER_ID,
        fromStatus: 'discovered',
        toStatus: 'confirmed',
        source: 'bulk',
      },
    ]);
    expect(mockInserts.value).toHaveLength(1);
    expect(mockInserts.value[0]).toEqual(expect.arrayContaining([
      expect.objectContaining({ performanceId: PERF_ID, source: 'bulk' }),
      expect.objectContaining({ performanceId: 'cccccccc-cccc-cccc-cccc-cccccccccccc', source: 'bulk' }),
    ]));
  });
});
