'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { analytics } from '@/lib/analytics';
import {
  COUNTRY_OPTIONS,
  getProsForCountry,
  CAPABILITY_OPTIONS,
  REFERRAL_SOURCES,
  type Capability,
} from '@/lib/constants';

const PRO_LABELS: Record<string, string> = {
  bmi: 'BMI',
  ascap: 'ASCAP',
  sesac: 'SESAC',
  gmr: 'GMR',
  prs: 'PRS',
  socan: 'SOCAN',
  apra: 'APRA AMCOS',
  gema: 'GEMA',
  sacem: 'SACEM',
  buma: 'BUMA/STEMRA',
};

export default function OnboardingPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [country, setCountry] = useState('US');
  const [city, setCity] = useState('');
  const [stageName, setStageName] = useState('');
  const [pro, setPro] = useState('');
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [referralSource, setReferralSource] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const availablePros = useMemo(() => getProsForCountry(country), [country]);

  // Reset selected PRO if it becomes invalid after country change
  if (pro && !availablePros.includes(pro as (typeof availablePros)[number])) {
    setPro('');
  }

  function toggleCapability(cap: Capability) {
    setCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  }

  const canSubmit =
    firstName.trim() &&
    lastName.trim() &&
    country &&
    stageName.trim() &&
    capabilities.length > 0;

  async function handleSubmit() {
    if (!canSubmit) {
      setError('please fill out all required fields');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          country,
          city: city.trim() || null,
          stageName: stageName.trim(),
          pro: pro || null,
          capabilities,
          referralSource: referralSource || null,
        }),
      });

      if (res.ok) {
        analytics.onboardingCompleted({
          pro: pro || 'none',
          role: capabilities.join(','),
        });
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
    <div className="min-h-[80vh] flex items-center justify-center py-12">
      <div className="w-full max-w-[520px] space-y-10 px-6">
        <div>
          <h1 className="text-[22px] font-light tracking-[-0.5px]">
            welcome to setlist royalty tracker
          </h1>
          <p className="text-[13px] text-text-muted mt-2">
            let&apos;s get you set up — takes about a minute.
          </p>
        </div>

        {/* SECTION 1 — YOUR INFO */}
        <section className="space-y-5">
          <div className="text-[10px] text-text-disabled tracking-[2px] uppercase">
            your info
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-text-muted block mb-1">
                first name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input w-full"
                autoFocus
              />
            </div>
            <div>
              <label className="text-[11px] text-text-muted block mb-1">
                last name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-text-muted block mb-1">
                country
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="input w-full"
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-text-muted block mb-1">
                city <span className="text-text-disabled">(optional)</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="input w-full"
                placeholder="e.g. Honolulu"
              />
            </div>
          </div>
        </section>

        {/* SECTION 2 — YOUR WORK */}
        <section className="space-y-5">
          <div className="text-[10px] text-text-disabled tracking-[2px] uppercase">
            your work
          </div>

          <div>
            <label className="text-[11px] text-text-muted block mb-1">
              stage name or artist name
            </label>
            <input
              type="text"
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
              placeholder="e.g. Nightly, Fred Again.., Four Tet"
              className="input w-full"
            />
            <p className="text-[10px] text-text-disabled mt-1">
              what you&apos;re publicly known as — could be your real name, a
              band, a dj name, or a producer alias.
            </p>
          </div>

          <div>
            <label className="text-[11px] text-text-muted block mb-2">
              which pro collects your royalties?{' '}
              <span className="text-text-disabled">
                (skip if you&apos;re not signed up yet)
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {availablePros.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setPro(opt)}
                  className={`btn text-[12px] ${
                    pro === opt ? 'bg-white text-black' : ''
                  }`}
                >
                  {PRO_LABELS[opt] || opt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] text-text-muted block mb-2">
              what do you do?{' '}
              <span className="text-text-disabled">
                (select all that apply)
              </span>
            </label>
            <div className="space-y-[2px]">
              {CAPABILITY_OPTIONS.map((opt) => {
                const isChecked = capabilities.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleCapability(opt.value)}
                    className={`card w-full text-left px-4 py-3 transition-colors ${
                      isChecked
                        ? 'ring-1 ring-white/40 bg-white/5'
                        : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-4 h-4 border mt-0.5 flex items-center justify-center shrink-0 ${
                          isChecked
                            ? 'border-white bg-white'
                            : 'border-border'
                        }`}
                      >
                        {isChecked && (
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 10 10"
                            className="text-black"
                          >
                            <path
                              d="M1 5 L4 8 L9 2"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              fill="none"
                            />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="text-[13px] font-medium">
                          {opt.label}
                        </div>
                        <div className="text-[11px] text-text-muted mt-0.5">
                          {opt.desc}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION 3 — REFERRAL (OPTIONAL) */}
        <section className="space-y-3">
          <div className="text-[10px] text-text-disabled tracking-[2px] uppercase">
            before you go
          </div>
          <div>
            <label className="text-[11px] text-text-muted block mb-1">
              how did you hear about us?{' '}
              <span className="text-text-disabled">(optional)</span>
            </label>
            <select
              value={referralSource}
              onChange={(e) => setReferralSource(e.target.value)}
              className="input w-full"
            >
              <option value="">select...</option>
              {REFERRAL_SOURCES.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>
        </section>

        {error && (
          <div className="text-[12px] text-status-expired">{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting || !canSubmit}
          className="btn w-full text-[13px] py-3 disabled:opacity-30"
        >
          {submitting ? 'setting up...' : 'continue'}
        </button>
      </div>
    </div>
  );
}
