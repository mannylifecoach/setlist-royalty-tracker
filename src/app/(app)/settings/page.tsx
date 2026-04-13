'use client';

import { useState, useEffect, useMemo } from 'react';
import { signOut } from 'next-auth/react';
import { analytics } from '@/lib/analytics';
import {
  COUNTRY_OPTIONS,
  getProsForCountry,
  CAPABILITY_OPTIONS,
  BMI_HOURS,
  type Capability,
} from '@/lib/constants';

type Pro = 'bmi' | 'ascap' | 'sesac' | 'gmr' | 'prs' | 'socan' | 'apra' | 'gema' | 'sacem' | 'buma';

const PRO_LABELS: Record<string, string> = {
  bmi: 'BMI',
  ascap: 'ASCAP',
  sesac: 'SESAC',
  gmr: 'GMR',
  prs: 'PRS',
  socan: 'SOCAN',
  apra: 'APRA',
  gema: 'GEMA',
  sacem: 'SACEM',
  buma: 'BUMA',
};

export default function SettingsPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [country, setCountry] = useState('US');
  const [city, setCity] = useState('');
  const [stageName, setStageName] = useState('');
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [pro, setPro] = useState<Pro | ''>('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [defaultStartTimeHour, setDefaultStartTimeHour] = useState('8:00');
  const [defaultStartTimeAmPm, setDefaultStartTimeAmPm] = useState('PM');
  const [defaultEndTimeHour, setDefaultEndTimeHour] = useState('11:00');
  const [defaultEndTimeAmPm, setDefaultEndTimeAmPm] = useState('PM');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyPreview, setApiKeyPreview] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);

  const availablePros = useMemo(() => getProsForCountry(country), [country]);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
        setCountry(data.country || 'US');
        setCity(data.city || '');
        setStageName(data.stageName || '');
        setCapabilities(Array.isArray(data.capabilities) ? data.capabilities : []);
        setPro(data.pro || '');
        setEmailNotifications(data.emailNotifications ?? true);
        setDefaultStartTimeHour(data.defaultStartTimeHour || '8:00');
        setDefaultStartTimeAmPm(data.defaultStartTimeAmPm || 'PM');
        setDefaultEndTimeHour(data.defaultEndTimeHour || '11:00');
        setDefaultEndTimeAmPm(data.defaultEndTimeAmPm || 'PM');
      }
    }
    load();
    async function loadApiKey() {
      const res = await fetch('/api/settings/api-key');
      if (res.ok) {
        const data = await res.json();
        setHasApiKey(data.hasApiKey);
        setApiKeyPreview(data.apiKeyPreview);
      }
    }
    loadApiKey();
  }, []);

  function toggleCapability(cap: Capability) {
    setCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName || null,
          lastName: lastName || null,
          country: country || null,
          city: city || null,
          stageName: stageName || null,
          capabilities,
          pro: pro || null,
          emailNotifications,
          defaultStartTimeHour,
          defaultStartTimeAmPm,
          defaultEndTimeHour,
          defaultEndTimeAmPm,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-[520px] mx-auto">
      <h1 className="text-[18px] font-light tracking-[-0.3px]">settings</h1>

      <div className="card p-4 space-y-5">
        <div className="text-[10px] text-text-disabled tracking-[2px] uppercase">
          your info
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-text-muted block mb-1">first name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="text-[11px] text-text-muted block mb-1">last name</label>
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
            <label className="text-[11px] text-text-muted block mb-1">country</label>
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                // Reset PRO if it's no longer valid for the new country
                if (pro && !getProsForCountry(e.target.value).includes(pro)) {
                  setPro('');
                }
              }}
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
            />
          </div>
        </div>

        <div className="text-[10px] text-text-disabled tracking-[2px] uppercase pt-2">
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
            className="input w-full"
          />
        </div>

        <div>
          <label className="text-[11px] text-text-muted block mb-2">
            pro affiliation
          </label>
          <div className="flex flex-wrap gap-2">
            {availablePros.map((p) => (
              <button
                key={p}
                onClick={() => setPro(p)}
                className={`btn text-[12px] ${pro === p ? 'bg-white text-black' : ''}`}
              >
                {PRO_LABELS[p] || p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] text-text-muted block mb-2">
            what do you do?{' '}
            <span className="text-text-disabled">(select all that apply)</span>
          </label>
          <div className="space-y-[2px]">
            {CAPABILITY_OPTIONS.map((opt) => {
              const isChecked = capabilities.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleCapability(opt.value)}
                  className={`w-full text-left px-3 py-2 border transition-colors ${
                    isChecked
                      ? 'border-white bg-white/5'
                      : 'border-border-subtle hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 border ${
                        isChecked ? 'border-white bg-white' : 'border-border'
                      }`}
                    />
                    <span className="text-[12px]">{opt.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn">
          {saving ? 'saving...' : saved ? 'saved' : 'save settings'}
        </button>
      </div>

      <div className="card p-4 space-y-3">
        <div className="text-[11px] text-text-muted">notifications</div>
        <button
          onClick={() => setEmailNotifications(!emailNotifications)}
          className="flex items-center justify-between w-full group"
        >
          <span className="text-[12px] text-text-secondary">
            email notifications
          </span>
          <span
            className={`relative inline-block w-[36px] h-[18px] border transition-colors ${
              emailNotifications
                ? 'bg-white border-white'
                : 'bg-transparent border-[#222]'
            }`}
          >
            <span
              className={`absolute top-[2px] w-[12px] h-[12px] transition-all ${
                emailNotifications
                  ? 'left-[20px] bg-black'
                  : 'left-[2px] bg-[#444]'
              }`}
            />
          </span>
        </button>
        <p className="text-[11px] text-text-disabled">
          {emailNotifications
            ? 'you\'ll receive emails about new performances and expiration warnings.'
            : 'email notifications are off. you can still check your dashboard for updates.'}
        </p>
        <button onClick={handleSave} disabled={saving} className="btn text-[12px]">
          {saving ? 'saving...' : saved ? 'saved' : 'save'}
        </button>
      </div>

      <div className="card p-4 space-y-4">
        <div className="text-[11px] text-text-muted">default performance times</div>
        <p className="text-[11px] text-text-disabled">
          bmi live requires start and end times for each performance. set your defaults here —
          they&apos;ll be used for new performances. you can override them per-performance.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] text-text-muted block mb-1">start time</label>
            <div className="flex gap-2">
              <select
                value={defaultStartTimeHour}
                onChange={(e) => setDefaultStartTimeHour(e.target.value)}
                className="input flex-1"
              >
                {BMI_HOURS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <select
                value={defaultStartTimeAmPm}
                onChange={(e) => setDefaultStartTimeAmPm(e.target.value)}
                className="input w-[60px]"
              >
                <option value="AM">am</option>
                <option value="PM">pm</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] text-text-muted block mb-1">end time</label>
            <div className="flex gap-2">
              <select
                value={defaultEndTimeHour}
                onChange={(e) => setDefaultEndTimeHour(e.target.value)}
                className="input flex-1"
              >
                {BMI_HOURS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <select
                value={defaultEndTimeAmPm}
                onChange={(e) => setDefaultEndTimeAmPm(e.target.value)}
                className="input w-[60px]"
              >
                <option value="AM">am</option>
                <option value="PM">pm</option>
              </select>
            </div>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn text-[12px]">
          {saving ? 'saving...' : saved ? 'saved' : 'save'}
        </button>
      </div>

      <div className="card p-4 space-y-4">
        <div className="text-[11px] text-text-muted">chrome extension <span className="text-text-disabled">· requires google chrome</span></div>
        <p className="text-[12px] text-text-secondary">
          generate an api key to connect the bmi live auto-fill chrome extension. requires google chrome (or any chromium-based browser like edge, brave, or arc). on safari or firefox? use the csv export instead.
        </p>
        {apiKey && (
          <div className="space-y-2">
            <div className="text-[11px] text-text-muted">
              copy this key now — it won&apos;t be shown again
            </div>
            <code className="block bg-black/30 border border-white/10 rounded px-3 py-2 text-[12px] text-status-discovered break-all select-all">
              {apiKey}
            </code>
          </div>
        )}
        {!apiKey && hasApiKey && (
          <div className="text-[12px] text-text-secondary">
            key: <span className="font-mono">{apiKeyPreview}</span>
          </div>
        )}
        <button
          onClick={async () => {
            setGeneratingKey(true);
            try {
              const res = await fetch('/api/settings/api-key', { method: 'POST' });
              if (res.ok) {
                const data = await res.json();
                analytics.extensionApiKeyGenerated();
                setApiKey(data.apiKey);
                setHasApiKey(true);
                setApiKeyPreview(null);
              }
            } finally {
              setGeneratingKey(false);
            }
          }}
          disabled={generatingKey}
          className="btn text-[12px]"
        >
          {generatingKey
            ? 'generating...'
            : hasApiKey
              ? 'regenerate api key'
              : 'generate api key'}
        </button>
      </div>

      <div className="card p-4">
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="text-[12px] text-text-disabled hover:text-status-expired transition-colors"
        >
          sign out
        </button>
      </div>
    </div>
  );
}
