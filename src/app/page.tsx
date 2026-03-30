import Link from 'next/link';
import { HowItWorks } from '@/components/how-it-works';
import { WhyThisMatters } from '@/components/why-this-matters';
import { ShaderLines } from '@/components/ui/shader-lines';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="relative z-10 flex items-center justify-between px-4 sm:px-[2vw] py-3 sm:py-[1.5vw] border-b border-border-subtle">
        <span className="text-[14px] tracking-[-0.3px]">
          setlist royalty tracker
        </span>
        <div className="flex items-center gap-4">
          <Link href="/about" className="btn text-[11px]">
            about
          </Link>
          <Link href="/login" className="btn text-[11px]">
            sign in
          </Link>
        </div>
      </nav>

      <section className="relative h-[70vh] sm:h-[85vh] flex items-center justify-center overflow-hidden">
        <ShaderLines />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 z-[1]" />
        <div className="relative z-[2] text-center space-y-4 sm:space-y-6 px-6 sm:px-[4vw]">
          <h1 className="text-[40px] sm:text-[56px] font-normal tracking-[-2px] leading-[1.05]">
            stop leaving royalties
            <br />
            on the table
          </h1>
          <p className="text-text-secondary text-[15px] sm:text-[17px] leading-[1.5] max-w-[520px] mx-auto">
            bmi and ascap only auto-track the top 200-300 tours. every other
            live performance goes unreported unless you manually log it.
            setlist.fm has 9.6m+ crowdsourced setlists — we bridge that gap.
          </p>
        </div>
      </section>

      <main className="flex-1 flex items-center justify-center px-[4vw] py-[6vw]">
        <div className="max-w-[640px] text-center space-y-12">

          <HowItWorks />

          <WhyThisMatters />

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

          <div className="pt-10 border-t border-border-subtle space-y-3">
            <p className="text-[11px] text-text-muted leading-[1.6]">
              supports both{' '}
              <span className="text-text-secondary">bmi live</span> and{' '}
              <span className="text-text-secondary">ascap onstage</span> ·
              chrome extension auto-fill · csv export · 9 month expiration
              tracking · email notifications
            </p>
            <p className="text-[11px] text-text-disabled">
              <Link href="/about" className="underline hover:text-text-muted transition-colors">
                learn how it works & why you can trust us
              </Link>
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
