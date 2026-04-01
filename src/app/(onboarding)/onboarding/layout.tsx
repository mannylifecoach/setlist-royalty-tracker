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
        <span className="text-[14px] tracking-[-0.3px]">
          setlist royalty tracker
        </span>
      </nav>
      <main className="flex-1 px-[2vw] py-[2vw]">{children}</main>
    </div>
  );
}
