import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { lookupWorkIdsByIswc } from './songview';

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

describe('songview.lookupWorkIdsByIswc', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns BMI and ASCAP work IDs when both found', async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({ TableData: [{ WorkID: 'BMI-12345' }] })
      )
      .mockResolvedValueOnce(
        jsonResponse({ results: [{ ascapWorkId: 'ASCAP-67890' }] })
      );

    const result = await lookupWorkIdsByIswc('T-123.456.789-1');
    expect(result.bmiWorkId).toBe('BMI-12345');
    expect(result.ascapWorkId).toBe('ASCAP-67890');
  });

  it('returns null for ASCAP when only BMI found', async () => {
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({ TableData: [{ WorkID: 'BMI-only' }] })
      )
      .mockResolvedValueOnce(jsonResponse({ results: [] }));

    const result = await lookupWorkIdsByIswc('T-111.222.333-1');
    expect(result.bmiWorkId).toBe('BMI-only');
    expect(result.ascapWorkId).toBeNull();
  });

  it('returns null for both when nothing found', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ TableData: [] }))
      .mockResolvedValueOnce(jsonResponse({ results: [] }));

    const result = await lookupWorkIdsByIswc('T-000.000.000-0');
    expect(result.bmiWorkId).toBeNull();
    expect(result.ascapWorkId).toBeNull();
  });

  it('handles network errors gracefully', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('bmi down'))
      .mockRejectedValueOnce(new Error('ascap down'));

    const result = await lookupWorkIdsByIswc('T-555.555.555-5');
    expect(result.bmiWorkId).toBeNull();
    expect(result.ascapWorkId).toBeNull();
  });

  it('handles non-ok responses', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 503 });

    const result = await lookupWorkIdsByIswc('T-999.999.999-9');
    expect(result.bmiWorkId).toBeNull();
    expect(result.ascapWorkId).toBeNull();
  });
});
