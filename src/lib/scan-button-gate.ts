// Pure helpers that determine whether the Bandsintown "scan now" button on
// /settings is interactive. Extracted from the JSX so we can unit-test the
// gating rules without booting React.

export type BandsintownScanGateState = {
  apiKey: string;
  artistSlug: string;
  scanning: boolean;
  testing: boolean;
  saving: boolean;
};

/**
 * Returns true when the user has saved (or at least entered) both Bandsintown
 * credentials and no other in-flight Bandsintown action is happening. Server
 * is the final authority: if the user clears creds via the disconnect flow
 * without re-rendering, POST /api/scan/bandsintown will return 400.
 */
export function canScanBandsintownNow(state: BandsintownScanGateState): boolean {
  if (!state.apiKey || !state.artistSlug) return false;
  if (state.scanning || state.testing || state.saving) return false;
  return true;
}

/**
 * Human-readable explanation for the skipped reason strings emitted by
 * scanBandsintownForUser. Keeps the format machine-readable (so the daily
 * cron can parse it) while still rendering well in the settings toast.
 */
export function describeScanSkipReason(skipped: string): string {
  const cooldown = skipped.match(/^cooldown_active:next_in_(\d+)s$/);
  if (cooldown) {
    const seconds = Number(cooldown[1]);
    const hours = Math.ceil(seconds / 3600);
    return `you scanned recently — try again in about ${hours}h`;
  }
  const rateLimited = skipped.match(/^rate_limited:retry_after_(\d+)s$/);
  if (rateLimited) {
    const seconds = Number(rateLimited[1]);
    const minutes = Math.ceil(seconds / 60);
    return `bandsintown asked us to slow down — try again in about ${minutes}m`;
  }
  if (skipped.startsWith('bandsintown fetch failed:')) {
    return skipped.replace('bandsintown fetch failed:', 'bandsintown error:').trim();
  }
  // Unmapped reasons (no_template, no_owned_songs, slug mismatch, etc.) —
  // surface verbatim. These are user-config problems that need the literal
  // message to be actionable.
  return skipped;
}
