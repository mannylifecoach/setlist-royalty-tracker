'use client';

import { useState } from 'react';

interface SetlistFmArtist {
  mbid: string;
  name: string;
  sortName: string;
  disambiguation?: string;
}

interface ArtistSearchProps {
  onSelect: (artist: SetlistFmArtist) => void;
}

export function ArtistSearch({ onSelect }: ArtistSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SetlistFmArtist[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/setlistfm/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="search setlist.fm for artist..."
          className="input flex-1"
        />
        <button onClick={handleSearch} disabled={loading} className="btn">
          {loading ? 'searching...' : 'search'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-1">
          {results.slice(0, 8).map((artist) => (
            <button
              key={artist.mbid}
              onClick={() => {
                onSelect(artist);
                setResults([]);
                setQuery('');
              }}
              className="w-full text-left px-3 py-2 bg-bg-card border border-border-subtle rounded-[2px] hover:bg-bg-hover hover:border-border transition-all duration-150"
            >
              <span className="text-text">{artist.name}</span>
              {artist.disambiguation && (
                <span className="text-text-muted text-[11px] ml-2">
                  ({artist.disambiguation})
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
