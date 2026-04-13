'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ImportResult {
  importBatchId: string;
  tracksFound: number;
  performancesCreated: number;
  matched: { trackTitle: string; songTitle: string; method: string }[];
  unmatched: string[];
  warnings: string[];
}

export default function ImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [venueName, setVenueName] = useState('');
  const [venueCity, setVenueCity] = useState('');
  const [venueState, setVenueState] = useState('');
  const [venueCountry, setVenueCountry] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !venueName || !venueCity || !eventDate) return;

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('venueName', venueName);
      formData.append('venueCity', venueCity);
      if (venueState) formData.append('venueState', venueState);
      if (venueCountry) formData.append('venueCountry', venueCountry);
      formData.append('eventDate', eventDate);

      const res = await fetch('/api/import/serato', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'import failed');
        return;
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'import failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-[640px] mx-auto space-y-8">
      <div>
        <h1 className="text-[22px] font-light tracking-[-0.5px]">import dj sets</h1>
        <p className="text-[13px] text-text-muted mt-2 leading-[1.5]">
          upload your serato dj pro history csv. we&apos;ll match tracks against
          your registered songs (including remixes via musicbrainz work
          relationships) and create performance records. you can then file
          royalty claims through the chrome extension or csv export like any
          other performance.
        </p>
      </div>

      {/* Source switcher — Serato now, Traktor/Rekordbox later */}
      <div className="flex gap-2 border-b border-border-subtle">
        <button className="px-4 py-2 text-[12px] border-b-2 border-white -mb-px">
          serato dj
        </button>
        <button
          disabled
          className="px-4 py-2 text-[12px] text-text-disabled cursor-not-allowed"
          title="coming soon"
        >
          traktor · soon
        </button>
        <button
          disabled
          className="px-4 py-2 text-[12px] text-text-disabled cursor-not-allowed"
          title="coming soon"
        >
          rekordbox · soon
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File upload */}
        <div>
          <label className="text-[11px] text-text-muted block mb-2">
            serato history csv
          </label>
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border border-dashed p-8 text-center transition-colors ${
              dragActive
                ? 'border-white bg-white/5'
                : 'border-border-subtle hover:border-border'
            }`}
          >
            <input
              id="file-input"
              type="file"
              accept=".csv,.txt,.tsv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            {file ? (
              <div className="space-y-2">
                <div className="text-[13px]">{file.name}</div>
                <div className="text-[11px] text-text-muted">
                  {(file.size / 1024).toFixed(1)} KB
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-[11px] text-text-disabled hover:text-status-expired"
                >
                  remove
                </button>
              </div>
            ) : (
              <label
                htmlFor="file-input"
                className="cursor-pointer block space-y-2"
              >
                <div className="text-[13px] text-text-secondary">
                  drop your serato csv here, or click to browse
                </div>
                <div className="text-[11px] text-text-muted">
                  in serato dj pro: history → select session → export
                </div>
              </label>
            )}
          </div>
        </div>

        {/* Venue details */}
        <div className="space-y-4">
          <div className="text-[11px] text-text-muted">where was this set played?</div>

          <div>
            <label className="text-[11px] text-text-muted block mb-1">
              venue name
            </label>
            <input
              type="text"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="e.g. Rebel Toronto, Output, Red Rocks"
              className="input w-full"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-text-muted block mb-1">
                city
              </label>
              <input
                type="text"
                value={venueCity}
                onChange={(e) => setVenueCity(e.target.value)}
                placeholder="Toronto"
                className="input w-full"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-text-muted block mb-1">
                state/region
              </label>
              <input
                type="text"
                value={venueState}
                onChange={(e) => setVenueState(e.target.value)}
                placeholder="ON"
                className="input w-full"
              />
            </div>
            <div>
              <label className="text-[11px] text-text-muted block mb-1">
                country
              </label>
              <input
                type="text"
                value={venueCountry}
                onChange={(e) => setVenueCountry(e.target.value)}
                placeholder="CA"
                className="input w-full"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-text-muted block mb-1">
              event date
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="input w-full"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={uploading || !file || !venueName || !venueCity || !eventDate}
          className="btn w-full py-3 text-[13px] disabled:opacity-30"
        >
          {uploading ? 'matching tracks...' : 'import set'}
        </button>
      </form>

      {error && (
        <div className="border border-status-expired/50 bg-status-expired/5 p-4 text-[12px] text-status-expired">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="card p-4 space-y-3">
            <div className="text-[11px] text-text-muted">import summary</div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-[24px] font-light">
                  {result.tracksFound}
                </div>
                <div className="text-[11px] text-text-muted">
                  tracks in csv
                </div>
              </div>
              <div>
                <div className="text-[24px] font-light text-status-confirmed">
                  {result.performancesCreated}
                </div>
                <div className="text-[11px] text-text-muted">
                  performances created
                </div>
              </div>
              <div>
                <div className="text-[24px] font-light text-text-disabled">
                  {result.unmatched.length}
                </div>
                <div className="text-[11px] text-text-muted">
                  tracks skipped
                </div>
              </div>
            </div>
          </div>

          {result.matched.length > 0 && (
            <div>
              <div className="text-[11px] text-text-muted mb-2">matched tracks</div>
              <div>
                {result.matched.map((m, i) => (
                  <div key={i} className="flex justify-between gap-3 px-4 py-2 border-b border-border-subtle text-[12px]">
                    <span className="text-text-secondary truncate">
                      {m.trackTitle} → {m.songTitle}
                    </span>
                    <span className="text-[10px] text-text-disabled shrink-0">
                      {m.method}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.unmatched.length > 0 && (
            <details className="card p-4">
              <summary className="text-[11px] text-text-muted cursor-pointer">
                skipped tracks ({result.unmatched.length})
              </summary>
              <div className="mt-2 space-y-[2px] text-[12px] text-text-muted">
                {result.unmatched.map((t, i) => (
                  <div key={i} className="truncate">
                    {t}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-text-disabled mt-3">
                tracks are skipped when they don&apos;t match a registered song
                or the matched song has no linked artist. register more songs
                or link artists to your existing songs to capture these.
              </p>
            </details>
          )}

          <button
            onClick={() => router.push('/performances')}
            className="btn w-full py-3 text-[13px]"
          >
            view performances
          </button>
        </div>
      )}
    </div>
  );
}
