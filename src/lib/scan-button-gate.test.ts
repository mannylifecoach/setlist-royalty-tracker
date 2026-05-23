import { describe, it, expect } from 'vitest';
import { canScanBandsintownNow, describeScanSkipReason } from './scan-button-gate';

describe('canScanBandsintownNow', () => {
  const base = {
    apiKey: 'key',
    artistSlug: 'tiffany-alvord',
    scanning: false,
    testing: false,
    saving: false,
  };

  it('returns true when both creds are filled and nothing else is in flight', () => {
    expect(canScanBandsintownNow(base)).toBe(true);
  });

  it('returns false when api key is empty', () => {
    expect(canScanBandsintownNow({ ...base, apiKey: '' })).toBe(false);
  });

  it('returns false when artist slug is empty', () => {
    expect(canScanBandsintownNow({ ...base, artistSlug: '' })).toBe(false);
  });

  it('returns false when both creds are empty', () => {
    expect(canScanBandsintownNow({ ...base, apiKey: '', artistSlug: '' })).toBe(false);
  });

  it('returns false during an active scan', () => {
    expect(canScanBandsintownNow({ ...base, scanning: true })).toBe(false);
  });

  it('returns false while test-connection is running', () => {
    expect(canScanBandsintownNow({ ...base, testing: true })).toBe(false);
  });

  it('returns false while save is in flight', () => {
    expect(canScanBandsintownNow({ ...base, saving: true })).toBe(false);
  });
});

describe('describeScanSkipReason', () => {
  it('humanizes cooldown_active with rounded-up hours', () => {
    // 64000s ≈ 17.78h → ceiling = 18h
    expect(describeScanSkipReason('cooldown_active:next_in_64000s')).toMatch(/about 18h/);
  });

  it('humanizes rate_limited with rounded-up minutes', () => {
    // 90s = 1.5min → ceiling = 2m
    expect(describeScanSkipReason('rate_limited:retry_after_90s')).toMatch(/about 2m/);
  });

  it('renders the 1h default retry-after cleanly', () => {
    expect(describeScanSkipReason('rate_limited:retry_after_3600s')).toMatch(/about 60m/);
  });

  it('strips the internal "bandsintown fetch failed:" prefix', () => {
    expect(describeScanSkipReason('bandsintown fetch failed: bad key')).toBe(
      'bandsintown error: bad key'
    );
  });

  it('passes through unmapped config-error reasons verbatim', () => {
    const raw = 'bandsintown slug "tiffany-alvord" does not match any tracked artist';
    expect(describeScanSkipReason(raw)).toBe(raw);
  });
});
