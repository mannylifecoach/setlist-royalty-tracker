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

  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [enrichResults, setEnrichResults] = useState<Record<string, 'musicbrainz' | 'partial' | 'none'>>({});
  // Tracks songs where MusicBrainz returned no match in this session — button stays hidden
  // until page refresh. Prevents users from repeatedly clicking a dead-end API call.
  const [noMatchIds, setNoMatchIds] = useState<Set<string>>(new Set());

  async function handleEnrich(id: string) {
    setEnrichingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/songs/${id}/enrich-metadata`, {
        method: 'POST',
      });
      if (res.ok) {
        const data: { source: 'musicbrainz' | 'partial' | 'none' } = await res.json();
        setEnrichResults((prev) => ({ ...prev, [id]: data.source }));
        await loadSongs();
        // Partial and success messages clear after 5s; "no match" stays visible for 15s
        // and the button stays hidden for the rest of the session.
        if (data.source === 'none') {
          setNoMatchIds((prev) => new Set(prev).add(id));
        }
        const duration = data.source === 'none' ? 15000 : 5000;
        setTimeout(() => {
          setEnrichResults((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }, duration);
      }
    } finally {
      setEnrichingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
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
        <div className="flex flex-col md:flex-row md:items-start gap-3">
          <div className="card px-4 py-3 text-[12px] text-text-secondary flex-1 md:w-1/2 md:min-h-[64px]">
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

          {/* Improve matching — collapsible, sits next to the scan banner, equal width */}
          {songs.some((s) => !s.bmiWorkId || !s.ascapWorkId || !s.workMbid || !s.iswc) && (
            <details className="card p-4 text-[12px] text-text-secondary flex-1 md:w-1/2 md:min-h-[64px]">
              <summary className="cursor-pointer hover:text-text">
                <span className="text-text-muted">improve matching</span>
                <span className="text-text-disabled"> · optional</span>
              </summary>
              <div className="mt-3 space-y-3 text-[11px] text-text-muted leading-[1.6]">
                <p>every song has several ids from different organizations:</p>
                <ul className="space-y-1 pl-3">
                  <li><span className="text-text-secondary">bmi work id</span> — bmi&apos;s internal id, used in bmi csv exports</li>
                  <li><span className="text-text-secondary">ascap work id</span> — required for ascap onstage submissions</li>
                  <li><span className="text-text-secondary">iswc</span> — international code, links your song across pros globally</li>
                  <li><span className="text-text-secondary">musicbrainz id</span> — powers remix-matching during scans</li>
                </ul>
                <p>
                  click <span className="text-text-secondary">improve matching</span> on each song to auto-fill
                  iswc and musicbrainz ids from the open musicbrainz database.
                </p>
                <p>
                  if you see <span className="text-text-secondary">&quot;no match found on musicbrainz&quot;</span>,
                  it means your song isn&apos;t in their database yet — the button will hide so you don&apos;t keep
                  clicking a dead end. musicbrainz is community-maintained and grows over time, so check back
                  later or{' '}
                  <a
                    href="https://musicbrainz.org/doc/How_to_Add_a_Work"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-status-discovered hover:underline"
                  >
                    add your song to musicbrainz
                  </a>
                  {' '}yourself (it&apos;s free).
                </p>
                <p>need bmi or ascap work ids? find them here:</p>
                <div className="flex flex-col gap-1 pl-3">
                  {songs
                    .filter((s) => !s.bmiWorkId || !s.ascapWorkId)
                    .map((s) => (
                      <a
                        key={s.id}
                        href={songviewSearchUrl(s.iswc, s.title)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-status-discovered hover:underline"
                      >
                        look up &quot;{s.title}&quot; on songview →
                      </a>
                    ))}
                </div>
                <p>
                  the bmi live chrome extension doesn&apos;t need any of these ids — it searches your bmi
                  catalog by song title automatically.
                </p>
              </div>
            </details>
          )}
        </div>
      )}

      <div>
        {songs.map((song) => (
          <div key={song.id} className="px-4 py-4 border-b border-border-subtle">
            <div className="flex items-start justify-between mb-2 gap-4">
              <div className="flex-1 min-w-0">
                <span className="text-[14px] font-medium">{song.title}</span>
              </div>
              {/* IDs column — shows existing IDs, or "improve matching" link when something is missing */}
              <div className="flex flex-col items-end text-[11px] text-text-muted gap-0.5 shrink-0">
                {song.bmiWorkId && <span>bmi: {song.bmiWorkId}</span>}
                {song.ascapWorkId && <span>ascap: {song.ascapWorkId}</span>}
                {song.iswc && <span>iswc: {song.iswc}</span>}
                {song.artists.length > 0 && (!song.workMbid || !song.iswc) && !noMatchIds.has(song.id) && (
                  <button
                    onClick={() => handleEnrich(song.id)}
                    disabled={enrichingIds.has(song.id)}
                    className="text-status-discovered hover:underline disabled:text-text-muted disabled:cursor-wait"
                  >
                    {enrichingIds.has(song.id) ? 'looking up...' : 'improve matching →'}
                  </button>
                )}
                {enrichResults[song.id] === 'musicbrainz' && (
                  <span className="text-status-confirmed">✓ ids added</span>
                )}
                {enrichResults[song.id] === 'partial' && (
                  <span className="text-status-expiring">partial match — some ids added</span>
                )}
                {enrichResults[song.id] === 'none' && (
                  <span className="text-text-disabled">no match found on musicbrainz</span>
                )}
              </div>
              <button
                onClick={() => handleDelete(song.id)}
                className="text-[11px] text-text-disabled hover:text-status-expired transition-colors shrink-0"
              >
                delete
              </button>
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
