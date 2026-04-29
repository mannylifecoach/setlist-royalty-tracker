'use client';

import { useState } from 'react';
import type { PerformanceStatus } from '@/lib/constants';
import { analytics } from '@/lib/analytics';
import { songviewSearchUrl } from '@/lib/songview';
import { getMissingFields } from '@/lib/export';

interface Performance {
  id: string;
  eventDate: string;
  venueName: string | null;
  venueCity: string | null;
  venueState: string | null;
  venueCountry: string | null;
  venueAddress: string | null;
  venuePhone: string | null;
  attendance: number | null;
  status: PerformanceStatus;
}

interface Song {
  id: string;
  title: string;
  bmiWorkId: string | null;
  ascapWorkId: string | null;
}

interface Artist {
  id: string;
  artistName: string;
}

interface ExportRow {
  performance: Performance;
  song: Song;
  artist: Artist;
}

interface ExportWizardProps {
  data: ExportRow[];
}

export function ExportWizard({ data }: ExportWizardProps) {
  const [pro, setPro] = useState<'bmi' | 'ascap'>('bmi');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(data.map((d) => d.performance.id))
  );

  const selectedData = data.filter((d) => selectedIds.has(d.performance.id));
  const readyCount = selectedData.filter(
    (d) => getMissingFields(d, pro).length === 0
  ).length;
  const incompleteCount = selectedData.length - readyCount;

  function toggleId(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  async function handleExport() {
    analytics.csvExported({ pro, count: selectedIds.size });
    const ids = Array.from(selectedIds).join(',');
    window.location.href = `/api/performances/export?pro=${pro}&ids=${ids}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <button
          onClick={() => setPro('bmi')}
          className={`btn ${pro === 'bmi' ? 'bg-white text-black' : ''}`}
        >
          bmi live
        </button>
        <button
          onClick={() => setPro('ascap')}
          className={`btn ${pro === 'ascap' ? 'bg-white text-black' : ''}`}
        >
          ascap onstage
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="text-[11px] text-text-muted mb-1">selected</div>
          <div className="text-[18px] font-light">{selectedData.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] text-text-muted mb-1">ready</div>
          <div className="text-[18px] font-light text-status-confirmed">
            {readyCount}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] text-text-muted mb-1">missing fields</div>
          <div className="text-[18px] font-light text-status-expiring">
            {incompleteCount}
          </div>
        </div>
      </div>

      <div>
        {selectedData.map(({ performance, song, artist }) => {
          const missing = getMissingFields({ performance, song }, pro);
          return (
            <div
              key={performance.id}
              className="flex items-center gap-3 px-3 py-3 border-b border-border-subtle"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(performance.id)}
                onChange={() => toggleId(performance.id)}
                className="accent-status-discovered"
              />
              <span className="flex-1 text-[12px]">
                <span className="text-text font-medium">{song.title}</span>
                <span className="text-text-muted ml-2">
                  {artist.artistName} · {performance.eventDate}
                </span>
              </span>
              {missing.length > 0 && (
                <span className="text-[10px] text-status-expiring flex items-center gap-2">
                  missing: {missing.join(', ')}
                  {missing.includes('bmi work id') && (
                    <a
                      href={songviewSearchUrl(null, song.title)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-status-discovered hover:underline"
                      title="search bmi repertoire for this song's work id, then add it to the song in srt"
                    >
                      find work id →
                    </a>
                  )}
                </span>
              )}
              {missing.length === 0 && (
                <span className="text-[10px] text-status-confirmed">ready</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-1">
        <a
          href={pro === 'bmi' ? 'https://ols.bmi.com' : 'https://members.ascap.com'}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary btn w-full text-center block"
        >
          open {pro === 'bmi' ? 'bmi live' : 'ascap onstage'} →
        </a>
        <p className="text-[10px] text-text-muted text-center">
          opens {pro === 'bmi' ? 'ols.bmi.com' : 'members.ascap.com'} in a new tab —{' '}
          {pro === 'bmi' ? (
            <>
              install the{' '}
              <a href="/help/chrome-extension" className="text-status-discovered hover:underline">chrome extension</a>{' '}
              first to auto-fill your performances directly into the form
            </>
          ) : (
            <>chrome extension auto-fill is coming for ascap onstage; for now use the csv below as a reference while you fill the form manually</>
          )}
        </p>
      </div>

      <div className="space-y-1">
        <button
          onClick={handleExport}
          disabled={selectedData.length === 0}
          className="btn w-full"
        >
          download {pro.toUpperCase()} csv ({selectedData.length} performances)
        </button>
        <p className="text-[10px] text-text-muted text-center">
          backup option — download a csv file to reference or upload manually
        </p>
      </div>

      {incompleteCount > 0 && (
        <p className="text-[11px] text-text-muted text-center">
          performances with missing fields will still be exported — fill them in
          before submitting to your pro
        </p>
      )}
    </div>
  );
}
