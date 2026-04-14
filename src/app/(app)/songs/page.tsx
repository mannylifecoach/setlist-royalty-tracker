'use client';

import { useEffect, useState } from 'react';
import { analytics } from '@/lib/analytics';
import { songviewSearchUrl } from '@/lib/songview';

interface Artist {
  id: string;
  artistName: string;
  mbid: string | null;
}

interface Song {
  id: string;
  title: string;
  iswc: string | null;
  bmiWorkId: string | null;
  ascapWorkId: string | null;
  workMbid: string | null;
  recordingMbid: string | null;
  artists: Artist[];
}

export default function SongsPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [title, setTitle] = useState('');
  const [iswc, setIswc] = useState('');
  const [bmiWorkId, setBmiWorkId] = useState('');
  const [ascapWorkId, setAscapWorkId] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<{ scanned: number; newPerformances: number } | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    loadSongs();
    loadArtists();
  }, []);

  async function loadSongs() {
    const res = await fetch('/api/songs');
    if (res.ok) setSongs(await res.json());
  }

  async function loadArtists() {
    const res = await fetch('/api/artists');
    if (res.ok) setArtists(await res.json());
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          iswc: iswc.trim() || null,
          bmiWorkId: bmiWorkId.trim() || null,
          ascapWorkId: ascapWorkId.trim() || null,
        }),
      });
      if (res.ok) {
        analytics.songAdded({ title: title.trim() });
        setTitle('');
        setIswc('');
        setBmiWorkId('');
        setAscapWorkId('');
        await loadSongs();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/songs/${id}`, { method: 'DELETE' });
    await loadSongs();
  }

  async function handleEnrich(id: string) {
    const res = await fetch(`/api/songs/${id}/enrich-metadata`, {
      method: 'POST',
    });
    if (res.ok) await loadSongs();
  }

  async function handleLinkArtist(songId: string, artistId: string) {
    await fetch(`/api/songs/${songId}/artists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artistId }),
    });
    analytics.songLinkedToArtist();
    await loadSongs();

    // Auto-scan after linking an artist to a song
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch('/api/scan', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        setScanResult({ scanned: result.scanned, newPerformances: result.newPerformances });
      } else {
        console.error('Scan failed:', res.status, await res.text());
      }
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setScanning(false);
    }
  }

  async function handleUnlinkArtist(songId: string, artistId: string) {
    await fetch(`/api/songs/${songId}/artists`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artistId }),
    });
    await loadSongs();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-[18px] font-light tracking-[-0.3px]">songs</h1>

      <form onSubmit={handleAdd} className="card p-4 space-y-3">
        <div className="text-[11px] text-text-muted mb-2">add a song</div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="song title"
          className="input"
          required
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            value={iswc}
            onChange={(e) => setIswc(e.target.value)}
            placeholder="iswc (optional)"
            className="input"
          />
          <input
            type="text"
            value={bmiWorkId}
            onChange={(e) => setBmiWorkId(e.target.value)}
            placeholder="bmi work id (optional)"
            className="input"
          />
          <input
            type="text"
            value={ascapWorkId}
            onChange={(e) => setAscapWorkId(e.target.value)}
            placeholder="ascap work id (optional)"
            className="input"
          />
        </div>
        <button type="submit" disabled={loading} className="btn">
          {loading ? 'adding...' : 'add song'}
        </button>
      </form>

      {scanning && (
        <div className="card px-4 py-3 text-[12px] text-text-secondary animate-pulse">
          scanning setlist.fm for matches...
        </div>
      )}

      {scanResult && !scanning && (
        <div className="card px-4 py-3 text-[12px] text-text-secondary">
          scanned {scanResult.scanned} setlists —{' '}
          {scanResult.newPerformances > 0 ? (
            <>
              <span className="text-status-discovered">
                {scanResult.newPerformances} new performance{scanResult.newPerformances !== 1 ? 's' : ''} found
              </span>
              {' — '}
              <a href="/performances" className="text-status-discovered hover:underline">
                view performances
              </a>
            </>
          ) : (
            <>
              no new performances found.{' '}
              <span className="text-text-muted">
                setlist.fm may not have song data for recent shows yet — try{' '}
                <a href="/performances" className="text-status-discovered hover:underline">scanning again</a>
                {' '}later.
              </span>
            </>
          )}
        </div>
      )}

      {!scanning && !scanResult && songs.length > 0 && (
        <div className="card px-4 py-3 text-[12px] text-text-secondary">
          {songs.some((s) => s.artists.length > 0) ? (
            <>
              link songs to artists below.{' '}
              <span className="text-status-confirmed">ready to scan!</span>{' '}
              <a href="/performances" className="text-status-discovered hover:underline">
                go to performances and hit &quot;scan now&quot;
              </a>
              {' '}to find matches on setlist.fm.
            </>
          ) : (
            <>
              <span className="text-status-expiring">link your songs to artists</span>{' '}
              using the &quot;+ link artist&quot; dropdown on each song below — the scanner
              needs to know which artist performs each song to find matches.
            </>
          )}
        </div>
      )}

      <div>
        {songs.map((song) => (
          <div key={song.id} className="px-4 py-4 border-b border-border-subtle">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-[14px] font-medium">{song.title}</span>
                {song.iswc && (
                  <span className="text-[11px] text-text-muted ml-2">
                    iswc: {song.iswc}
                  </span>
                )}
                {song.bmiWorkId && (
                  <span className="text-[11px] text-text-muted ml-2">
                    bmi: {song.bmiWorkId}
                  </span>
                )}
                {song.ascapWorkId && (
                  <span className="text-[11px] text-text-muted ml-2">
                    ascap: {song.ascapWorkId}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {(!song.bmiWorkId || !song.ascapWorkId) && (
                  <a
                    href={songviewSearchUrl(song.iswc, song.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-status-discovered hover:underline"
                    title="search bmi repertoire (songview) for work ids"
                  >
                    look up on songview →
                  </a>
                )}
                {song.artists.length > 0 && (!song.workMbid || !song.iswc) && (
                  <button
                    onClick={() => handleEnrich(song.id)}
                    className="text-[11px] text-status-discovered hover:underline"
                    title="look up Work MBID and ISWC via MusicBrainz"
                  >
                    auto-fill ids
                  </button>
                )}
                <button
                  onClick={() => handleDelete(song.id)}
                  className="text-[11px] text-text-disabled hover:text-status-expired transition-colors"
                >
                  delete
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-text-muted">artists:</span>
              {song.artists.map((artist) => (
                <span
                  key={artist.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-bg-hover border border-border-subtle rounded-[2px] text-[11px]"
                >
                  {artist.artistName}
                  <button
                    onClick={() => handleUnlinkArtist(song.id, artist.id)}
                    className="text-text-disabled hover:text-status-expired ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
              {artists.length > 0 && (
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleLinkArtist(song.id, e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="bg-transparent border-b border-[#333] text-[11px] text-text-muted py-0.5 outline-none cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled>
                    + link artist
                  </option>
                  {artists
                    .filter(
                      (a) => !song.artists.find((sa) => sa.id === a.id)
                    )
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.artistName}
                      </option>
                    ))}
                </select>
              )}
            </div>
          </div>
        ))}

        {songs.length === 0 && (
          <div className="text-center py-12 text-text-muted text-[13px] space-y-2">
            <p>no songs yet — add your first song above</p>
            {artists.length === 0 && (
              <p>
                <a href="/artists" className="text-status-discovered hover:underline">
                  add artists first
                </a>{' '}
                so you can link them to your songs
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
