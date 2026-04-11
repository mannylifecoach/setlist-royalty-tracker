import Link from 'next/link';
import { HowItWorks } from '@/components/how-it-works';
import { WhyThisMatters } from '@/components/why-this-matters';
import { ShaderLines } from '@/components/ui/shader-lines';
import { MorphingText } from '@/components/ui/morphing-text';
import { MobileNav } from '@/components/mobile-nav';


export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* shader as fixed full-bleed background — no seams */}
      <div className="fixed inset-0 z-0">
        <ShaderLines />
      </div>
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-transparent via-transparent via-50% to-black pointer-events-none" />

      <nav className="relative z-10 flex items-center justify-between px-14 sm:px-20 pt-14 sm:pt-16 pb-3">
        <span className="flex flex-col items-start">
          <MorphingText className="text-[28px] sm:text-[32px]" />
          <span className="text-[14px] tracking-[-0.3px]">setlist royalty tracker</span>
        </span>
        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/about" className="btn text-[11px]">
            about
          </Link>
          <Link href="/pitch" className="btn text-[11px]">
            pitch
          </Link>
          <Link href="/login" className="btn text-[11px]">
            sign in
          </Link>
        </div>
        {/* Mobile hamburger */}
        <div className="md:hidden">
          <MobileNav />
        </div>
      </nav>

      <section className="relative z-[1] h-[100vh] flex items-center justify-center -mt-[52px]">
        <div className="text-center space-y-4 sm:space-y-6 px-6 sm:px-[4vw]">
          <h1 className="text-[40px] sm:text-[56px] font-normal tracking-[-2px] leading-[1.05]">
            stop leaving royalties
            <br />
            on the table
          </h1>
          <p className="text-text-secondary text-[15px] sm:text-[17px] leading-[1.5] max-w-[520px] mx-auto">
            bmi and ascap only auto-track the top 200-300 tours. every other
            live performance — band, dj set, festival — goes unreported unless
            you manually log it. setlist.fm has 9.6m+ setlists. we bridge that gap.
          </p>
        </div>
      </section>

      <main className="relative z-10 flex-1 flex items-center justify-center px-[4vw] py-[6vw] bg-bg">
        <div className="max-w-[640px] text-center space-y-12">

          <HowItWorks />

          <WhyThisMatters />

          <div className="border border-border-subtle p-6 text-left space-y-3">
            <div className="text-[11px] text-text-muted">chrome extension <span className="text-text-disabled">· requires google chrome</span></div>
            <p className="text-[13px] text-text-secondary leading-[1.5]">
              skip the manual data entry. our chrome extension pre-fills bmi
              live&apos;s 3-step wizard — performer, venue, dates, setlist — directly
              from your confirmed performances. just review and click submit.
            </p>
            <p className="text-[11px] text-text-disabled">
              5+ minutes of typing per show → ~30 seconds of review · csv export available as backup
            </p>
          </div>

          <div className="border border-border-subtle p-6 text-left space-y-3">
            <div className="text-[11px] text-text-muted">for dj-producers <span className="text-text-disabled">· coming soon</span></div>
            <p className="text-[13px] text-text-secondary leading-[1.5]">
              electronic music has a $120m/year royalty gap. dj sets at clubs
              and festivals almost never get reported to bmi or ascap. upload
              your serato history, we match the tracks to your registered songs,
              and the chrome extension files the claims. remixes are matched
              structurally — &quot;midnight bass (extended mix)&quot; is recognized as
              the same composition as &quot;midnight bass.&quot;
            </p>
            <p className="text-[11px] text-text-disabled">
              powered by musicbrainz work relationships · serato + resident advisor + 1001tracklists
            </p>
          </div>

          <div className="space-y-4">
            <Link href="/login" className="btn inline-block px-10 py-3 text-[13px]">
              get started
            </Link>
            <p className="text-[12px] text-text-muted">
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

      <footer className="relative z-10 bg-bg px-[2vw] py-[1.5vw] border-t border-border-subtle text-center text-[11px] text-text-disabled">
        setlist royalty tracker · powered by setlist.fm api ·{' '}
        <a href="mailto:support@setlistroyalty.com" className="hover:text-text-muted transition-colors">support@setlistroyalty.com</a>
      </footer>
    </div>
  );
}
