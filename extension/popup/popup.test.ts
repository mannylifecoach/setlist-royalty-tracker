import { describe, it, expect } from 'vitest';
import { detectRoute } from './popup-route';

describe('detectRoute', () => {
  it('returns neutral for undefined / empty url', () => {
    expect(detectRoute(undefined)).toEqual({ kind: 'neutral' });
    expect(detectRoute('')).toEqual({ kind: 'neutral' });
  });

  it('returns neutral for unparseable url', () => {
    expect(detectRoute('not-a-url')).toEqual({ kind: 'neutral' });
  });

  it('returns neutral for any non-PRO host', () => {
    expect(detectRoute('https://amazon.com/foo')).toEqual({ kind: 'neutral' });
    expect(detectRoute('https://setlistroyalty.com/dashboard')).toEqual({ kind: 'neutral' });
  });

  it('returns bmi for ols.bmi.com regardless of path', () => {
    expect(detectRoute('https://ols.bmi.com/')).toEqual({ kind: 'bmi' });
    expect(detectRoute('https://ols.bmi.com/Performance')).toEqual({ kind: 'bmi' });
  });

  it('returns ascap-work-reg for #works/online-work-registration', () => {
    expect(detectRoute('https://www.ascap.com/member-access#works/online-work-registration')).toEqual({
      kind: 'ascap-work-reg',
    });
  });

  it('returns ascap-onstage-perf for #onstage/performance/add', () => {
    expect(detectRoute('https://www.ascap.com/member-access#onstage/performance/add')).toEqual({
      kind: 'ascap-onstage-perf',
    });
  });

  it('returns ascap-onstage-setlist for #onstage/setlist/add', () => {
    expect(detectRoute('https://www.ascap.com/member-access#onstage/setlist/add')).toEqual({
      kind: 'ascap-onstage-setlist',
    });
  });

  it('returns ascap-other for any other www.ascap.com hash', () => {
    expect(detectRoute('https://www.ascap.com/member-access#onstage')).toEqual({
      kind: 'ascap-other',
    });
    expect(detectRoute('https://www.ascap.com/member-access#works/saved-works')).toEqual({
      kind: 'ascap-other',
    });
    expect(detectRoute('https://www.ascap.com/')).toEqual({ kind: 'ascap-other' });
  });

  // ascap.com without the `www.` prefix shouldn't route to the ASCAP filler —
  // the manifest only matches www.ascap.com so the content script wouldn't be
  // present anyway. Treating bare ascap.com as neutral matches that reality.
  it('does NOT match bare ascap.com (manifest matches www.ascap.com only)', () => {
    expect(detectRoute('https://ascap.com/member-access#onstage/performance/add')).toEqual({
      kind: 'neutral',
    });
  });
});
