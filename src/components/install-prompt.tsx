'use client';

import { useState, useSyncExternalStore } from 'react';
import { isStandalonePWA } from '@/lib/pwa';

// iOS Safari does not surface a native install prompt — users have to
// manually tap Share → Add to Home Screen. This banner appears for iOS
// mobile visitors who haven't installed yet, with platform-specific copy.
// Android Chrome surfaces its own install affordance automatically when the
// manifest is valid, so we render nothing there.
//
// Dismissal is sticky for 30 days (localStorage flag) so we don't nag.

const DISMISS_KEY = 'srt-install-prompt-dismissed-at';
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// useSyncExternalStore gives us SSR-safe, lint-clean access to one-shot
// browser state (UA, matchMedia, localStorage) without the cascading-render
// warning that setState-inside-useEffect triggers under React Compiler rules.
function subscribe() {
  // No-op — the state we read doesn't change between mounts for our purposes.
  return () => {};
}

function shouldShowOnClient(): boolean {
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;
  if (!isIOS) return false;

  if (isStandalonePWA()) return false;

  try {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const age = Date.now() - Number(dismissedAt);
      if (age < DISMISS_TTL_MS) return false;
    }
  } catch {
    // localStorage can throw in private-browsing modes; fall through to show.
  }

  return true;
}

function shouldShowOnServer(): boolean {
  return false;
}

export function InstallPrompt() {
  const showInitial = useSyncExternalStore(
    subscribe,
    shouldShowOnClient,
    shouldShowOnServer
  );
  // Dismiss is event-driven (onClick), so setState here is fine — the lint
  // rule only flags setState inside effects, not in event handlers.
  const [userDismissed, setUserDismissed] = useState(false);

  function handleDismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore — worst case the banner shows again next visit
    }
    setUserDismissed(true);
  }

  if (!showInitial || userDismissed) return null;

  return (
    <div className="border-b border-border-subtle bg-bg-card/40 px-4 md:px-[2vw] py-2 flex items-start gap-3">
      <p className="flex-1 text-[11px] text-text-secondary leading-[1.5]">
        <span className="text-text">install SRT to your home screen</span>
        {' · '}
        tap <span aria-label="share">⎋</span> in safari, then{' '}
        <span className="text-text">add to home screen</span>
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="dismiss install prompt"
        className="text-[11px] text-text-muted hover:text-text transition-colors shrink-0"
      >
        ✕
      </button>
    </div>
  );
}
