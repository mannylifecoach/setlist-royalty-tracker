'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PerformanceTable } from '@/components/performance-table';
import { analytics } from '@/lib/analytics';
import type { PerformanceStatus } from '@/lib/constants';

interface PerformanceRow {
  performance: {
    id: string;
    eventDate: string;
    venueName: string | null;
    venueCity: string | null;
    venueState: string | null;
    venueCountry: string | null;
    status: PerformanceStatus;
    expiresAt: string | null;
    setlistFmUrl: string | null;
    tourName: string | null;
  };
  song: { id: string; title: string };
  artist: { id: string; artistName: string };
}

const STATUS_FILTERS = ['all', 'discovered', 'confirmed', 'submitted', 'expired', 'ineligible'] as const;

export default function PerformancesPage() {
  const [data, setData] = useState<PerformanceRow[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ scanned: number; newPerformances: number } | null>(null);
  const router = useRouter();

  const loadData = useCallback(async function loadData() {
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('status', filter);
    const res = await fetch(`/api/performances?${params}`);
    if (res.ok) setData(await res.json());
  }, [filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={handleScan} disabled={scanning} className="btn">
          {scanning ? 'scanning...' : 'scan now'}
        </button>
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
        const confirmedCount = data.filter((d) => d.performance.status === 'confirmed').length;
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
        data={data}
        onConfirm={handleConfirm}
        onRowClick={(id) => router.push(`/performances/${id}`)}
      />
    </div>
  );
}
