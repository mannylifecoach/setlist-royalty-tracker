import type { Metadata } from 'next';
import Link from 'next/link';
import { MorphingText } from '@/components/ui/morphing-text';
import { auth } from '@/lib/auth';
import { FeedbackForm } from './feedback-form';

export const metadata: Metadata = {
  title: 'send feedback — setlist royalty tracker',
  description: 'tell us what is broken, confusing, or missing. beta testers + early users especially welcome.',
};

export default async function FeedbackPage() {
  const session = await auth().catch(() => null);
  const prefillEmail = session?.user?.email ?? '';

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-[2vw] py-[1.5vw] border-b border-border-subtle">
        <Link href="/" className="flex flex-col items-start hover:opacity-70 transition-opacity">
          <MorphingText className="text-[28px]" />
          <span className="text-[14px] tracking-[-0.3px]">setlist royalty tracker</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/about" className="btn text-[11px]">about</Link>
          <Link href="/login" className="btn text-[11px]">sign in</Link>
        </div>
      </nav>

      <main className="flex-1 px-[4vw] py-[6vw]">
        <div className="max-w-[560px] mx-auto space-y-10">
          <div className="text-center space-y-4">
            <h1 className="text-[28px] font-normal tracking-[-0.5px] leading-[1.2]">
              send feedback
            </h1>
            <p className="text-text-muted text-[13px] leading-[1.6] max-w-[460px] mx-auto">
              tell us what&apos;s broken, confusing, or missing. raw + specific beats polished — bug reports, confusion at a step, a feature you wish existed, anything.
            </p>
          </div>

          <FeedbackForm prefillEmail={prefillEmail} />

          <div className="text-center space-y-2 pt-4 border-t border-border-subtle">
            <p className="text-[11px] text-text-disabled">
              prefer email?{' '}
              <a href="mailto:manny.alboroto@gmail.com" className="text-text-muted hover:underline">
                manny.alboroto@gmail.com
              </a>
            </p>
            <p className="text-[11px] text-text-disabled">
              we read everything. urgent issues get a reply within a day.
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
