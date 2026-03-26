import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { trackedArtists } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const artists = await db
    .select()
    .from(trackedArtists)
    .where(eq(trackedArtists.userId, session.user.id))
    .orderBy(trackedArtists.artistName);

  return NextResponse.json(artists);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { artistName, mbid } = await request.json();

  if (!artistName) {
    return NextResponse.json({ error: 'artistName is required' }, { status: 400 });
  }

  const [artist] = await db
    .insert(trackedArtists)
    .values({
      userId: session.user.id,
      artistName,
      mbid: mbid || null,
    })
    .returning();

  return NextResponse.json(artist, { status: 201 });
}
