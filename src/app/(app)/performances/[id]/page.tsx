'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/status-badge';
import type { PerformanceStatus } from '@/lib/constants';

interface PerformanceDetail {
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
  expiresAt: string | null;
  setlistFmUrl: string | null;
  tourName: string | null;
}

export default function PerformanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [perf, setPerf] = useState<PerformanceDetail | null>(null);
  const [songTitle, setSongTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const loadPerformance = useCallback(async function loadPerformance() {
    const res = await fetch('/api/performances');
    if (!res.ok) return;
    const all = await res.json();
    const match = all.find(
      (r: { performance: { id: string } }) => r.performance.id === id
    );
    if (match) {
      setPerf(match.performance);
      setSongTitle(match.song.title);
      setArtistName(match.artist.artistName);
    }
  }, [id]);

  useEffect(() => {
    loadPerformance();
  }, [loadPerformance]);

  async function handleSave(field: string, value: string | number | null) {
    setSaving(true);
    try {
      const res = await fetch(`/api/performances/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPerf(updated);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(status: PerformanceStatus) {
    await handleSave('status', status);
  }

  if (!perf) {
    return (
      <div className="text-center py-12 text-text-muted text-[13px]">
        loading...
      </div>
    );
  }

  const daysLeft = perf.expiresAt
    ? Math.ceil(
        (new Date(perf.expiresAt).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <div className="max-w-[600px] space-y-6">
      <button
        onClick={() => router.push('/performances')}
        className="text-[12px] text-text-muted hover:text-text transition-colors"
      >
        ← back to performances
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-light tracking-[-0.3px]">
            {songTitle}
          </h1>
          <p className="text-[13px] text-text-secondary mt-1">
            by {artistName} · {perf.eventDate}
          </p>
        </div>
        <StatusBadge status={perf.status} />
      </div>

      {perf.tourName && (
        <div className="text-[12px] text-text-muted">
          tour: {perf.tourName}
        </div>
      )}

      {daysLeft !== null && (
        <div
          className={`text-[12px] ${
            daysLeft <= 30
              ? 'text-status-expiring'
              : daysLeft <= 0
                ? 'text-status-expired'
                : 'text-text-muted'
          }`}
        >
          {daysLeft > 0
            ? `expires in ${daysLeft} days (${perf.expiresAt})`
            : `expired on ${perf.expiresAt}`}
        </div>
      )}

      {perf.setlistFmUrl && (
        <a
          href={perf.setlistFmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] text-status-discovered hover:underline"
        >
          view on setlist.fm →
        </a>
      )}

      <div className="card p-4 space-y-4">
        <div className="text-[11px] text-text-muted">venue details</div>

        <EditableField
          label="venue name"
          value={perf.venueName}
          onSave={(v) => handleSave('venueName', v)}
        />
        <EditableField
          label="address"
          value={perf.venueAddress}
          onSave={(v) => handleSave('venueAddress', v)}
        />
        <div className="grid grid-cols-3 gap-3">
          <EditableField
            label="city"
            value={perf.venueCity}
            onSave={(v) => handleSave('venueCity', v)}
          />
          <EditableField
            label="state"
            value={perf.venueState}
            onSave={(v) => handleSave('venueState', v)}
          />
          <EditableField
            label="country"
            value={perf.venueCountry}
            onSave={(v) => handleSave('venueCountry', v)}
          />
        </div>
        <EditableField
          label="phone"
          value={perf.venuePhone}
          onSave={(v) => handleSave('venuePhone', v)}
        />
        <EditableField
          label="attendance"
          value={perf.attendance?.toString() || null}
          onSave={(v) => handleSave('attendance', v ? parseInt(v, 10) : null)}
          type="number"
        />
      </div>

      <div className="flex gap-2">
        {perf.status === 'discovered' && (
          <button
            onClick={() => handleStatusChange('confirmed')}
            disabled={saving}
            className="btn"
          >
            confirm
          </button>
        )}
        {(perf.status === 'confirmed' || perf.status === 'discovered') && (
          <button
            onClick={() => handleStatusChange('submitted')}
            disabled={saving}
            className="btn"
          >
            mark as submitted
          </button>
        )}
        {perf.status !== 'ineligible' && perf.status !== 'submitted' && (
          <button
            onClick={() => handleStatusChange('ineligible')}
            disabled={saving}
            className="text-[11px] text-text-disabled hover:text-status-expired transition-colors"
          >
            mark ineligible
          </button>
        )}
      </div>
    </div>
  );
}

function EditableField({
  label,
  value,
  onSave,
  type = 'text',
}: {
  label: string;
  value: string | null;
  onSave: (value: string | null) => void;
  type?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');

  if (!editing) {
    return (
      <div
        onClick={() => {
          setDraft(value || '');
          setEditing(true);
        }}
        className="cursor-pointer group"
      >
        <div className="text-[11px] text-text-muted">{label}</div>
        <div className="text-[13px] text-text-secondary group-hover:text-text transition-colors">
          {value || (
            <span className="text-text-disabled italic">click to add</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-[11px] text-text-muted">{label}</div>
      <div className="flex gap-2">
        <input
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSave(draft.trim() || null);
              setEditing(false);
            }
            if (e.key === 'Escape') setEditing(false);
          }}
          className="input flex-1"
          autoFocus
        />
        <button
          onClick={() => {
            onSave(draft.trim() || null);
            setEditing(false);
          }}
          className="btn text-[10px] px-2 py-1"
        >
          save
        </button>
      </div>
    </div>
  );
}
