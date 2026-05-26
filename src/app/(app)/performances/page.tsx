'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PerformanceTable } from '@/components/performance-table';
import { CoverageBanner } from '@/components/coverage-banner';
import { analytics } from '@/lib/analytics';
import type { PerformanceRow } from '@/lib/performance-grouping';
import type { PerformanceStatus } from '@/lib/constants';
import {
  PERFORMANCE_SOURCES,
  SOURCE_CHIP_LABELS,
  hasMultipleSources,
  countBySource,
  matchesSourceFilter,
  type PerformanceSource,
} from '@/lib/source-display';

// `active` is a virtual filter: discovered + confirmed (the things still
// awaiting user action). It's the default so beta testers don't drown in
// rows they've already filed — the original 2026-05-03 Mckay complaint.
type StatusFilter = 'active' | 'all' | PerformanceStatus;
const STATUS_FILTERS: StatusFilter[] = [
  'active',
  'all',
  'discovered',
  'confirmed',
  'submitted',
  'expired',
  'ineligible',
];

// Source filter is URL-driven (?source=bandsintown). The settings "scan now"
// toast links here with the param pre-set so users land already-filtered.
type SourceFilter = 'all' | PerformanceSource;
const SOURCE_FILTERS: SourceFilter[] = ['all', ...PERFORMANCE_SOURCES];

function matchesFilter(row: PerformanceRow, filter: StatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'active') {
    return row.performance.status === 'discovered' || row.performance.status === 'confirmed';
  }
  return row.performance.status === filter;
}


export default function PerformancesPage() {
  const [data, setData] = useState<PerformanceRow[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('active');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ scanned: number; newPerformances: number } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Source filter is read from ?source= every render — clicks rewrite the URL,
  // so URL is the single source of truth (no setSourceFilter useState).
  const sourceFilter = useMemo<SourceFilter>(() => {
    const param = searchParams.get('source');
    if (param && (PERFORMANCE_SOURCES as readonly string[]).includes(param)) {
      return param as PerformanceSource;
    }
    return 'all';
  }, [searchParams]);

  function setSourceFilter(next: SourceFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'all') params.delete('source');
    else params.set('source', next);
    const query = params.toString();
    router.replace(`/performances${query ? `?${query}` : ''}`);
  }

  // Fetches every performance once per refresh, then filters + counts client-
  // side. Pattern matches the dashboard, which already does the same. Keeps
  // pill counts always-accurate without requiring per-filter round trips.
  const loadData = useCallback(async function loadData() {
    const res = await fetch('/api/performances');
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleScan() {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch('/api/scan', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        setScanResult({ scanned: result.scanned, newPerformances: result.newPerformances });
        await loadData();
      }
    } finally {
      setScanning(false);
    }
  }

  async function handleConfirm(ids: string[]) {
    await fetch('/api/performances/bulk-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    analytics.performanceConfirmed({ count: ids.length });
    await loadData();
  }

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      active: 0,
      all: data.length,
      discovered: 0,
      confirmed: 0,
      submitted: 0,
      expired: 0,
      ineligible: 0,
    };
    for (const row of data) {
      c[row.performance.status] += 1;
    }
    c.active = c.discovered + c.confirmed;
    return c;
  }, [data]);

  const sources = useMemo(() => data.map((d) => d.performance.source), [data]);
  const multiSource = useMemo(() => hasMultipleSources(sources), [sources]);
  const sourceCounts = useMemo(() => countBySource(sources), [sources]);

  const visibleData = useMemo(
    () =>
      data.filter(
        (row) =>
          matchesFilter(row, filter) &&
          matchesSourceFilter(row.performance.source, sourceFilter)
      ),
    [data, filter, sourceFilter]
  );

  return (
    <div className="space-y-6">
      {/* Title row stacks on mobile (7 status chips can't share a 375px row with the h1) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-[18px] font-light tracking-[-0.3px]">
          performances
        </h1>
        {/* Status chips: horizontal scroll on mobile (-mx + px bleed pattern matches AppNav) */}
        <div className="flex items-center gap-1 overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0 whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-[11px] px-2.5 py-1 rounded-[2px] transition-colors touch-manipulation shrink-0 ${
                filter === s
                  ? 'bg-bg-hover text-text border border-border'
                  : 'text-text-muted hover:text-text-secondary active:text-text-secondary'
              }`}
            >
              {s} <span className="text-text-disabled">({counts[s]})</span>
            </button>
          ))}
        </div>
      </div>

      {multiSource && (
        <div className="flex items-center gap-1 sm:justify-end flex-wrap overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="text-[11px] text-text-disabled mr-1 shrink-0">source:</span>
          {SOURCE_FILTERS.map((s) => {
            const label = s === 'all' ? 'all' : SOURCE_CHIP_LABELS[s];
            const count = s === 'all' ? data.length : sourceCounts[s];
            return (
              <button
                key={s}
                onClick={() => setSourceFilter(s)}
                className={`text-[11px] px-2.5 py-1 rounded-[2px] transition-colors touch-manipulation shrink-0 ${
                  sourceFilter === s
                    ? 'bg-bg-hover text-text border border-border'
                    : 'text-text-muted hover:text-text-secondary active:text-text-secondary'
                }`}
              >
                {label} <span className="text-text-disabled">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      <CoverageBanner />

      {/* Scan action row: stacks on mobile so scanResult message has room */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-4">
          <button onClick={handleScan} disabled={scanning} className="btn touch-manipulation">
            {scanning ? 'scanning...' : 'scan now'}
          </button>
          <Link href="/performances/new" className="text-[12px] text-text-muted hover:text-text-secondary touch-manipulation">
            + add manually
          </Link>
        </div>
        {scanResult && (
          <span className="text-[12px] text-text-secondary">
            scanned {scanResult.scanned} setlists —{' '}
            {scanResult.newPerformances > 0 ? (
              <span className="text-status-discovered">
                {scanResult.newPerformances} new performance{scanResult.newPerformances !== 1 ? 's' : ''} found
              </span>
            ) : (
              'no new performances found'
            )}
          </span>
        )}
      </div>

      {(() => {
        const confirmedCount = counts.confirmed;
        if (confirmedCount === 0) return null;
        return (
          <div className="card px-4 py-3 text-[12px] text-text-secondary">
            <span className="text-status-confirmed">{confirmedCount} confirmed</span>
            {' — ready to submit. '}
            <a href="/export" className="text-status-discovered hover:underline">
              export csv
            </a>
            {' for manual upload, or use the '}
            <a href="/settings" className="text-status-discovered hover:underline">
              chrome extension
            </a>
            {' to auto-fill bmi live directly (requires google chrome).'}
          </div>
        );
      })()}

      <PerformanceTable
        data={visibleData}
        onConfirm={handleConfirm}
        onRowClick={(id) => router.push(`/performances/${id}`)}
        showSourceBadge={multiSource}
      />
    </div>
  );
}
