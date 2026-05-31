import type { Metadata } from 'next';
import Link from 'next/link';
import { MorphingText } from '@/components/ui/morphing-text';

export const metadata: Metadata = {
  title: 'mobile — setlist royalty tracker',
  description: 'what you can do on your phone with srt: install as a home-screen app, sign in, add artists + songs, run scans, confirm performances. filing to bmi or ascap still requires desktop chrome.',
};

export default function MobileHelpPage() {
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
        <div className="max-w-[640px] mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-[28px] font-normal tracking-[-0.5px] leading-[1.2]">
              what you can do on mobile
            </h1>
            <p className="text-text-muted text-[13px] leading-[1.6] max-w-[460px] mx-auto">
              srt is mobile-first for everything except the final filing step. install it
              to your home screen, sign in with a 6-digit code, and run your whole review
              workflow from your phone.
            </p>
          </div>

          {/* What you CAN do on mobile */}
          <section className="space-y-4">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">on your phone</h2>
            <p className="text-text-secondary text-[13px] leading-[1.7]">
              install srt as a home-screen app and do all of this from your phone:
            </p>
            <ul className="space-y-2 text-[13px] text-text-secondary leading-[1.7]">
              <li className="flex gap-3">
                <span className="text-status-confirmed font-medium shrink-0">✓</span>
                <span>sign up + complete onboarding (name, pro, capabilities)</span>
              </li>
              <li className="flex gap-3">
                <span className="text-status-confirmed font-medium shrink-0">✓</span>
                <span>add tracked artists from setlist.fm</span>
              </li>
              <li className="flex gap-3">
                <span className="text-status-confirmed font-medium shrink-0">✓</span>
                <span>register your songs + link them to artists</span>
              </li>
              <li className="flex gap-3">
                <span className="text-status-confirmed font-medium shrink-0">✓</span>
                <span>connect bandsintown for self-discovery of your own past tour dates</span>
              </li>
              <li className="flex gap-3">
                <span className="text-status-confirmed font-medium shrink-0">✓</span>
                <span>run scans to find new performances on setlist.fm</span>
              </li>
              <li className="flex gap-3">
                <span className="text-status-confirmed font-medium shrink-0">✓</span>
                <span>review + confirm performances, edit venue details, delete bad rows</span>
              </li>
              <li className="flex gap-3">
                <span className="text-status-confirmed font-medium shrink-0">✓</span>
                <span>mark performances as submitted (after you file from desktop)</span>
              </li>
              <li className="flex gap-3">
                <span className="text-status-confirmed font-medium shrink-0">✓</span>
                <span>generate + regenerate api keys for the chrome extension</span>
              </li>
            </ul>
          </section>

          {/* What requires desktop */}
          <section className="space-y-4">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">requires desktop chrome</h2>
            <p className="text-text-secondary text-[13px] leading-[1.7]">
              one thing has to happen on a desktop or laptop with google chrome (or any
              chromium browser — edge, brave, arc):
            </p>
            <ul className="space-y-2 text-[13px] text-text-secondary leading-[1.7]">
              <li className="flex gap-3">
                <span className="text-status-expired font-medium shrink-0">✗</span>
                <span>
                  install + run the{' '}
                  <Link href="/help/chrome-extension" className="text-status-discovered hover:underline">
                    srt chrome extension
                  </Link>{' '}
                  to auto-fill bmi live or ascap onstage forms
                </span>
              </li>
            </ul>
            <p className="text-text-secondary text-[13px] leading-[1.7]">
              <span className="text-text font-medium">why?</span>{' '}
              the extension uses chrome&apos;s deep browser-control hook (chrome.debugger),
              which apple and google deliberately don&apos;t expose on ios or android. no
              mobile platform — including chrome on iphone — can auto-fill bmi or ascap.
              that&apos;s a platform-policy limit, not a missing feature.
            </p>
          </section>

          {/* Install as PWA */}
          <section className="space-y-4">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">install srt to your home screen</h2>
            <p className="text-text-secondary text-[13px] leading-[1.7]">
              once installed as a home-screen app (pwa), srt opens full-screen with no
              browser bar — feels like a real app.
            </p>

            <h3 className="text-[13px] font-medium text-text-secondary mt-4">on iphone (safari)</h3>
            <ol className="space-y-3 text-[13px] text-text-secondary leading-[1.7]">
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">1.</span>
                <span>open this site in safari (not chrome on ios)</span>
              </li>
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">2.</span>
                <span>tap the share button in safari&apos;s bottom toolbar (square with up-arrow)</span>
              </li>
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">3.</span>
                <span>
                  scroll down → tap{' '}
                  <span className="text-text font-medium">add to home screen</span>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">4.</span>
                <span>tap the srt icon from your home screen to open</span>
              </li>
            </ol>

            <h3 className="text-[13px] font-medium text-text-secondary mt-4">on android (chrome)</h3>
            <ol className="space-y-3 text-[13px] text-text-secondary leading-[1.7]">
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">1.</span>
                <span>open this site in chrome</span>
              </li>
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">2.</span>
                <span>
                  tap the ⋮ menu (top right) → tap{' '}
                  <span className="text-text font-medium">install app</span>{' '}
                  or{' '}
                  <span className="text-text font-medium">add to home screen</span>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">3.</span>
                <span>tap the srt icon from your home screen to open</span>
              </li>
            </ol>
          </section>

          {/* 6-digit code sign-in */}
          <section className="space-y-4">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">sign in with a 6-digit code</h2>
            <p className="text-text-secondary text-[13px] leading-[1.7]">
              when you install srt as a home-screen app, magic-link emails open in your
              regular browser instead of the installed app — so your sign-in lands in the
              wrong window. the 6-digit code in the same email lets the app sign itself
              in directly.
            </p>
            <ol className="space-y-3 text-[13px] text-text-secondary leading-[1.7]">
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">1.</span>
                <span>request a sign-in email from the installed app</span>
              </li>
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">2.</span>
                <span>
                  in the email, find the 6-digit code (big monospace box — don&apos;t tap
                  the link in the email)
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">3.</span>
                <span>switch back to the installed srt app and type in the code</span>
              </li>
            </ol>
          </section>

          {/* Workflow */}
          <section className="space-y-4">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">recommended workflow</h2>
            <ol className="space-y-3 text-[13px] text-text-secondary leading-[1.7]">
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">1.</span>
                <span>
                  <span className="text-text font-medium">on phone:</span>{' '}
                  setup once (install pwa, sign in, add artists + songs, link them, run a scan)
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">2.</span>
                <span>
                  <span className="text-text font-medium">on phone, ongoing:</span>{' '}
                  triage new performances when they show up in your scans — confirm, edit,
                  or delete from your{' '}
                  <Link href="/performances" className="text-status-discovered hover:underline">
                    performances
                  </Link>{' '}
                  page
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">3.</span>
                <span>
                  <span className="text-text font-medium">on desktop, batched:</span>{' '}
                  every few weeks, open desktop chrome → go to{' '}
                  <Link href="/export" className="text-status-discovered hover:underline">
                    export
                  </Link>{' '}
                  → click open bmi live (or ascap onstage) → file your confirmed
                  performances with the extension
                </span>
              </li>
            </ol>
          </section>

          <div className="text-center space-y-4 pt-4">
            <p className="text-[11px] text-text-disabled">
              need help?{' '}
              <a href="mailto:support@setlistroyalty.com" className="text-text-muted hover:underline">
                support@setlistroyalty.com
              </a>
            </p>
          </div>
        </div>
      </main>

      <footer className="px-[4vw] py-6 text-center text-[10px] text-text-disabled border-t border-border-subtle">
        setlist royalty tracker · powered by setlist.fm api ·{' '}
        <a href="mailto:support@setlistroyalty.com" className="hover:underline">
          support@setlistroyalty.com
        </a>
        {' '}·{' '}
        <a href="/privacy" className="hover:underline">privacy</a>
      </footer>
    </div>
  );
}
