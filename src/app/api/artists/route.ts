import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { trackedArtists } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { withHandler, parseBody } from '@/lib/api-utils';
import { createArtistSchema } from '@/lib/schemas';

export const GET = withHandler(async () => {
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
});

export const POST = withHandler(async (request: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await parseBody(request, createArtistSchema);
  if ('error' in result) return result.error;
  const { artistName, mbid } = result.data;

  const [artist] = await db
    .insert(trackedArtists)
    .values({
      userId: session.user.id,
      artistName,
      mbid: mbid || null,
    })
    .returning();

  return NextResponse.json(artist, { status: 201 });
});
