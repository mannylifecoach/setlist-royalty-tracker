// Shared PWA / standalone-display detection.
//
// SRT had this exact idiom inlined in two components (install-prompt.tsx,
// mobile-filing-banner.tsx) plus a third use site that needed it (the
// sign-in verify screen). Extracted here so there's ONE definition of
// "is the user inside the installed app" — and so the verify-screen layout
// decision can be unit-tested as pure logic, decoupled from the DOM check.

/**
 * True when the page is running as an installed PWA in standalone display
 * mode. Detects both the cross-platform `display-mode: standalone` media
 * query and the iOS-specific `navigator.standalone` flag (Safari predates
 * the media query for home-screen web apps).
 *
 * Client-side only. Returns `false` on the server (no `window`), which is
 * the safe default — callers should refine after mount to avoid hydration
 * mismatches (see `useSyncExternalStore` usage in the components).
 */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  const mediaStandalone =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone =
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return mediaStandalone || iosStandalone;
}

export type VerifyLayout = 'link-first' | 'code-first';

/**
 * Decide how the "check your email" verify screen should be ordered.
 *
 * - Installed PWA (standalone): lead with the 6-digit CODE. Tapping the magic
 *   link in an email breaks OUT of the installed app into Safari/Chrome, so
 *   sign-in lands in the wrong window — the code is the only clean in-app path.
 * - Normal browser tab (desktop, or mobile web before install): lead with the
 *   magic LINK (one click, instant), and demote the code to a fallback.
 *
 * Pure function — no DOM access — so it's trivially unit-testable. Callers
 * pass the result of `isStandalonePWA()`.
 */
export function chooseVerifyLayout({
  isStandalone,
}: {
  isStandalone: boolean;
}): VerifyLayout {
  return isStandalone ? 'code-first' : 'link-first';
}
