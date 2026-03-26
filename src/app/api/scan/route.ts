import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { scanForUser } from '@/lib/scanner';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const results = await scanForUser(session.user.id);

  const totalNew = results.reduce((sum, r) => sum + r.newPerformances, 0);
  const totalScanned = results.reduce((sum, r) => sum + r.setlistsFound, 0);

  return NextResponse.json({
    scanned: totalScanned,
    newPerformances: totalNew,
    results,
  });
}
