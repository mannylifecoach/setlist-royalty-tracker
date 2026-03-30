import Link from 'next/link';
import { ProExplainer } from '@/components/pro-explainer';
import { DataProvenance } from '@/components/data-provenance';
import { TrustBadges } from '@/components/trust-badges';
import { FAQ } from '@/components/faq';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-[2vw] py-[1.5vw] border-b border-border-subtle">
        <Link href="/" className="text-[14px] tracking-[-0.3px] hover:opacity-70 transition-opacity">
          setlist royalty tracker
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
        <div className="max-w-[640px] mx-auto text-center space-y-16">
          <div className="space-y-4">
            <h1 className="text-[28px] font-normal tracking-[-0.5px] leading-[1.2]">
              about
            </h1>
            <p className="text-text-muted text-[13px] leading-[1.6] max-w-[460px] mx-auto">
              how pro live reporting works, where our data comes from,
              and why you stay in control the whole time.
            </p>
          </div>

          <ProExplainer />

          <DataProvenance />

          <TrustBadges />

          <FAQ />

          <div className="space-y-4 pt-4">
            <Link href="/login" className="btn btn-primary inline-block px-10 py-3 text-[13px]">
              get started
            </Link>
            <p className="text-[11px] text-text-disabled">
              magic link login · no password required
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
