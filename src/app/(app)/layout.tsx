import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
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

  // Redirect to onboarding if profile not completed
  const [user] = await db
    .select({ onboardingComplete: users.onboardingComplete })
    .from(users)
    .where(eq(users.id, session.user.id!));

  if (user && !user.onboardingComplete) {
    redirect('/onboarding');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center px-[2vw] py-[1.2vw] border-b border-border-subtle">
        <Link
          href="/"
          className="text-[14px] tracking-[-0.3px] hover:opacity-50 transition-opacity shrink-0"
        >
          setlist royalty tracker
        </Link>
        <div className="flex-1 flex justify-center">
          <AppNav />
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <span className="text-[11px] text-text-muted">
            {process.env.DEMO_EMAIL || session.user.email}
          </span>
          <Link href="/settings" className="text-[11px] text-text-disabled hover:opacity-50 transition-opacity">
            settings
          </Link>
        </div>
      </nav>

      <main className="flex-1 px-[2vw] py-[2vw]">
        {children}
      </main>
    </div>
  );
}
