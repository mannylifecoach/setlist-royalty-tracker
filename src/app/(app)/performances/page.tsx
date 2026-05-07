'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PerformanceTable } from '@/components/performance-table';
import { analytics } from '@/lib/analytics';
import type { PerformanceRow } from '@/lib/performance-grouping';
import type { PerformanceStatus } from '@/lib/constants';

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

  const visibleData = useMemo(
    () => data.filter((row) => matchesFilter(row, filter)),
    [data, filter]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-light tracking-[-0.3px]">
          performances
        </h1>
        <div className="flex items-center gap-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-[11px] px-2.5 py-1 rounded-[2px] transition-colors ${
                filter === s
                  ? 'bg-bg-hover text-text border border-border'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {s} <span className="text-text-disabled">({counts[s]})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={handleScan} disabled={scanning} className="btn">
          {scanning ? 'scanning...' : 'scan now'}
        </button>
        <Link href="/performances/new" className="text-[12px] text-text-muted hover:text-text-secondary">
          + add manually
        </Link>
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
      />
    </div>
  );
}
