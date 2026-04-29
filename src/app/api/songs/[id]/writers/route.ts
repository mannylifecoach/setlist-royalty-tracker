import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { songs, songWriters } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { withHandler, validateUuid, parseBody } from '@/lib/api-utils';
import { songWritersSchema } from '@/lib/schemas';
import { validateWriterSplits } from '@/lib/song-writers';

export const GET = withHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const check = validateUuid(id);
  if ('error' in check) return check.error;

  // Authz: only the song owner can read its writers.
  const [song] = await db
    .select({ id: songs.id })
    .from(songs)
    .where(and(eq(songs.id, id), eq(songs.userId, session.user.id)));
  if (!song) {
    return NextResponse.json({ error: 'song not found' }, { status: 404 });
  }

  const writers = await db
    .select()
    .from(songWriters)
    .where(eq(songWriters.songId, id))
    .orderBy(songWriters.createdAt);

  return NextResponse.json(writers);
});

// PUT replaces the entire writer set atomically. UI sends the full array; we
// delete existing + insert new in a transaction so the song never sits in a
// half-edited state where shares don't sum to 50.
export const PUT = withHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const check = validateUuid(id);
  if ('error' in check) return check.error;

  const [song] = await db
    .select({ id: songs.id })
    .from(songs)
    .where(and(eq(songs.id, id), eq(songs.userId, session.user.id)));
  if (!song) {
    return NextResponse.json({ error: 'song not found' }, { status: 404 });
  }

  const result = await parseBody(request, songWritersSchema);
  if ('error' in result) return result.error;

  const validation = validateWriterSplits(result.data.writers);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error, total: validation.total },
      { status: 400 }
    );
  }

  await db.transaction(async (tx) => {
    await tx.delete(songWriters).where(eq(songWriters.songId, id));
    await tx.insert(songWriters).values(
      result.data.writers.map((w) => ({
        songId: id,
        name: w.name,
        ipi: w.ipi || null,
        role: w.role,
        sharePercent: w.sharePercent.toString(),
      }))
    );
  });

  const writers = await db
    .select()
    .from(songWriters)
    .where(eq(songWriters.songId, id))
    .orderBy(songWriters.createdAt);

  return NextResponse.json(writers);
});
