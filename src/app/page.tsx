import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-[2vw] py-[1.5vw] border-b border-border-subtle">
        <span className="text-[14px] tracking-[-0.3px]">
          setlist royalty tracker
        </span>
        <Link href="/login" className="btn text-[11px]">
          sign in
        </Link>
      </nav>

      <main className="flex-1 flex items-center justify-center px-[4vw] py-[6vw]">
        <div className="max-w-[640px] text-center space-y-12">
          <h1 className="text-[36px] font-normal tracking-[-1px] leading-[1.1]">
            stop leaving royalties
            <br />
            on the table
          </h1>

          <p className="text-text-secondary text-[14px] leading-[1.5] max-w-[460px] mx-auto">
            bmi and ascap only auto-track the top 200-300 tours. every other
            live performance goes unreported unless you manually log it.
            setlist.fm has 9.6m+ crowdsourced setlists — we bridge that gap.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[1px]">
            <div className="border border-border-subtle p-6">
              <div className="text-[11px] text-text-muted mb-3">monitor</div>
              <p className="text-[12px] text-text-secondary leading-[1.5]">
                we scan setlist.fm for performances of your songs by artists you
                track
              </p>
            </div>
            <div className="border border-border-subtle p-6">
              <div className="text-[11px] text-text-muted mb-3">review</div>
              <p className="text-[12px] text-text-secondary leading-[1.5]">
                verify discovered performances, fill in venue details, track
                expiration dates
              </p>
            </div>
            <div className="border border-border-subtle p-6">
              <div className="text-[11px] text-text-muted mb-3">submit</div>
              <p className="text-[12px] text-text-secondary leading-[1.5]">
                auto-fill bmi live forms with our chrome extension, or export
                csv for manual upload
              </p>
            </div>
          </div>

          <div className="border border-border-subtle p-6 text-left space-y-3">
            <div className="text-[11px] text-text-muted">chrome extension</div>
            <p className="text-[13px] text-text-secondary leading-[1.5]">
              skip the manual data entry. our chrome extension pre-fills bmi
              live&apos;s 3-step wizard — performer, venue, dates, setlist — directly
              from your confirmed performances. just review and click submit.
            </p>
            <p className="text-[11px] text-text-disabled">
              5+ minutes of typing per show → ~30 seconds of review
            </p>
          </div>

          <div className="space-y-4">
            <Link href="/login" className="btn btn-primary inline-block px-10 py-3 text-[13px]">
              get started
            </Link>
            <p className="text-[11px] text-text-disabled">
              magic link login · no password required
            </p>
          </div>

          <div className="pt-10 border-t border-border-subtle">
            <p className="text-[11px] text-text-muted leading-[1.6]">
              supports both{' '}
              <span className="text-text-secondary">bmi live</span> and{' '}
              <span className="text-text-secondary">ascap onstage</span> ·
              chrome extension auto-fill · csv export · 9 month expiration
              tracking · email notifications
            </p>
          </div>
        </div>
      </main>

      <footer className="px-[2vw] py-[1.5vw] border-t border-border-subtle text-center text-[11px] text-text-disabled">
        setlist royalty tracker · powered by setlist.fm api
      </footer>
    </div>
  );
}
