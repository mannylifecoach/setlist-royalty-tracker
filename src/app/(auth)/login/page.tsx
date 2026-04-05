'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { MorphingText } from '@/components/ui/morphing-text';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const verify = searchParams.get('verify');

  if (verify) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-[360px] w-full text-center space-y-4">
          <h1 className="text-[18px] font-light tracking-[-0.3px]">
            check your email
          </h1>
          <p className="text-[13px] text-text-secondary">
            we sent you a magic link. click it to sign in.
          </p>
          <Link href="/login" className="text-[12px] text-text-muted hover:opacity-50 transition-opacity">
            try again
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
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
            <MorphingText className="text-[32px]" />
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
