'use client';

import { useEffect, useState } from 'react';
import { ArtistSearch } from '@/components/artist-search';

interface Artist {
  id: string;
  artistName: string;
  mbid: string | null;
}

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);

  useEffect(() => {
    loadArtists();
  }, []);

  async function loadArtists() {
    const res = await fetch('/api/artists');
    if (res.ok) setArtists(await res.json());
  }

  async function handleAdd(sfArtist: { mbid: string; name: string }) {
    const res = await fetch('/api/artists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artistName: sfArtist.name,
        mbid: sfArtist.mbid,
      }),
    });
    if (res.ok) await loadArtists();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/artists/${id}`, { method: 'DELETE' });
    await loadArtists();
  }

  async function handleResolve(id: string, mbid: string) {
    await fetch(`/api/artists/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mbid }),
    });
    await loadArtists();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-[18px] font-light tracking-[-0.3px]">artists</h1>

      <div className="card p-4 space-y-3">
        <div className="text-[11px] text-text-muted mb-1">
          search setlist.fm to add an artist
        </div>
        <ArtistSearch onSelect={handleAdd} />
      </div>

      <div className="space-y-[2px]">
        {artists.map((artist) => (
          <div
            key={artist.id}
            className="card flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-medium">
                {artist.artistName}
              </span>
              {artist.mbid ? (
                <span className="text-[10px] text-status-confirmed bg-status-confirmed/10 px-1.5 py-0.5 rounded-[2px]">
                  resolved
                </span>
              ) : (
                <span className="text-[10px] text-status-expiring bg-status-expiring/10 px-1.5 py-0.5 rounded-[2px]">
                  no mbid
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!artist.mbid && (
                <ResolveButton
                  artistName={artist.artistName}
                  onResolve={(mbid) => handleResolve(artist.id, mbid)}
                />
              )}
              <button
                onClick={() => handleDelete(artist.id)}
                className="text-[11px] text-text-disabled hover:text-status-expired transition-colors"
              >
                delete
              </button>
            </div>
          </div>
        ))}

        {artists.length === 0 && (
          <div className="text-center py-12 text-text-muted text-[13px]">
            no artists yet — search above to add one
          </div>
        )}
      </div>
    </div>
  );
}

function ResolveButton({
  artistName,
  onResolve,
}: {
  artistName: string;
  onResolve: (mbid: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<
    Array<{ mbid: string; name: string; disambiguation?: string }>
  >([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    setOpen(true);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/setlistfm/search?q=${encodeURIComponent(artistName)}`
      );
      if (res.ok) setResults(await res.json());
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={search} className="btn text-[10px] px-2 py-1">
        resolve
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {loading ? (
        <span className="text-[11px] text-text-muted">searching...</span>
      ) : (
        <select
          onChange={(e) => {
            if (e.target.value) {
              onResolve(e.target.value);
              setOpen(false);
            }
          }}
          className="bg-transparent border-b border-[#333] text-[11px] text-text-muted py-0.5 outline-none"
          defaultValue=""
        >
          <option value="" disabled>
            select match
          </option>
          {results.slice(0, 5).map((r) => (
            <option key={r.mbid} value={r.mbid}>
              {r.name}
              {r.disambiguation ? ` (${r.disambiguation})` : ''}
            </option>
          ))}
        </select>
      )}
      <button
        onClick={() => setOpen(false)}
        className="text-[11px] text-text-disabled"
      >
        cancel
      </button>
    </div>
  );
}
