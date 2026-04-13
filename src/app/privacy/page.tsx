import type { Metadata } from 'next';
import Link from 'next/link';
import { MorphingText } from '@/components/ui/morphing-text';

export const metadata: Metadata = {
  title: 'privacy policy — setlist royalty tracker',
  description: 'how setlist royalty tracker collects, uses, and protects your data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-[2vw] py-[1.5vw] border-b border-border-subtle">
        <Link href="/" className="flex flex-col items-start hover:opacity-70 transition-opacity">
          <MorphingText className="text-[28px]" />
          <span className="text-[14px] tracking-[-0.3px]">setlist royalty tracker</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/about" className="btn text-[11px]">
            about
          </Link>
          <Link href="/login" className="btn text-[11px]">
            sign in
          </Link>
        </div>
      </nav>

      <main className="flex-1 px-[4vw] py-[6vw]">
        <div className="max-w-[640px] mx-auto space-y-10">
          <div className="text-center space-y-4">
            <h1 className="text-[28px] font-normal tracking-[-0.5px] leading-[1.2]">
              privacy policy
            </h1>
            <p className="text-text-muted text-[13px]">
              last updated: april 12, 2026
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">what this policy covers</h2>
            <p className="text-[13px] text-text-secondary leading-[1.7]">
              this privacy policy explains how setlist royalty tracker (&quot;srt,&quot; &quot;we,&quot; &quot;us&quot;)
              collects, uses, and protects your personal information when you use our web application
              at setlistroyalty.com and our chrome browser extension.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">data we collect</h2>
            <div className="card p-4 space-y-4">
              <div>
                <p className="text-[12px] text-text font-medium mb-1">account information</p>
                <p className="text-[12px] text-text-muted leading-[1.7]">
                  email address, first name, last name, stage name, city (optional),
                  country, and referral source (optional). collected during sign-up
                  and onboarding.
                </p>
              </div>
              <div>
                <p className="text-[12px] text-text font-medium mb-1">pro affiliation</p>
                <p className="text-[12px] text-text-muted leading-[1.7]">
                  your performing rights organization (bmi, ascap, sesac, gmr, or international
                  equivalents) and capabilities (songwriter, performer, dj, producer).
                </p>
              </div>
              <div>
                <p className="text-[12px] text-text font-medium mb-1">song catalog</p>
                <p className="text-[12px] text-text-muted leading-[1.7]">
                  song titles, tracked artist names, and metadata identifiers (bmi work id,
                  ascap work id, iswc, musicbrainz recording and work ids). you enter this
                  data manually or it is enriched automatically from musicbrainz.
                </p>
              </div>
              <div>
                <p className="text-[12px] text-text font-medium mb-1">performance data</p>
                <p className="text-[12px] text-text-muted leading-[1.7]">
                  discovered and confirmed live performances including event dates, venue names,
                  venue locations, attendance estimates, and submission status. sourced from
                  setlist.fm (crowdsourced) and serato dj history csv uploads.
                </p>
              </div>
              <div>
                <p className="text-[12px] text-text font-medium mb-1">usage analytics</p>
                <p className="text-[12px] text-text-muted leading-[1.7]">
                  we use posthog and vercel analytics to track anonymous product usage events
                  (e.g., onboarding completed, scan initiated, csv exported). we use sentry
                  for error monitoring. these tools may collect ip addresses, browser type,
                  and device information.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">how we use your data</h2>
            <ul className="space-y-2 text-[13px] text-text-secondary leading-[1.7]">
              <li className="flex gap-2">
                <span className="text-text-muted shrink-0">·</span>
                <span>to match your songs against live performance databases and identify unreported performances</span>
              </li>
              <li className="flex gap-2">
                <span className="text-text-muted shrink-0">·</span>
                <span>to generate csv exports and auto-fill pro submission forms via the chrome extension</span>
              </li>
              <li className="flex gap-2">
                <span className="text-text-muted shrink-0">·</span>
                <span>to send you email notifications about new discoveries, expiration warnings, and account updates</span>
              </li>
              <li className="flex gap-2">
                <span className="text-text-muted shrink-0">·</span>
                <span>to enrich your song metadata with musicbrainz identifiers for better matching accuracy</span>
              </li>
              <li className="flex gap-2">
                <span className="text-text-muted shrink-0">·</span>
                <span>to improve the product based on aggregate, anonymized usage patterns</span>
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">data we do not collect</h2>
            <ul className="space-y-2 text-[13px] text-text-secondary leading-[1.7]">
              <li className="flex gap-2">
                <span className="text-text-muted shrink-0">·</span>
                <span>passwords — we use magic link authentication only</span>
              </li>
              <li className="flex gap-2">
                <span className="text-text-muted shrink-0">·</span>
                <span>payment information — srt is currently free</span>
              </li>
              <li className="flex gap-2">
                <span className="text-text-muted shrink-0">·</span>
                <span>your pro login credentials — we never access your bmi, ascap, or other pro account</span>
              </li>
              <li className="flex gap-2">
                <span className="text-text-muted shrink-0">·</span>
                <span>audio files or music recordings</span>
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">third-party services</h2>
            <div className="card p-4 space-y-3 text-[12px] text-text-muted leading-[1.7]">
              <p>we use the following third-party services to operate srt:</p>
              <ul className="space-y-1">
                <li><strong className="text-text-secondary">vercel</strong> — hosting and deployment</li>
                <li><strong className="text-text-secondary">neon</strong> — postgresql database (your data is stored here)</li>
                <li><strong className="text-text-secondary">resend</strong> — transactional email delivery</li>
                <li><strong className="text-text-secondary">setlist.fm api</strong> — crowdsourced setlist data (read-only, we do not share your data with them)</li>
                <li><strong className="text-text-secondary">musicbrainz api</strong> — open music metadata (read-only)</li>
                <li><strong className="text-text-secondary">posthog</strong> — product analytics</li>
                <li><strong className="text-text-secondary">sentry</strong> — error monitoring</li>
                <li><strong className="text-text-secondary">uptimerobot</strong> — uptime monitoring</li>
                <li><strong className="text-text-secondary">cloudflare</strong> — dns and email routing</li>
              </ul>
              <p>
                we do not sell, rent, or share your personal data with advertisers or data brokers.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">data retention</h2>
            <p className="text-[13px] text-text-secondary leading-[1.7]">
              your account data and song catalog are retained for as long as your account is active.
              performance data is retained indefinitely to maintain your submission history.
              if you delete your account, all associated data will be permanently removed
              within 30 days.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">your rights</h2>
            <p className="text-[13px] text-text-secondary leading-[1.7]">
              you can update your profile information at any time from the settings page.
              you can opt out of email notifications from settings. to request a full export
              of your data or to delete your account, contact us at{' '}
              <a href="mailto:support@setlistroyalty.com" className="text-status-discovered hover:underline">
                support@setlistroyalty.com
              </a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">chrome extension</h2>
            <p className="text-[13px] text-text-secondary leading-[1.7]">
              the srt chrome extension communicates only with setlistroyalty.com using your
              api key. it reads form fields on bmi live (ols.bmi.com) to auto-fill performance
              data. it does not collect browsing history, inject ads, or communicate with any
              other server.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">security</h2>
            <p className="text-[13px] text-text-secondary leading-[1.7]">
              all data is transmitted over https. database access is restricted to application-level
              credentials. api routes are protected by session authentication and rate limiting.
              the chrome extension uses a per-user api key for authentication.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">changes to this policy</h2>
            <p className="text-[13px] text-text-secondary leading-[1.7]">
              we may update this privacy policy as srt evolves. significant changes will be
              communicated via email. the &quot;last updated&quot; date at the top reflects the most
              recent revision.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">contact</h2>
            <p className="text-[13px] text-text-secondary leading-[1.7]">
              for privacy questions, data requests, or concerns, email{' '}
              <a href="mailto:support@setlistroyalty.com" className="text-status-discovered hover:underline">
                support@setlistroyalty.com
              </a>.
            </p>
          </section>
        </div>
      </main>

      <footer className="px-[2vw] py-[1.5vw] border-t border-border-subtle text-center text-[11px] text-text-disabled">
        setlist royalty tracker · powered by setlist.fm api ·{' '}
        <a href="mailto:support@setlistroyalty.com" className="hover:text-text-muted transition-colors">
          support@setlistroyalty.com
        </a>
      </footer>
    </div>
  );
}
