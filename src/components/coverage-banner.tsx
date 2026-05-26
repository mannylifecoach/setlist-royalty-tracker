'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'srt-coverage-banner-dismissed-v1';

export function CoverageBanner() {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    // Reading localStorage requires the browser, so the initial value has to be
    // resolved post-hydration. Same pattern as src/app/(app)/artists/page.tsx etc.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(localStorage.getItem(STORAGE_KEY) === '1');

    function onRestore() {
      setDismissed(false);
    }
    window.addEventListener('srt:coverage-banner-restore', onRestore);
    return () => window.removeEventListener('srt:coverage-banner-restore', onRestore);
  }, []);

  if (dismissed !== false) return null;

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  }

  return (
    <div className="card p-4 border-l-2 border-l-status-discovered">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-2 text-[12px] text-text-secondary leading-[1.6]">
          <div className="text-[11px] text-text-muted tracking-[2px] uppercase">
            heads up
          </div>
          <p>
            <span className="text-text font-medium">setlist.fm is crowdsourced</span> — most artists
            have only around 30% of their shows logged. if a show you played is missing, it doesn&apos;t
            mean we missed it — it means setlist.fm doesn&apos;t have it yet.
          </p>
          <p>
            for missing shows,{' '}
            <Link href="/performances/new" className="text-status-discovered hover:underline">
              add them manually
            </Link>
            {' '}— or{' '}
            <Link href="/settings" className="text-status-discovered hover:underline">
              connect bandsintown
            </Link>
            {' '}for automatic pulls.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="dismiss"
          className="text-text-muted hover:text-text-secondary text-[16px] leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// Used by settings to bring the banner back after the user dismissed it.
export function restoreCoverageBanner() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('srt:coverage-banner-restore'));
}
