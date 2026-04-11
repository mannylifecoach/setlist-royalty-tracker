import { describe, it, expect } from 'vitest';
import {
  getProsForCountry,
  COUNTRY_PROS,
  ALL_PROS,
  CAPABILITY_OPTIONS,
  mapAttendanceToBmiRange,
  BMI_ATTENDANCE_RANGES,
} from './constants';

describe('getProsForCountry', () => {
  it('returns US PROs for US', () => {
    expect(getProsForCountry('US')).toEqual(['bmi', 'ascap', 'sesac', 'gmr']);
  });

  it('returns PRS for GB', () => {
    expect(getProsForCountry('GB')).toEqual(['prs']);
  });

  it('returns SOCAN for CA', () => {
    expect(getProsForCountry('CA')).toEqual(['socan']);
  });

  it('returns APRA for AU', () => {
    expect(getProsForCountry('AU')).toEqual(['apra']);
  });

  it('returns all PROs for unknown country', () => {
    const result = getProsForCountry('ZZ');
    expect(result).toHaveLength(ALL_PROS.length);
    expect(result).toContain('bmi');
    expect(result).toContain('prs');
  });

  it('returns all PROs for null/undefined country', () => {
    expect(getProsForCountry(null)).toHaveLength(ALL_PROS.length);
    expect(getProsForCountry(undefined)).toHaveLength(ALL_PROS.length);
  });

  it('each country maps to at least one PRO', () => {
    for (const country of Object.keys(COUNTRY_PROS)) {
      const pros = COUNTRY_PROS[country];
      expect(pros.length).toBeGreaterThan(0);
    }
  });
});

describe('CAPABILITY_OPTIONS', () => {
  it('has exactly five capability options', () => {
    expect(CAPABILITY_OPTIONS).toHaveLength(5);
  });

  it('each option has value, label, and desc', () => {
    for (const opt of CAPABILITY_OPTIONS) {
      expect(opt.value).toBeTruthy();
      expect(opt.label).toBeTruthy();
      expect(opt.desc).toBeTruthy();
    }
  });

  it('values are the expected strings', () => {
    const values = CAPABILITY_OPTIONS.map((o) => o.value);
    expect(values).toContain('write');
    expect(values).toContain('perform');
    expect(values).toContain('dj');
    expect(values).toContain('produce');
    expect(values).toContain('publish');
  });
});

describe('mapAttendanceToBmiRange (regression)', () => {
  // Make sure existing behavior didn't break after constant reshuffling
  it('maps 100 to "0 - 250"', () => {
    expect(mapAttendanceToBmiRange(100)).toBe('0 - 250');
  });

  it('maps 500 to "251 - 1000"', () => {
    expect(mapAttendanceToBmiRange(500)).toBe('251 - 1000');
  });

  it('maps 2000 to "1001 - 5000"', () => {
    expect(mapAttendanceToBmiRange(2000)).toBe('1001 - 5000');
  });

  it('maps 10000 to "5001+"', () => {
    expect(mapAttendanceToBmiRange(10000)).toBe('5001+');
  });

  it('has 4 BMI attendance ranges', () => {
    expect(BMI_ATTENDANCE_RANGES).toHaveLength(4);
  });
});
