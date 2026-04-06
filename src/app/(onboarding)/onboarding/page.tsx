'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { analytics } from '@/lib/analytics';

const PRO_OPTIONS = [
  { value: 'bmi', label: 'BMI' },
  { value: 'ascap', label: 'ASCAP' },
  { value: 'sesac', label: 'SESAC' },
  { value: 'gmr', label: 'GMR' },
] as const;

const ROLE_OPTIONS = [
  { value: 'songwriter', label: 'songwriter', desc: 'I write songs performed by others or myself' },
  { value: 'performer', label: 'performer', desc: 'I perform live and want to track my shows' },
  { value: 'publisher', label: 'publisher', desc: 'I manage royalties for songwriters' },
  { value: 'manager', label: 'manager', desc: 'I manage artists and their catalog' },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [pro, setPro] = useState('');
  const [role, setRole] = useState('');
  const [artistName, setArtistName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!pro || !role || !artistName.trim()) {
      setError('please fill out all fields');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pro, role, artistName: artistName.trim() }),
      });

      if (res.ok) {
        analytics.onboardingCompleted({ pro, role });
        router.push('/dashboard');
      } else {
        const data = await res.json();
        setError(data.error || 'something went wrong');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-[440px] space-y-8">
        <div>
          <h1 className="text-[22px] font-light tracking-[-0.5px]">
            welcome to setlist royalty tracker
          </h1>
          <p className="text-[13px] text-text-muted mt-2">
            let&apos;s get you set up — this only takes a minute.
          </p>
        </div>

        {/* PRO affiliation */}
        <div className="space-y-2">
          <label className="text-[11px] text-text-muted block">
            pro affiliation
          </label>
          <div className="flex gap-2">
            {PRO_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPro(opt.value)}
                className={`btn text-[12px] flex-1 ${
                  pro === opt.value ? 'bg-white text-black' : ''
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Role */}
        <div className="space-y-2">
          <label className="text-[11px] text-text-muted block">
            what best describes you?
          </label>
          <div className="space-y-[2px]">
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRole(opt.value)}
                className={`card w-full text-left px-4 py-3 transition-colors ${
                  role === opt.value
                    ? 'ring-1 ring-white/40 bg-white/5'
                    : 'hover:bg-white/[0.02]'
                }`}
              >
                <div className="text-[13px] font-medium">{opt.label}</div>
                <div className="text-[11px] text-text-muted mt-0.5">
                  {opt.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Artist / band name */}
        <div className="space-y-2">
          <label className="text-[11px] text-text-muted block">
            artist or band name
          </label>
          <input
            type="text"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            placeholder="e.g. Nightly, Fred Again.."
            className="input w-full"
          />
          <p className="text-[10px] text-text-disabled">
            we&apos;ll use this to search setlist.fm for your performances. you can add more later.
          </p>
        </div>

        {error && (
          <div className="text-[12px] text-status-expired">{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting || !pro || !role || !artistName.trim()}
          className="btn w-full text-[13px] py-3 disabled:opacity-30"
        >
          {submitting ? 'setting up...' : 'get started'}
        </button>
      </div>
    </div>
  );
}
