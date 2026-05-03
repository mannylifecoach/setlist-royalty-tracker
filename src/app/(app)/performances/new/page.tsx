'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Artist {
  id: string;
  artistName: string;
}

interface Song {
  id: string;
  title: string;
}

export default function NewPerformancePage() {
  const router = useRouter();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  const [eventDate, setEventDate] = useState('');
  const [artistId, setArtistId] = useState('');
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
  const [venueName, setVenueName] = useState('');
  const [venueCity, setVenueCity] = useState('');
  const [venueState, setVenueState] = useState('');
  const [venueCountry, setVenueCountry] = useState('');
  const [eventName, setEventName] = useState('');
  const [tourName, setTourName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/artists').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/songs').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([a, s]) => {
        setArtists(a);
        setSongs(s);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleSong(id: string) {
    setSelectedSongIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const canSubmit =
    !submitting &&
    eventDate !== '' &&
    artistId !== '' &&
    selectedSongIds.size > 0 &&
    venueName.trim() !== '' &&
    venueCity.trim() !== '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/performances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventDate,
          artistId,
          songIds: Array.from(selectedSongIds),
          venueName: venueName.trim(),
          venueCity: venueCity.trim(),
          venueState: venueState.trim() || null,
          venueCountry: venueCountry.trim() || null,
          eventName: eventName.trim() || null,
          tourName: tourName.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'failed to create performance');
        return;
      }

      router.push('/performances');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed to create performance');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-[640px] mx-auto">
        <div className="text-[12px] text-text-muted">loading...</div>
      </div>
    );
  }

  if (artists.length === 0 || songs.length === 0) {
    return (
      <div className="max-w-[640px] mx-auto space-y-6">
        <h1 className="text-[22px] font-light tracking-[-0.5px]">add performance</h1>
        <div className="card p-4 text-[12px] text-text-secondary leading-[1.6]">
          {artists.length === 0 && (
            <p>
              you don&apos;t have any tracked artists yet.{' '}
              <a href="/artists" className="text-status-discovered hover:underline">add an artist</a>{' '}
              first so we know who performed at the show.
            </p>
          )}
          {songs.length === 0 && (
            <p className="mt-2">
              you don&apos;t have any registered songs yet.{' '}
              <a href="/songs" className="text-status-discovered hover:underline">register a song</a>{' '}
              first so we know what was performed.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[640px] mx-auto space-y-8">
      <div>
        <h1 className="text-[22px] font-light tracking-[-0.5px]">add performance</h1>
        <p className="text-[13px] text-text-muted mt-2 leading-[1.5]">
          enter a show that setlist.fm doesn&apos;t have. setlist.fm is crowdsourced
          and often misses smaller venues, private events, and short festival sets.
          your manual entries flow through the same export and chrome extension as
          discovered performances.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="text-[11px] text-text-muted block mb-1">event date</label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="input w-full"
            required
          />
        </div>

        <div>
          <label className="text-[11px] text-text-muted block mb-1">tracked artist</label>
          <select
            value={artistId}
            onChange={(e) => setArtistId(e.target.value)}
            className="input w-full"
            required
          >
            <option value="">select an artist...</option>
            {artists.map((a) => (
              <option key={a.id} value={a.id}>{a.artistName}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label className="text-[11px] text-text-muted">songs performed</label>
            <span className="text-[10px] text-text-disabled">
              {selectedSongIds.size} selected
            </span>
          </div>
          <div className="card p-2 max-h-[280px] overflow-y-auto">
            {songs.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-2 px-2 py-1.5 text-[13px] hover:bg-bg-hover cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedSongIds.has(s.id)}
                  onChange={() => toggleSong(s.id)}
                />
                <span>{s.title}</span>
              </label>
            ))}
          </div>
          <p className="text-[10px] text-text-disabled mt-1">
            one performance row will be created per song.
          </p>
        </div>

        <div className="space-y-4">
          <div className="text-[11px] text-text-muted">venue</div>

          <div>
            <label className="text-[11px] text-text-muted block mb-1">venue name</label>
            <input
              type="text"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="e.g. The Echo, Red Rocks, Mercury Lounge"
              className="input w-full"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-text-muted block mb-1">city</label>
              <input
                type="text"
                value={venueCity}
                onChange={(e) => setVenueCity(e.target.value)}
                placeholder="Los Angeles"
                className="input w-full"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-text-muted block mb-1">state/region</label>
              <input
                type="text"
                value={venueState}
                onChange={(e) => setVenueState(e.target.value)}
                placeholder="CA"
                className="input w-full"
              />
            </div>
            <div>
              <label className="text-[11px] text-text-muted block mb-1">country</label>
              <input
                type="text"
                value={venueCountry}
                onChange={(e) => setVenueCountry(e.target.value)}
                placeholder="US"
                className="input w-full"
              />
            </div>
          </div>
        </div>

        <details className="text-[11px] text-text-muted">
          <summary className="cursor-pointer">optional details</summary>
          <div className="mt-3 space-y-4">
            <div>
              <label className="text-[11px] text-text-muted block mb-1">event name</label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. Coachella 2026, private wedding"
                className="input w-full"
              />
            </div>
            <div>
              <label className="text-[11px] text-text-muted block mb-1">tour name</label>
              <input
                type="text"
                value={tourName}
                onChange={(e) => setTourName(e.target.value)}
                placeholder="e.g. Spring Tour 2026"
                className="input w-full"
              />
            </div>
            <p className="text-[10px] text-text-disabled">
              address, attendance, capacity, and submission times can be added on the
              performance detail page after creation.
            </p>
          </div>
        </details>

        <button
          type="submit"
          disabled={!canSubmit}
          className="btn w-full py-3 text-[13px] disabled:opacity-30"
        >
          {submitting
            ? 'creating...'
            : `create ${selectedSongIds.size || ''} performance${selectedSongIds.size === 1 ? '' : 's'}`}
        </button>

        {error && (
          <div className="border border-status-expired/50 bg-status-expired/5 p-4 text-[12px] text-status-expired">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
