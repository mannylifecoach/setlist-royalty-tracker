'use client';

import { useState } from 'react';
import { StatusBadge } from './status-badge';
import type { PerformanceStatus } from '@/lib/constants';

interface Performance {
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
}

interface Song {
  id: string;
  title: string;
}

interface Artist {
  id: string;
  artistName: string;
}

interface PerformanceRow {
  performance: Performance;
  song: Song;
  artist: Artist;
}

interface PerformanceTableProps {
  data: PerformanceRow[];
  onConfirm?: (ids: string[]) => void;
  onRowClick?: (id: string) => void;
}

function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const daysLeft = Math.ceil(
    (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return daysLeft > 0 && daysLeft <= 30;
}

function daysUntilExpiration(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil(
    (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

export function PerformanceTable({
  data,
  onConfirm,
  onRowClick,
}: PerformanceTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    if (selected.size === data.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.map((d) => d.performance.id)));
    }
  }

  const discoveredSelected = data.filter(
    (d) => selected.has(d.performance.id) && d.performance.status === 'discovered'
  );

  return (
    <div>
      {onConfirm && discoveredSelected.length > 0 && (
        <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-bg-card border border-border-subtle rounded-[2px]">
          <span className="text-[12px] text-text-secondary">
            {discoveredSelected.length} selected
          </span>
          <button
            onClick={() => {
              onConfirm(discoveredSelected.map((d) => d.performance.id));
              setSelected(new Set());
            }}
            className="btn text-[11px] px-3 py-1"
          >
            confirm selected
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border-subtle text-text-muted text-left">
              <th className="pb-2 pr-3 w-8">
                <input
                  type="checkbox"
                  checked={selected.size === data.length && data.length > 0}
                  onChange={toggleAll}
                  className="accent-status-discovered"
                />
              </th>
              <th className="pb-2 pr-3">date</th>
              <th className="pb-2 pr-3">song</th>
              <th className="pb-2 pr-3">artist</th>
              <th className="pb-2 pr-3">venue</th>
              <th className="pb-2 pr-3">location</th>
              <th className="pb-2 pr-3">status</th>
              <th className="pb-2 pr-3">expires</th>
            </tr>
          </thead>
          <tbody>
            {data.map(({ performance, song, artist }) => {
              const days = daysUntilExpiration(performance.expiresAt);
              const expiring = isExpiringSoon(performance.expiresAt);
              const displayStatus =
                expiring && performance.status !== 'submitted'
                  ? 'expiring'
                  : performance.status;

              return (
                <tr
                  key={performance.id}
                  onClick={() => onRowClick?.(performance.id)}
                  className="border-b border-border-subtle hover:bg-bg-hover transition-colors duration-150 cursor-pointer"
                >
                  <td className="py-2.5 pr-3">
                    <input
                      type="checkbox"
                      checked={selected.has(performance.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelect(performance.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="accent-status-discovered"
                    />
                  </td>
                  <td className="py-2.5 pr-3 text-text-secondary whitespace-nowrap">
                    {performance.eventDate}
                  </td>
                  <td className="py-2.5 pr-3 text-text font-medium">
                    {song.title}
                  </td>
                  <td className="py-2.5 pr-3 text-text-secondary">
                    {artist.artistName}
                  </td>
                  <td className="py-2.5 pr-3 text-text-secondary">
                    {performance.venueName || '—'}
                  </td>
                  <td className="py-2.5 pr-3 text-text-muted whitespace-nowrap">
                    {[performance.venueCity, performance.venueState, performance.venueCountry]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </td>
                  <td className="py-2.5 pr-3">
                    <StatusBadge status={displayStatus} />
                  </td>
                  <td className="py-2.5 pr-3 whitespace-nowrap">
                    {days !== null && performance.expiresAt ? (
                      <div className="flex flex-col">
                        <span className={`text-text-secondary ${expiring ? 'text-status-expiring font-medium' : ''}`}>
                          {performance.expiresAt}
                        </span>
                        <span className={`text-[10px] ${expiring ? 'text-status-expiring' : 'text-text-muted'}`}>
                          {days > 0 ? `${days}d left` : 'expired'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="text-center py-12 text-text-muted text-[13px]">
          no performances found
        </div>
      )}
    </div>
  );
}
