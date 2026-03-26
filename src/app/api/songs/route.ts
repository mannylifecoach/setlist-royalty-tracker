import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { songs, songArtists, trackedArtists } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const userSongs = await db
    .select()
    .from(songs)
    .where(eq(songs.userId, session.user.id))
    .orderBy(songs.title);

  // Get linked artists for each song
  const songsWithArtists = await Promise.all(
    userSongs.map(async (song) => {
      const linked = await db
        .select({ artist: trackedArtists })
        .from(songArtists)
        .innerJoin(trackedArtists, eq(songArtists.artistId, trackedArtists.id))
        .where(eq(songArtists.songId, song.id));

      return { ...song, artists: linked.map((l) => l.artist) };
    })
  );

  return NextResponse.json(songsWithArtists);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { title, iswc, bmiWorkId, ascapWorkId } = body;

  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  const [song] = await db
    .insert(songs)
    .values({
      userId: session.user.id,
      title,
      iswc: iswc || null,
      bmiWorkId: bmiWorkId || null,
      ascapWorkId: ascapWorkId || null,
    })
    .returning();

  return NextResponse.json(song, { status: 201 });
}
