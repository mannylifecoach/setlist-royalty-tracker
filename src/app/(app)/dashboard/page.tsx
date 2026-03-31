'use client';

import { useEffect, useState } from 'react';
import { StatusBadge } from '@/components/status-badge';
import { useRouter } from 'next/navigation';

interface DashboardData {
  discovered: number;
  confirmed: number;
  submitted: number;
  expiringSoon: number;
  recent: Array<{
    performance: {
      id: string;
      eventDate: string;
      venueName: string | null;
      venueCity: string | null;
      status: string;
      expiresAt: string | null;
    };
    song: { title: string };
    artist: { artistName: string };
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ scanned: number; newPerformances: number } | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const res = await fetch('/api/performances');
    if (!res.ok) return;
    const performances = await res.json();

    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    const discovered = performances.filter(
      (p: { performance: { status: string } }) => p.performance.status === 'discovered'
    ).length;
    const confirmed = performances.filter(
      (p: { performance: { status: string } }) => p.performance.status === 'confirmed'
    ).length;
    const submitted = performances.filter(
      (p: { performance: { status: string } }) => p.performance.status === 'submitted'
    ).length;
    const expiringSoon = performances.filter(
      (p: { performance: { status: string; expiresAt: string | null } }) => {
        if (!p.performance.expiresAt || p.performance.status === 'submitted') return false;
        const daysLeft = new Date(p.performance.expiresAt).getTime() - now;
        return daysLeft > 0 && daysLeft <= thirtyDays;
      }
    ).length;

    setData({
      discovered,
      confirmed,
      submitted,
      expiringSoon,
      recent: performances.slice(0, 10),
    });
  }

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-light tracking-[-0.3px]">dashboard</h1>
        <button onClick={handleScan} disabled={scanning} className="btn">
          {scanning ? 'checking...' : 'check for new performances'}
        </button>
      </div>

      {scanResult && (
        <div className="card px-4 py-3 text-[12px] text-text-secondary">
          scanned {scanResult.scanned} setlists —{' '}
          {scanResult.newPerformances > 0 ? (
            <span className="text-status-discovered">
              {scanResult.newPerformances} new performance{scanResult.newPerformances !== 1 ? 's' : ''} found
            </span>
          ) : (
            'no new performances found'
          )}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-[2px]">
            <div className="card p-4">
              <div className="text-[11px] text-text-muted mb-1">discovered</div>
              <div className="text-[24px] font-light text-status-discovered">
                {data.discovered}
              </div>
            </div>
            <div className="card p-4">
              <div className="text-[11px] text-text-muted mb-1">confirmed</div>
              <div className="text-[24px] font-light text-status-confirmed">
                {data.confirmed}
              </div>
            </div>
            <div className="card p-4">
              <div className="text-[11px] text-text-muted mb-1">submitted</div>
              <div className="text-[24px] font-light text-status-submitted">
                {data.submitted}
              </div>
            </div>
            <div className="card p-4">
              <div className="text-[11px] text-text-muted mb-1">
                expiring soon
              </div>
              <div className="text-[24px] font-light text-status-expiring">
                {data.expiringSoon}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-[14px] font-medium tracking-[-0.3px] mb-3">
              recent activity
            </h2>
            <div className="space-y-[2px]">
              {data.recent.map(({ performance, song, artist }) => (
                <div
                  key={performance.id}
                  onClick={() => router.push(`/performances/${performance.id}`)}
                  className="card flex items-center justify-between px-4 py-3 cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-[12px] text-text-muted w-[80px]">
                      {performance.eventDate}
                    </span>
                    <span className="text-[13px] text-text font-medium">
                      {song.title}
                    </span>
                    <span className="text-[12px] text-text-secondary">
                      by {artist.artistName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {performance.venueCity && (
                      <span className="text-[11px] text-text-muted">
                        {performance.venueCity}
                      </span>
                    )}
                    <StatusBadge
                      status={performance.status as 'discovered' | 'confirmed' | 'submitted' | 'expired' | 'ineligible'}
                    />
                  </div>
                </div>
              ))}
              {data.recent.length === 0 && (
                <div className="text-center py-12 text-text-muted text-[13px] space-y-3">
                  <p>no performances yet — get started in three steps:</p>
                  <div className="flex items-center justify-center gap-4">
                    <a href="/artists" className="text-status-discovered hover:underline">1. add artists</a>
                    <span className="text-text-disabled">→</span>
                    <a href="/songs" className="text-status-discovered hover:underline">2. register songs</a>
                    <span className="text-text-disabled">→</span>
                    <button onClick={handleScan} disabled={scanning} className="text-status-discovered hover:underline">
                      3. scan
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
