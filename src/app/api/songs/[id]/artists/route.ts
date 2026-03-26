import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { songArtists, songs, trackedArtists } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id: songId } = await params;
  const { artistId } = await request.json();

  if (!artistId) {
    return NextResponse.json({ error: 'artistId is required' }, { status: 400 });
  }

  // Verify song belongs to user
  const [song] = await db
    .select()
    .from(songs)
    .where(and(eq(songs.id, songId), eq(songs.userId, session.user.id)));

  if (!song) {
    return NextResponse.json({ error: 'song not found' }, { status: 404 });
  }

  const [link] = await db
    .insert(songArtists)
    .values({ songId, artistId })
    .onConflictDoNothing()
    .returning();

  return NextResponse.json(link || { songId, artistId }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id: songId } = await params;
  const { artistId } = await request.json();

  await db
    .delete(songArtists)
    .where(
      and(eq(songArtists.songId, songId), eq(songArtists.artistId, artistId))
    );

  return NextResponse.json({ ok: true });
}
