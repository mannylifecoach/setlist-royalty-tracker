import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { trackedArtists } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  await db
    .delete(trackedArtists)
    .where(
      and(eq(trackedArtists.id, id), eq(trackedArtists.userId, session.user.id))
    );

  return NextResponse.json({ ok: true });
}
