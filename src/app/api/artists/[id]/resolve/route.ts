import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { trackedArtists } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { mbid } = await request.json();

  if (!mbid) {
    return NextResponse.json({ error: 'mbid is required' }, { status: 400 });
  }

  const [updated] = await db
    .update(trackedArtists)
    .set({ mbid })
    .where(
      and(eq(trackedArtists.id, id), eq(trackedArtists.userId, session.user.id))
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: 'artist not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
