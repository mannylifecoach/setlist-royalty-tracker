'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';

export default function SettingsPage() {
  const [pro, setPro] = useState<'bmi' | 'ascap' | ''>('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
