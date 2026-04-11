import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./musicbrainz', () => ({
  lookupSongMetadata: vi.fn(),
}));
vi.mock('./songview', () => ({
  lookupWorkIdsByIswc: vi.fn(),
}));

const { mockSongRows, mockArtistRows, mockUpdate } = vi.hoisted(() => {
  return {
    mockSongRows: { value: [] as Record<string, unknown>[] },
    mockArtistRows: { value: [] as Record<string, unknown>[] },
    mockUpdate: vi.fn(),
  };
});

vi.mock('@/db', () => ({
  db: {
    select: () => ({
      from: (table: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tableName = (table as any)?.[Symbol.for('drizzle:Name')] || String(table);
        if (tableName.includes('song_artists')) {
          return {
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockArtistRows.value),
              }),
            }),
          };
        }
        return {
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockSongRows.value),
          }),
        };
      },
    }),
    update: () => ({
      set: (data: unknown) => {
        mockUpdate(data);
        return { where: vi.fn().mockResolvedValue(undefined) };
      },
    }),
  },
}));

import { enrichSongMetadata } from './song-enrichment';
import { lookupSongMetadata } from './musicbrainz';
import { lookupWorkIdsByIswc } from './songview';

const mockMb = vi.mocked(lookupSongMetadata);
const mockSv = vi.mocked(lookupWorkIdsByIswc);

const SONG_ID = '11111111-1111-1111-1111-111111111111';
const USER_ID = '22222222-2222-2222-2222-222222222222';

describe('enrichSongMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSongRows.value = [];
    mockArtistRows.value = [];
  });

  it('throws when song is not found', async () => {
    mockSongRows.value = [];
    await expect(enrichSongMetadata(SONG_ID, USER_ID)).rejects.toThrow(
      'Song not found'
    );
  });

  it('returns none source when song has no linked artists', async () => {
    mockSongRows.value = [
      { id: SONG_ID, userId: USER_ID, title: 'Test', recordingMbid: null, workMbid: null, iswc: null, bmiWorkId: null, ascapWorkId: null },
    ];
    mockArtistRows.value = [];

    const result = await enrichSongMetadata(SONG_ID, USER_ID);
    expect(result.source).toBe('none');
    expect(mockMb).not.toHaveBeenCalled();
  });

  it('returns musicbrainz source when MB returns full result', async () => {
    mockSongRows.value = [
      { id: SONG_ID, userId: USER_ID, title: 'Midnight Bass', recordingMbid: null, workMbid: null, iswc: null, bmiWorkId: null, ascapWorkId: null },
    ];
    mockArtistRows.value = [{ artist: { artistName: 'Producer A' } }];
    mockMb.mockResolvedValue({
      recordingMbid: 'rec-1',
      workMbid: 'work-1',
      iswc: 'T-123',
      title: 'Midnight Bass',
      artistName: 'Producer A',
    });
    mockSv.mockResolvedValue({ bmiWorkId: 'BMI-1', ascapWorkId: 'ASCAP-1' });

    const result = await enrichSongMetadata(SONG_ID, USER_ID);

    expect(result.source).toBe('musicbrainz');
    expect(result.workMbid).toBe('work-1');
    expect(result.iswc).toBe('T-123');
    expect(result.bmiWorkId).toBe('BMI-1');
    expect(result.ascapWorkId).toBe('ASCAP-1');
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('does not overwrite user-entered values', async () => {
    mockSongRows.value = [
      {
        id: SONG_ID,
        userId: USER_ID,
        title: 'Track',
        recordingMbid: null,
        workMbid: null,
        iswc: 'USER-ENTERED-ISWC',
        bmiWorkId: 'USER-BMI',
        ascapWorkId: 'USER-ASCAP',
      },
    ];
    mockArtistRows.value = [{ artist: { artistName: 'Artist' } }];
    mockMb.mockResolvedValue({
      recordingMbid: 'rec',
      workMbid: 'work',
      iswc: 'MB-ISWC',
      title: 'Track',
      artistName: 'Artist',
    });
    mockSv.mockResolvedValue({ bmiWorkId: 'NEW-BMI', ascapWorkId: 'NEW-ASCAP' });

    await enrichSongMetadata(SONG_ID, USER_ID);

    // Verify user values were preserved (not in update payload)
    const updateCall = mockUpdate.mock.calls[0]?.[0];
    expect(updateCall.iswc).toBeUndefined(); // Not updated
    expect(updateCall.bmiWorkId).toBeUndefined(); // Not updated
    expect(updateCall.ascapWorkId).toBeUndefined(); // Not updated
    expect(updateCall.workMbid).toBe('work'); // Was null, gets filled
  });

  it('returns none source when MB returns nothing', async () => {
    mockSongRows.value = [
      { id: SONG_ID, userId: USER_ID, title: 'Obscure', recordingMbid: null, workMbid: null, iswc: null, bmiWorkId: null, ascapWorkId: null },
    ];
    mockArtistRows.value = [{ artist: { artistName: 'Bedroom Producer' } }];
    mockMb.mockResolvedValue(null);

    const result = await enrichSongMetadata(SONG_ID, USER_ID);
    expect(result.source).toBe('none');
  });

  it('returns partial source when MB returns recording but no work', async () => {
    mockSongRows.value = [
      { id: SONG_ID, userId: USER_ID, title: 'Track', recordingMbid: null, workMbid: null, iswc: null, bmiWorkId: null, ascapWorkId: null },
    ];
    mockArtistRows.value = [{ artist: { artistName: 'Artist' } }];
    mockMb.mockResolvedValue({
      recordingMbid: 'rec-only',
      workMbid: null,
      iswc: null,
      title: 'Track',
      artistName: 'Artist',
    });

    const result = await enrichSongMetadata(SONG_ID, USER_ID);
    expect(result.source).toBe('partial');
    expect(result.recordingMbid).toBe('rec-only');
  });
});
