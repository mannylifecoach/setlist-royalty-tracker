import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { performances, songs, trackedArtists } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const songId = searchParams.get('songId');
  const artistId = searchParams.get('artistId');

  const conditions = [eq(performances.userId, session.user.id)];

  if (status) {
    conditions.push(eq(performances.status, status as 'discovered' | 'confirmed' | 'submitted' | 'expired' | 'ineligible'));
  }
  if (songId) {
    conditions.push(eq(performances.songId, songId));
  }
  if (artistId) {
    conditions.push(eq(performances.artistId, artistId));
  }

  const results = await db
    .select({
      performance: performances,
      song: songs,
      artist: trackedArtists,
    })
    .from(performances)
    .innerJoin(songs, eq(performances.songId, songs.id))
    .innerJoin(trackedArtists, eq(performances.artistId, trackedArtists.id))
    .where(and(...conditions))
    .orderBy(desc(performances.eventDate));

  return NextResponse.json(results);
}
