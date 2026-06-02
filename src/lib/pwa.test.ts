// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { chooseVerifyLayout, isStandalonePWA } from './pwa';

describe('chooseVerifyLayout', () => {
  it('leads with the code inside an installed PWA (link would break out of the app)', () => {
    expect(chooseVerifyLayout({ isStandalone: true })).toBe('code-first');
  });

  it('leads with the magic link in a normal browser tab', () => {
    expect(chooseVerifyLayout({ isStandalone: false })).toBe('link-first');
  });
});

describe('isStandalonePWA', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // happy-dom default has no `standalone` flag; clean up if a test set one.
    delete (navigator as unknown as { standalone?: boolean }).standalone;
  });

  it('returns false in a normal browser tab (no media match, no iOS flag)', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
    } as MediaQueryList);
    expect(isStandalonePWA()).toBe(false);
  });

  it('returns true when display-mode: standalone matches', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
    } as MediaQueryList);
    expect(isStandalonePWA()).toBe(true);
  });

  it('returns true on iOS when navigator.standalone is set, even without the media query', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
    } as MediaQueryList);
    (navigator as unknown as { standalone?: boolean }).standalone = true;
    expect(isStandalonePWA()).toBe(true);
  });
});
