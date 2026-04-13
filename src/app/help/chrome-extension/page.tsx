import type { Metadata } from 'next';
import Link from 'next/link';
import { MorphingText } from '@/components/ui/morphing-text';

export const metadata: Metadata = {
  title: 'chrome extension — setlist royalty tracker',
  description: 'install and use the srt chrome extension to auto-fill bmi live and ascap onstage forms directly from your confirmed performances.',
};

export default function ChromeExtensionHelpPage() {
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
              chrome extension
            </h1>
            <p className="text-text-muted text-[13px] leading-[1.6] max-w-[460px] mx-auto">
              auto-fill your bmi live or ascap onstage forms directly from srt —
              no csv needed, no copy-pasting.
            </p>
          </div>

          {/* What it does */}
          <section className="space-y-4">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">what it does</h2>
            <p className="text-text-secondary text-[13px] leading-[1.7]">
              the srt chrome extension connects your confirmed performances to the bmi live
              submission form. when you open bmi live in chrome, click the extension icon and
              it auto-fills venue details, setlist data, and performance info — one click per
              performance instead of manually entering every field.
            </p>
          </section>

          {/* Install */}
          <section className="space-y-4">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">install the extension</h2>
            <p className="text-text-secondary text-[13px] leading-[1.7]">
              the extension is currently available as a direct download. chrome web store
              listing is coming soon.
            </p>
            <ol className="space-y-3 text-[13px] text-text-secondary leading-[1.7]">
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">1.</span>
                <span>
                  download the extension zip file from your srt dashboard or request it
                  from{' '}
                  <a href="mailto:support@setlistroyalty.com" className="text-status-discovered hover:underline">
                    support@setlistroyalty.com
                  </a>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">2.</span>
                <span>unzip the file to a folder on your computer</span>
              </li>
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">3.</span>
                <span>
                  open chrome and go to{' '}
                  <code className="text-[11px] bg-bg-card px-1.5 py-0.5 rounded-[2px] border border-border-subtle">
                    chrome://extensions
                  </code>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">4.</span>
                <span>
                  enable{' '}
                  <span className="text-text font-medium">developer mode</span>{' '}
                  (toggle in the top-right corner)
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">5.</span>
                <span>
                  click{' '}
                  <span className="text-text font-medium">load unpacked</span>{' '}
                  and select the unzipped extension folder
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">6.</span>
                <span>
                  pin the srt extension to your toolbar for easy access
                </span>
              </li>
            </ol>
          </section>

          {/* API Key */}
          <section className="space-y-4">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">generate your api key</h2>
            <p className="text-text-secondary text-[13px] leading-[1.7]">
              the extension needs an api key to securely pull your performance data from srt.
            </p>
            <ol className="space-y-3 text-[13px] text-text-secondary leading-[1.7]">
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">1.</span>
                <span>
                  go to{' '}
                  <Link href="/settings" className="text-status-discovered hover:underline">
                    settings
                  </Link>{' '}
                  in your srt account
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">2.</span>
                <span>
                  scroll to the{' '}
                  <span className="text-text font-medium">chrome extension api key</span>{' '}
                  section
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">3.</span>
                <span>
                  click{' '}
                  <span className="text-text font-medium">generate api key</span>{' '}
                  and copy it
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">4.</span>
                <span>
                  open the srt extension popup (click the icon in your toolbar),
                  paste the key, and save
                </span>
              </li>
            </ol>
          </section>

          {/* Using it */}
          <section className="space-y-4">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">auto-fill a performance</h2>
            <p className="text-text-secondary text-[13px] leading-[1.7]">
              once installed and connected, here&apos;s how to submit a performance:
            </p>
            <ol className="space-y-3 text-[13px] text-text-secondary leading-[1.7]">
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">1.</span>
                <span>
                  confirm your performances in srt on the{' '}
                  <Link href="/performances" className="text-status-discovered hover:underline">
                    performances
                  </Link>{' '}
                  page
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">2.</span>
                <span>
                  go to the{' '}
                  <Link href="/export" className="text-status-discovered hover:underline">
                    export
                  </Link>{' '}
                  page and click{' '}
                  <span className="text-text font-medium">open bmi live</span>{' '}
                  (or ascap onstage)
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">3.</span>
                <span>
                  on the bmi live form, click the srt extension icon — it will detect
                  the form and show your confirmed performances
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">4.</span>
                <span>
                  select a performance and click{' '}
                  <span className="text-text font-medium">auto-fill</span>{' '}
                  — srt fills in venue, date, setlist, and other details
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-text-muted font-medium shrink-0">5.</span>
                <span>
                  review the filled form, make any corrections, and submit to your pro
                </span>
              </li>
            </ol>
          </section>

          {/* Troubleshooting */}
          <section className="space-y-4">
            <h2 className="text-[16px] font-medium tracking-[-0.3px]">common pitfalls</h2>
            <div className="space-y-3 text-[13px] text-text-secondary leading-[1.7]">
              <div className="card p-3">
                <p className="text-text font-medium text-[12px] mb-1">extension not showing performances?</p>
                <p>make sure you&apos;ve generated an api key in settings and pasted it into the extension popup. also confirm your performances are marked as &quot;confirmed&quot; — discovered performances won&apos;t appear.</p>
              </div>
              <div className="card p-3">
                <p className="text-text font-medium text-[12px] mb-1">auto-fill missed some fields?</p>
                <p>some fields like venue address or phone may be missing from our data sources. you&apos;ll see &quot;missing fields&quot; warnings on the export page — fill those in on bmi live manually before submitting.</p>
              </div>
              <div className="card p-3">
                <p className="text-text font-medium text-[12px] mb-1">requires google chrome</p>
                <p>the extension only works in google chrome (or chromium-based browsers like brave or edge). if you use safari or firefox, download the csv from the export page instead.</p>
              </div>
            </div>
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
