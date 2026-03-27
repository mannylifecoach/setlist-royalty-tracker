'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';

export default function SettingsPage() {
  const [pro, setPro] = useState<'bmi' | 'ascap' | ''>('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyPreview, setApiKeyPreview] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setPro(data.pro || '');
        setName(data.name || '');
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

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pro: pro || null, name: name || null }),
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
    <div className="space-y-6 max-w-[400px]">
      <h1 className="text-[18px] font-light tracking-[-0.3px]">settings</h1>

      <div className="card p-4 space-y-4">
        <div>
          <label className="text-[11px] text-text-muted block mb-1">name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="your name"
            className="input"
          />
        </div>

        <div>
          <label className="text-[11px] text-text-muted block mb-1">
            pro affiliation
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setPro('bmi')}
              className={`btn text-[12px] ${pro === 'bmi' ? 'bg-white text-black' : ''}`}
            >
              bmi
            </button>
            <button
              onClick={() => setPro('ascap')}
              className={`btn text-[12px] ${pro === 'ascap' ? 'bg-white text-black' : ''}`}
            >
              ascap
            </button>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn">
          {saving ? 'saving...' : saved ? 'saved' : 'save settings'}
        </button>
      </div>

      <div className="card p-4 space-y-4">
        <div className="text-[11px] text-text-muted">chrome extension</div>
        <p className="text-[12px] text-text-secondary">
          generate an api key to connect the bmi live auto-fill chrome extension.
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
