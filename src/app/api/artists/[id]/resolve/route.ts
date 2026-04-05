import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { trackedArtists } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { withHandler, parseBody, validateUuid } from '@/lib/api-utils';
import { resolveArtistSchema } from '@/lib/schemas';

export const POST = withHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const idCheck = validateUuid(id);
  if ('error' in idCheck) return idCheck.error;

  const result = await parseBody(request, resolveArtistSchema);
  if ('error' in result) return result.error;
  const { mbid } = result.data;

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
});
