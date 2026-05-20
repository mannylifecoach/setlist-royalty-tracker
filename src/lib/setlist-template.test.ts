import { describe, it, expect, vi, beforeEach } from 'vitest';

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SONG_A = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SONG_B = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const SONG_C = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

const { mockUserTemplate } = vi.hoisted(() => ({
  mockUserTemplate: { value: null as string[] | null },
}));

let dbSelectCalls = 0;
vi.mock('@/db', () => ({
  db: {
    select: () => {
      dbSelectCalls++;
      return {
        from: () => ({
          where: () => ({
            then: (resolve: (v: unknown[]) => void) =>
              resolve(
                mockUserTemplate.value === null
                  ? []
                  : [{ defaultSetlistSongIds: mockUserTemplate.value }]
              ),
          }),
        }),
      };
    },
  },
}));

import { resolveCandidateSongIds } from './setlist-template';

beforeEach(() => {
  dbSelectCalls = 0;
  mockUserTemplate.value = null;
});

describe('resolveCandidateSongIds', () => {
  it('returns provided ids as-is when caller passes a non-empty array (no DB call)', async () => {
    mockUserTemplate.value = [SONG_C]; // would be wrong if used
    const result = await resolveCandidateSongIds(USER_ID, [SONG_A, SONG_B]);
    expect(result).toEqual([SONG_A, SONG_B]);
    expect(dbSelectCalls).toBe(0);
  });

  it('falls back to template when provided is undefined', async () => {
    mockUserTemplate.value = [SONG_A, SONG_B];
    const result = await resolveCandidateSongIds(USER_ID, undefined);
    expect(result).toEqual([SONG_A, SONG_B]);
    expect(dbSelectCalls).toBe(1);
  });

  it('falls back to template when provided is an empty array', async () => {
    mockUserTemplate.value = [SONG_A, SONG_B, SONG_C];
    const result = await resolveCandidateSongIds(USER_ID, []);
    expect(result).toEqual([SONG_A, SONG_B, SONG_C]);
  });

  it('returns empty array when user has no template configured (null in DB)', async () => {
    mockUserTemplate.value = null;
    const result = await resolveCandidateSongIds(USER_ID, undefined);
    expect(result).toEqual([]);
  });

  it('returns empty array when user has an empty template (empty array in DB)', async () => {
    mockUserTemplate.value = [];
    const result = await resolveCandidateSongIds(USER_ID, undefined);
    expect(result).toEqual([]);
  });

  it('returns empty array when the user row does not exist', async () => {
    // mockUserTemplate stays null → mock returns []
    const result = await resolveCandidateSongIds(USER_ID, []);
    expect(result).toEqual([]);
  });
});
