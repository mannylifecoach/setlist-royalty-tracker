'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  href: string;
  hint?: string;
}

interface ChecklistData {
  items: ChecklistItem[];
  completed: number;
  total: number;
}

/**
 * Get-started checklist for the dashboard. Self-fetches + self-hides:
 * renders nothing while loading or once the user has completed all 7
 * items. Per the 2026-05-25 onboarding research, visible progress is the
 * dopamine that keeps people moving through complex setup — checklist
 * format outperforms documentation by a wide margin for tester-style
 * flows where each step is concrete and short.
 *
 * Each item links to the page where the action lives. Done items render
 * muted + with a check; pending items render bright + with a chevron.
 */
export function GetStartedChecklist() {
  const [data, setData] = useState<ChecklistData | null>(null);

  useEffect(() => {
    fetch('/api/onboarding/checklist')
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, []);

  // Hide while loading + once everything is checked off — the dashboard
  // already has the rest of its UI; no point showing an empty "done!" state.
  if (!data || data.completed === data.total) return null;

  const pct = Math.round((data.completed / data.total) * 100);

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-medium tracking-[-0.3px]">get started</h2>
          <p className="text-[11px] text-text-muted mt-0.5">
            7 quick steps from sign-up to your first filed performance.
          </p>
        </div>
        <span className="text-[11px] text-text-muted whitespace-nowrap shrink-0">
          {data.completed} of {data.total} done
        </span>
      </div>

      {/* Progress bar — fills from left to right as the user works through items. */}
      <div className="h-1 bg-bg-hover rounded-full overflow-hidden">
        <div
          className="h-full bg-status-confirmed transition-all duration-500"
          style={{ width: `${pct}%` }}
          aria-label={`${data.completed} of ${data.total} steps complete`}
        />
      </div>

      <ul className="space-y-0.5">
        {data.items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={`flex items-center gap-3 px-2 py-2 -mx-2 rounded-[2px] transition-colors touch-manipulation ${
                item.done
                  ? 'opacity-50 hover:opacity-70'
                  : 'hover:bg-white/[0.02] active:bg-white/[0.04]'
              }`}
            >
              <span
                className={`w-4 h-4 border flex items-center justify-center text-[10px] shrink-0 ${
                  item.done
                    ? 'border-status-confirmed bg-status-confirmed text-black'
                    : 'border-border'
                }`}
                aria-hidden="true"
              >
                {item.done ? '✓' : ''}
              </span>
              <span
                className={`text-[12px] flex-1 min-w-0 truncate ${
                  item.done ? 'line-through text-text-disabled' : 'text-text'
                }`}
              >
                {item.label}
              </span>
              {!item.done && (
                <span className="text-text-disabled text-[12px] shrink-0">→</span>
              )}
            </Link>
            {item.hint && !item.done && (
              <p className="text-[10px] text-text-disabled pl-7 pb-1 leading-[1.4]">
                {item.hint}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
