import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { performances } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { ids } = await request.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
  }

  await db
    .update(performances)
    .set({ status: 'confirmed', updatedAt: new Date() })
    .where(
      and(
        eq(performances.userId, session.user.id),
        inArray(performances.id, ids),
        eq(performances.status, 'discovered')
      )
    );

  return NextResponse.json({ ok: true, confirmed: ids.length });
}
