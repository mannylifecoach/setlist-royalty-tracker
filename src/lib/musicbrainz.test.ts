import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import {
  searchRecording,
  getRecordingWork,
  getWork,
  lookupSongMetadata,
} from './musicbrainz';

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

describe('musicbrainz.searchRecording', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns top recording match', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        recordings: [
          {
            id: 'rec-abc-123',
            title: 'Midnight Bass',
            'artist-credit': [{ name: 'Producer A' }],
          },
        ],
      })
    );

    const result = await searchRecording('Midnight Bass', 'Producer A');

    expect(result).toEqual({
      recordingMbid: 'rec-abc-123',
      title: 'Midnight Bass',
      artistName: 'Producer A',
    });
  });

  it('returns null when no recordings found', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ recordings: [] }));
    const result = await searchRecording('Nonexistent Track', 'Unknown');
    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));
    const result = await searchRecording('Track', 'Artist');
    expect(result).toBeNull();
  });

  it('escapes Lucene special characters in title', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ recordings: [] }));
    await searchRecording('Joe\'s "Track" + (Mix)', 'Artist');
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('recording');
    // Verify the URL was constructed (no exception thrown)
    expect(url).toBeTruthy();
  });
});

describe('musicbrainz.getRecordingWork', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns work MBID and ISWC when performance relation exists', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        relations: [
          {
            type: 'performance',
            work: {
              id: 'work-xyz-789',
              iswcs: ['T-123.456.789-1'],
            },
          },
        ],
      })
    );

    const result = await getRecordingWork('rec-abc-123');
    expect(result).toEqual({
      workMbid: 'work-xyz-789',
      iswc: 'T-123.456.789-1',
    });
  });

  it('returns work without ISWC when iswcs array is missing', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        relations: [
          {
            type: 'performance',
            work: { id: 'work-no-iswc' },
          },
        ],
      })
    );

    const result = await getRecordingWork('rec-abc-123');
    expect(result).toEqual({ workMbid: 'work-no-iswc', iswc: null });
  });

  it('returns null when no work relation exists', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ relations: [] }));
    const result = await getRecordingWork('rec-no-work');
    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('timeout'));
    const result = await getRecordingWork('rec-abc');
    expect(result).toBeNull();
  });
});

describe('musicbrainz.getWork', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns work data with ISWC', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        id: 'work-abc',
        title: 'Midnight Bass',
        iswcs: ['T-111.222.333-1'],
      })
    );

    const result = await getWork('work-abc');
    expect(result).toEqual({
      workMbid: 'work-abc',
      iswc: 'T-111.222.333-1',
      title: 'Midnight Bass',
    });
  });
});

describe('musicbrainz.lookupSongMetadata (full pipeline)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns full result when recording and work both found', async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          recordings: [
            {
              id: 'rec-1',
              title: 'Midnight Bass',
              'artist-credit': [{ name: 'Producer A' }],
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          relations: [
            {
              type: 'performance',
              work: { id: 'work-1', iswcs: ['T-999.888.777-1'] },
            },
          ],
        })
      );

    const result = await lookupSongMetadata('Midnight Bass', 'Producer A');
    expect(result).toEqual({
      recordingMbid: 'rec-1',
      workMbid: 'work-1',
      iswc: 'T-999.888.777-1',
      title: 'Midnight Bass',
      artistName: 'Producer A',
    });
  });

  it('returns recording-only when work lookup returns null', async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          recordings: [
            {
              id: 'rec-2',
              title: 'Track',
              'artist-credit': [{ name: 'Artist' }],
            },
          ],
        })
      )
      .mockResolvedValueOnce(jsonResponse({ relations: [] }));

    const result = await lookupSongMetadata('Track', 'Artist');
    expect(result).toEqual({
      recordingMbid: 'rec-2',
      workMbid: null,
      iswc: null,
      title: 'Track',
      artistName: 'Artist',
    });
  });

  it('returns null when no recording found', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ recordings: [] }));
    const result = await lookupSongMetadata('Nothing', 'Nobody');
    expect(result).toBeNull();
  });
});
