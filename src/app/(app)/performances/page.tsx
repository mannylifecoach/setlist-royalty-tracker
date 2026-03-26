'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PerformanceTable } from '@/components/performance-table';
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

  async function handleConfirm(ids: string[]) {
    await fetch('/api/performances/bulk-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
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

      <PerformanceTable
        data={data}
        onConfirm={handleConfirm}
        onRowClick={(id) => router.push(`/performances/${id}`)}
      />
    </div>
  );
}
