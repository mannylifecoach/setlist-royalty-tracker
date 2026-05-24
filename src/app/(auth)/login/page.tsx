'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { isValidSixDigitCode } from '@/lib/auth-code';

// Where we stash the email between the "send magic link" click and the
// verify screen so the user doesn't have to retype it on the PWA. Cleared
// after a successful sign-in.
const PENDING_EMAIL_KEY = 'srt-pending-signin-email';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const verify = searchParams.get('verify');
  const error = searchParams.get('error');

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-[360px] w-full text-center space-y-4">
          <Link
            href="/"
            className="flex flex-col items-center hover:opacity-50 transition-opacity"
          >
            <span
              className="text-[32px] lowercase tracking-[-2px] inline-block"
              style={{ fontFamily: "var(--font-marker), 'Sora', sans-serif", fontWeight: 800 }}
            >
              setlist
            </span>
            <span className="text-[14px] tracking-[-0.3px]">setlist royalty tracker</span>
          </Link>
          <h1 className="text-[18px] font-light tracking-[-0.3px]">
            sign-in link expired
          </h1>
          <p className="text-[13px] text-text-secondary">
            this link has already been used or has expired.
            links are single-use and expire after 24 hours.
          </p>
          <p className="text-[11px] text-text-muted">
            tip: if you have multiple sign-in emails, always use the newest one.
          </p>
          <Link href="/login" className="btn btn-primary inline-block px-8 py-2.5 text-[12px]">
            go to sign in
          </Link>
        </div>
      </div>
    );
  }

  if (verify) {
    return <VerifyScreen />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      // Stash the email so the verify screen can prefill it without making
      // the user retype on mobile (and so the PWA can complete sign-in via
      // the 6-digit code path without ever leaving the standalone context).
      localStorage.setItem(PENDING_EMAIL_KEY, email.trim());
    } catch {
      // localStorage can throw in private browsing; non-fatal — fall back to URL.
    }
    await signIn('resend', { email, callbackUrl: '/dashboard' });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-[360px] w-full space-y-6">
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="flex flex-col items-center hover:opacity-50 transition-opacity"
          >
            <span
              className="text-[32px] lowercase tracking-[-2px] inline-block"
              style={{ fontFamily: "var(--font-marker), 'Sora', sans-serif", fontWeight: 800 }}
            >
              setlist
            </span>
            <span className="text-[14px] tracking-[-0.3px]">setlist royalty tracker</span>
          </Link>
          <h1 className="text-[18px] font-light tracking-[-0.3px]">sign in</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your email address"
            required
            className="input"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? 'sending link...' : 'send magic link'}
          </button>
        </form>

        <p className="text-[11px] text-text-disabled text-center">
          we&apos;ll email you a link to sign in — no password needed
        </p>
      </div>
    </div>
  );
}

function VerifyScreen() {
  const router = useRouter();
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setPendingEmail(localStorage.getItem(PENDING_EMAIL_KEY));
    } catch {
      // private browsing — leave pendingEmail null; user can still use the magic link
    }
  }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingEmail || !isValidSixDigitCode(code)) return;
    setVerifying(true);
    setVerifyError(null);
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, code }),
      });
      if (res.ok) {
        try { localStorage.removeItem(PENDING_EMAIL_KEY); } catch { /* ignore */ }
        router.push('/dashboard');
        return;
      }
      if (res.status === 429) {
        setVerifyError('too many attempts — try again in a few minutes.');
      } else {
        const body = await res.json().catch(() => ({}));
        setVerifyError(body.error || 'something went wrong');
      }
    } catch {
      setVerifyError('network error — try again');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-[360px] w-full text-center space-y-4">
        <h1 className="text-[18px] font-light tracking-[-0.3px]">
          check your email
        </h1>
        {pendingEmail && (
          <p className="text-[12px] text-text-muted">
            we sent a sign-in email to{' '}
            <span className="text-text">{pendingEmail}</span>
          </p>
        )}
        <p className="text-[13px] text-text-secondary">
          tap the link in the email — or enter the 6-digit code below.
        </p>

        {pendingEmail && (
          <form onSubmit={handleVerify} className="space-y-3 pt-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                setVerifyError(null);
              }}
              placeholder="123456"
              className="input text-center text-[20px] tracking-[8px] font-mono"
              aria-label="6-digit sign-in code"
            />
            <button
              type="submit"
              disabled={!isValidSixDigitCode(code) || verifying}
              className="btn btn-primary w-full"
            >
              {verifying ? 'verifying...' : 'sign in with code'}
            </button>
            {verifyError && (
              <p className="text-[11px] text-status-expired">{verifyError}</p>
            )}
          </form>
        )}

        <p className="text-[11px] text-text-muted">
          look for the most recent email from notifications@setlistroyalty.com.
          the link and code both expire in 24 hours.
        </p>
        <Link href="/login" className="text-[12px] text-text-muted hover:opacity-50 transition-opacity">
          try again
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
