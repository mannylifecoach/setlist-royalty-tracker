import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { performances } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const allowedFields = [
    'status',
    'venueName',
    'venueCity',
    'venueState',
    'venueCountry',
    'venueAddress',
    'venuePhone',
    'attendance',
  ] as const;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  const [updated] = await db
    .update(performances)
    .set(updates)
    .where(
      and(eq(performances.id, id), eq(performances.userId, session.user.id))
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: 'performance not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
