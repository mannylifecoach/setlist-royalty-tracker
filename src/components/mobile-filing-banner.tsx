'use client';

import { useState, useSyncExternalStore } from 'react';

// Banner that appears on /performances when accessed from a mobile device.
// Pre-empts the "where's the submit button?" confusion that SRT's unique
// mobile/desktop split creates — filing requires the Chrome extension,
// which can't run on iOS/Android (chrome.debugger API is desktop-only).
// Users today discover this through trial-and-error; this banner sets the
// expectation BEFORE they hunt for an action that doesn't exist on mobile.
//
// Detection mirrors InstallPrompt: useSyncExternalStore for SSR-safe +
// lint-clean browser-state reads. 30-day localStorage dismissal so we don't
// nag users who already understand the split. "Why?" expands an inline
// explainer instead of routing to a separate help page (the explainer fits
// in ~3 sentences; a separate route would be over-engineered for this).

const DISMISS_KEY = 'srt-mobile-filing-banner-dismissed-at';
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function subscribe() {
  return () => {};
}

function shouldShowOnClient(): boolean {
  const ua = navigator.userAgent;
  // Mobile detection — iOS + Android phones/tablets. Includes iPad which
  // identifies as Mac in iPadOS 13+ but has touch + matchMedia coarse pointer.
  const isMobileUA =
    /iPad|iPhone|iPod|Android/.test(ua) ||
    (/Macintosh/.test(ua) &&
      window.matchMedia('(pointer: coarse)').matches);
  if (!isMobileUA) return false;

  try {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const age = Date.now() - Number(dismissedAt);
      if (age < DISMISS_TTL_MS) return false;
    }
  } catch {
    // Private browsing — fall through to show. Worst case banner shows
    // every session for this user; harmless.
  }

  return true;
}

function shouldShowOnServer(): boolean {
  return false;
}

export function MobileFilingBanner() {
  const showInitial = useSyncExternalStore(
    subscribe,
    shouldShowOnClient,
    shouldShowOnServer
  );
  const [userDismissed, setUserDismissed] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  function handleDismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setUserDismissed(true);
  }

  if (!showInitial || userDismissed) return null;

  return (
    <div className="card border-status-discovered/40 bg-status-discovered/[0.04] p-3 space-y-2">
      <div className="flex items-start gap-3">
        <span className="text-[14px] shrink-0 mt-0.5" aria-hidden="true">ℹ️</span>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-[12px] text-text leading-[1.5]">
            <span className="font-medium">You&apos;re on mobile.</span> Review +
            confirm performances here. To submit to BMI / ASCAP, switch to
            desktop Chrome.{' '}
            <button
              type="button"
              onClick={() => setShowWhy((v) => !v)}
              className="text-status-discovered hover:underline active:underline touch-manipulation"
            >
              {showWhy ? 'hide' : 'why?'}
            </button>
          </p>
          {showWhy && (
            <p className="text-[11px] text-text-muted leading-[1.5] pt-1">
              Filing with BMI Live or ASCAP OnStage uses our Chrome extension,
              which depends on a browser API (<code className="text-[10px]">chrome.debugger</code>)
              that Apple and Google don&apos;t expose on iOS or Android — by
              design, to prevent app automation. Desktop Chrome is the only
              place this works. Everything else in SRT — discovery, review,
              confirming, editing details, configuring Bandsintown — works
              great on mobile.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="dismiss banner"
          className="text-[12px] text-text-muted hover:text-text active:text-text transition-colors shrink-0 touch-manipulation -mr-1 px-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
