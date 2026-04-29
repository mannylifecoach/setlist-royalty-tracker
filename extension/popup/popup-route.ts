// Pure route detection — extracted so unit tests can import without booting
// the popup module (which touches `chrome.*` and `document` at top level).

export type PopupRoute =
  | { kind: 'bmi' }
  | { kind: 'ascap-work-reg' }
  | { kind: 'ascap-onstage-perf' }
  | { kind: 'ascap-onstage-setlist' }
  | { kind: 'ascap-other' }
  | { kind: 'neutral' };

export function detectRoute(url: string | undefined): PopupRoute {
  if (!url) return { kind: 'neutral' };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { kind: 'neutral' };
  }
  if (parsed.hostname === 'ols.bmi.com') return { kind: 'bmi' };
  if (parsed.hostname === 'www.ascap.com') {
    const hash = parsed.hash;
    if (hash.includes('works/online-work-registration')) return { kind: 'ascap-work-reg' };
    if (hash.includes('onstage/performance/add')) return { kind: 'ascap-onstage-perf' };
    if (hash.includes('onstage/setlist/add')) return { kind: 'ascap-onstage-setlist' };
    return { kind: 'ascap-other' };
  }
  return { kind: 'neutral' };
}

export const PRO_DEEP_LINKS = {
  bmi: 'https://ols.bmi.com/',
  ascapOnstage: 'https://www.ascap.com/member-access#onstage',
  ascapWorkReg: 'https://www.ascap.com/member-access#works/online-work-registration',
} as const;
