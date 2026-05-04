'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'srt-pro-walkthrough-dismissed';

interface Props {
  pro: 'bmi' | 'ascap';
  onClose: () => void;
}

export function ProSubmissionWalkthrough({ pro, onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [extensionDetected, setExtensionDetected] = useState<boolean | null>(null);

  // Detect if Chrome extension is installed by checking for the injected marker.
  // The extension content script sets window.__SRT_EXTENSION_INSTALLED = true.
  // Fallback: if we can't detect, assume not installed so the user sees the install step.
  useEffect(() => {
    const check = () => {
      const installed = typeof window !== 'undefined' &&
        (window as unknown as { __SRT_EXTENSION_INSTALLED?: boolean }).__SRT_EXTENSION_INSTALLED === true;
      setExtensionDetected(installed);
    };
    // Check immediately, then again after a short delay to give the extension time to inject
    check();
    const timer = setTimeout(check, 500);
    return () => clearTimeout(timer);
  }, []);

  function handleClose() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, '1');
    }
    onClose();
  }

  const proUrl = pro === 'bmi' ? 'https://ols.bmi.com' : 'https://members.ascap.com';
  const proName = pro === 'bmi' ? 'bmi live' : 'ascap onstage';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
      onClick={handleClose}
    >
      <div
        className="card max-w-[480px] w-full p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-medium tracking-[-0.3px]">
            how to submit to {proName}
          </h2>
          <button
            onClick={handleClose}
            className="text-text-disabled hover:text-text-muted text-[18px] leading-none"
            aria-label="close"
          >
            ×
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1 flex-1 ${
                n <= step ? 'bg-status-discovered' : 'bg-border-subtle'
              }`}
            />
          ))}
        </div>

        {/* Step 1 — Install extension */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <p className="text-[12px] text-text-muted mb-1">step 1 of 3</p>
              <h3 className="text-[14px] font-medium">install the chrome extension</h3>
            </div>
            {extensionDetected ? (
              <div className="card p-3 text-[12px] text-status-confirmed flex items-center gap-2">
                <span>✓</span>
                <span>extension detected — you&apos;re ready</span>
              </div>
            ) : (
              <div className="space-y-3 text-[12px] text-text-secondary leading-[1.6]">
                <p>
                  the chrome extension auto-fills bmi&apos;s submission form with your performance
                  data in seconds. without it, you&apos;ll need to type every field manually.
                </p>
                <a
                  href="/help/chrome-extension"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-status-discovered hover:underline"
                >
                  install guide →
                </a>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={handleClose}
                className="text-[12px] text-text-disabled hover:text-text-muted"
              >
                skip — i&apos;ll use csv
              </button>
              <button
                onClick={() => setStep(2)}
                className="btn btn-primary text-[12px]"
              >
                {extensionDetected ? 'next →' : 'done, continue →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Open PRO */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <p className="text-[12px] text-text-muted mb-1">step 2 of 3</p>
              <h3 className="text-[14px] font-medium">open {proName}</h3>
            </div>
            <p className="text-[12px] text-text-secondary leading-[1.6]">
              click below to open {proUrl.replace('https://', '')} in a new tab. log in with
              your {pro.toUpperCase()} credentials and start a new performance.
            </p>
            <a
              href={proUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary w-full text-center block text-[13px]"
              onClick={() => setTimeout(() => setStep(3), 500)}
            >
              open {proName} →
            </a>
            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="text-[12px] text-text-disabled hover:text-text-muted"
              >
                ← back
              </button>
              <button
                onClick={() => setStep(3)}
                className="text-[12px] text-text-muted hover:text-text"
              >
                already open — next →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Auto-fill */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <p className="text-[12px] text-text-muted mb-1">step 3 of 3</p>
              <h3 className="text-[14px] font-medium">click the srt extension to auto-fill</h3>
            </div>
            <ol className="space-y-3 text-[12px] text-text-secondary leading-[1.6]">
              <li className="flex gap-3">
                <span className="text-text-muted shrink-0">1.</span>
                <span>
                  in the {proName} form, click the <span className="text-text">srt extension icon</span> in your
                  browser toolbar (top-right, next to the address bar)
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-text-muted shrink-0">2.</span>
                <span>
                  select the performance you want to submit from the extension popup
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-text-muted shrink-0">3.</span>
                <span>
                  click <span className="text-text">auto-fill</span> — the form populates in seconds
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-text-muted shrink-0">4.</span>
                <span>
                  review the form, then submit it yourself on {proName}
                </span>
              </li>
            </ol>
            <div className="card p-3 text-[11px] text-text-muted leading-[1.5]">
              <span className="text-text-secondary">tip:</span> if you don&apos;t see the extension icon,
              pin it to your toolbar by clicking the puzzle piece in chrome and clicking the pin next to srt.
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="text-[12px] text-text-disabled hover:text-text-muted"
              >
                ← back
              </button>
              <button
                onClick={handleClose}
                className="btn btn-primary text-[12px]"
              >
                got it
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to show the walkthrough once per user (persisted in localStorage).
 * Returns { shouldShow, dismiss } so the caller can control when to render.
 */
export function useProWalkthrough() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    // setState-in-effect is correct here — localStorage is browser-only,
    // so the initial render can't know whether to show the walkthrough.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!dismissed) setShouldShow(true);
  }, []);

  function dismiss() {
    setShouldShow(false);
  }

  function showAgain() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    setShouldShow(true);
  }

  return { shouldShow, dismiss, showAgain };
}
