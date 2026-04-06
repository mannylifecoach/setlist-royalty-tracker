'use client';

import { useState } from 'react';
import Link from 'next/link';

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="btn p-2 flex items-center justify-center w-10 h-10"
        aria-label="Menu"
      >
        <svg
          width="18"
          height="14"
          viewBox="0 0 18 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          {open ? (
            <>
              <line x1="3" y1="2" x2="15" y2="12" />
              <line x1="15" y1="2" x2="3" y2="12" />
            </>
          ) : (
            <>
              <line x1="1" y1="1" x2="17" y2="1" />
              <line x1="1" y1="7" x2="17" y2="7" />
              <line x1="1" y1="13" x2="17" y2="13" />
            </>
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 flex flex-col gap-2 min-w-[120px] bg-black/90 backdrop-blur-sm p-3 border border-[var(--color-border-subtle)] rounded-[var(--radius)]">
          <Link
            href="/about"
            className="btn text-[11px] text-center"
            onClick={() => setOpen(false)}
          >
            about
          </Link>
          <Link
            href="/pitch"
            className="btn text-[11px] text-center"
            onClick={() => setOpen(false)}
          >
            pitch
          </Link>
          <Link
            href="/login"
            className="btn text-[11px] text-center"
            onClick={() => setOpen(false)}
          >
            sign in
          </Link>
        </div>
      )}
    </div>
  );
}
