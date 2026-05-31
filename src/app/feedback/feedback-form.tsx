'use client';

import { useState } from 'react';

type Context = 'bmi' | 'ascap' | 'extension' | 'general';

export function FeedbackForm({ prefillEmail }: { prefillEmail: string }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(prefillEmail);
  const [context, setContext] = useState<Context>('general');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'rate-limited'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 10) return;
    setSubmitting(true);
    setStatus('idle');
    setErrorMsg('');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          context,
          message: message.trim(),
          website: website.trim() || undefined,
        }),
      });

      if (res.ok) {
        setStatus('success');
        setMessage('');
        setName('');
        setWebsite('');
        return;
      }
      if (res.status === 429) {
        setStatus('rate-limited');
        return;
      }
      const body = await res.json().catch(() => ({}));
      setStatus('error');
      setErrorMsg(body.error || `request failed (status ${res.status})`);
    } catch {
      setStatus('error');
      setErrorMsg('network error — please try again');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'success') {
    return (
      <div className="card p-6 text-center space-y-4">
        <p className="text-[18px] text-status-confirmed">got it.</p>
        <p className="text-[13px] text-text-secondary leading-[1.6]">
          thanks for sending feedback. we read everything.
          {email && ' you should get a confirmation email shortly.'}
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="btn text-[12px]"
        >
          send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="fb-context" className="block text-[11px] text-text-muted">
          what is this about?
        </label>
        <select
          id="fb-context"
          value={context}
          onChange={(e) => setContext(e.target.value as Context)}
          className="input w-full"
        >
          <option value="general">general / something else</option>
          <option value="bmi">bmi flow (scan, filing, bmi live)</option>
          <option value="ascap">ascap flow (scan, filing, ascap onstage)</option>
          <option value="extension">chrome extension</option>
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="fb-name" className="block text-[11px] text-text-muted">
          your name (optional)
        </label>
        <input
          id="fb-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          className="input w-full"
          placeholder="mckay"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="fb-email" className="block text-[11px] text-text-muted">
          email (optional — we&apos;ll only use it to reply)
        </label>
        <input
          id="fb-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={200}
          className="input w-full"
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="fb-message" className="block text-[11px] text-text-muted">
          what&apos;s up?
        </label>
        <textarea
          id="fb-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={10}
          maxLength={5000}
          rows={8}
          className="input w-full"
          placeholder="i got stuck at step 3.4 because the API key field wouldn't accept my paste..."
        />
        <p className="text-[10px] text-text-disabled">
          {message.length}/5000 · min 10 characters
        </p>
      </div>

      {/* Honeypot — hidden from real users, bots will fill it in. Tab-skipped + screen-reader-hidden. */}
      <div aria-hidden="true" className="absolute -left-[9999px] w-0 h-0 overflow-hidden">
        <label htmlFor="fb-website">website (leave blank)</label>
        <input
          id="fb-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={submitting || message.trim().length < 10}
        className="btn btn-primary w-full"
      >
        {submitting ? 'sending...' : 'send feedback'}
      </button>

      {status === 'rate-limited' && (
        <p className="text-[12px] text-status-expiring text-center">
          too many submissions — please try again in an hour.
        </p>
      )}
      {status === 'error' && (
        <p className="text-[12px] text-status-expired text-center">{errorMsg}</p>
      )}
    </form>
  );
}
