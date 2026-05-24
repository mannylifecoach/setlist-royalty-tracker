import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import Link from 'next/link';
import { AppNav } from '@/components/app-nav';
import { InstallPrompt } from '@/components/install-prompt';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // session.user.onboardingComplete is populated in the Auth.js session
  // callback (src/lib/auth.ts) from the user row DrizzleAdapter already
  // loaded — so checking it here costs zero extra DB roundtrips.
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  if (!session.user.onboardingComplete) {
    redirect('/onboarding');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <InstallPrompt />
      {/* Stacks vertically on mobile (logo row, then nav row, then user-info row);
          single-row layout at md+ matches the original desktop design. */}
      <nav className="flex flex-col md:flex-row md:items-center px-4 md:px-[2vw] py-3 md:py-[1.2vw] gap-3 md:gap-0 border-b border-border-subtle">
        <div className="flex items-center justify-between md:contents">
          <Link
            href="/"
            className="flex flex-col items-start hover:opacity-50 transition-opacity shrink-0 touch-manipulation"
          >
            <span className="text-[24px] uppercase tracking-[-2px]" style={{ fontFamily: "var(--font-marker), 'Sora', sans-serif", fontWeight: 800 }}>srt</span>
            <span className="text-[14px] tracking-[-0.3px]">setlist royalty tracker</span>
          </Link>
          {/* User-info collapses next to the logo on mobile (right side of the top row); jumps to the far right on md+ via `md:contents` unwrapping. */}
          <div className="flex items-center gap-4 shrink-0 md:order-last">
            <span className="text-[11px] text-text-muted hidden sm:inline">
              {process.env.DEMO_EMAIL || session.user.email}
            </span>
            <Link href="/settings" className="text-[11px] text-text-disabled hover:opacity-50 transition-opacity touch-manipulation">
              settings
            </Link>
          </div>
        </div>
        <div className="flex-1 flex justify-center">
          <AppNav />
        </div>
      </nav>

      <main className="flex-1 px-4 md:px-[2vw] py-6 md:py-[2vw]">
        {children}
      </main>

      <footer className="px-4 md:px-[2vw] py-4 md:py-[1vw] border-t border-border-subtle text-center text-[11px] text-text-disabled">
        setlist royalty tracker · powered by setlist.fm api ·{' '}
        <a href="mailto:support@setlistroyalty.com" className="hover:text-text-muted transition-colors">support@setlistroyalty.com</a>
        {' '}·{' '}
        <Link href="/privacy" className="hover:text-text-muted transition-colors">privacy</Link>
      </footer>
    </div>
  );
}
