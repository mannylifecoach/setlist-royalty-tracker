import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import Link from 'next/link';
import { AppNav } from '@/components/app-nav';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 py-3 border-b border-border-subtle max-w-[1400px] mx-auto w-full">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-[14px] font-medium tracking-[-0.3px] hover:text-text-secondary transition-colors"
          >
            setlist royalty tracker
          </Link>
          <AppNav />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-text-muted">
            {session.user.email}
          </span>
          <Link href="/settings" className="text-[11px] text-text-disabled hover:text-text transition-colors">
            settings
          </Link>
        </div>
      </nav>

      <main className="flex-1 max-w-[1400px] mx-auto w-full px-6 py-6">
        {children}
      </main>
    </div>
  );
}
