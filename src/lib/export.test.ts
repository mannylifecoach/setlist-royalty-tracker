import { describe, it, expect } from 'vitest';
import { getMissingFields } from './export';

const baseRow = {
  performance: {
    venueName: 'The Independent',
    venueCity: 'San Francisco',
    venueState: 'CA',
  },
  song: {
    bmiWorkId: '12345',
    ascapWorkId: '67890',
  },
};

describe('getMissingFields — BMI', () => {
  it('returns empty when name + city + state are filled, regardless of address/phone/attendance/work-id', () => {
    const row = {
      performance: { ...baseRow.performance },
      song: { ...baseRow.song, bmiWorkId: null },
    };
    expect(getMissingFields(row, 'bmi')).toEqual([]);
  });

  // The screenshot scenario: a venue-address-missing performance must be GREEN for BMI users.
  // BMI Live's "previously performed venues" lookup or create-new-venue Google Places fill
  // handles address at submit time — it's never our blocker.
  it('is green when venue address is missing (BMI auto-fills it via the wizard)', () => {
    const row = {
      performance: { venueName: 'The Independent', venueCity: 'San Francisco', venueState: 'CA' },
      song: { ...baseRow.song },
    };
    expect(getMissingFields(row, 'bmi')).toEqual([]);
  });

  it('is green when ticket charge is missing (optional in BMI)', () => {
    // ticket charge is performance-level, not in the row shape — included here for parity
    // with the screenshot's "missing: venue address, ticket charge" copy.
    const row = { performance: { ...baseRow.performance }, song: { ...baseRow.song } };
    expect(getMissingFields(row, 'bmi')).toEqual([]);
  });

  it('flags venue name when missing', () => {
    const row = {
      performance: { ...baseRow.performance, venueName: null },
      song: { ...baseRow.song },
    };
    expect(getMissingFields(row, 'bmi')).toContain('venue name');
  });

  it('flags venue city + state when missing', () => {
    const row = {
      performance: { venueName: 'Foo', venueCity: null, venueState: null },
      song: { ...baseRow.song },
    };
    const missing = getMissingFields(row, 'bmi');
    expect(missing).toContain('venue city');
    expect(missing).toContain('venue state');
  });
});

describe('getMissingFields — ASCAP', () => {
  it('flags missing ASCAP work id', () => {
    const row = {
      performance: { ...baseRow.performance },
      song: { ...baseRow.song, ascapWorkId: null },
    };
    expect(getMissingFields(row, 'ascap')).toContain('ascap work id');
  });

  it('does not flag venue city for ASCAP (state alone is enough)', () => {
    const row = {
      performance: { venueName: 'Foo', venueCity: null, venueState: 'CA' },
      song: { ...baseRow.song },
    };
    expect(getMissingFields(row, 'ascap')).toEqual([]);
  });
});
