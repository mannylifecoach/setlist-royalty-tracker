import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function OnboardingLayout({
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
      <nav className="flex items-center px-[2vw] py-[1.2vw] border-b border-border-subtle">
        <span className="flex flex-col items-start">
          <span className="text-[24px] uppercase tracking-[-2px]" style={{ fontFamily: "var(--font-marker), 'Sora', sans-serif", fontWeight: 800 }}>srt</span>
          <span className="text-[14px] tracking-[-0.3px]">setlist royalty tracker</span>
        </span>
      </nav>
      <main className="flex-1 px-[2vw] py-[2vw]">{children}</main>
    </div>
  );
}
