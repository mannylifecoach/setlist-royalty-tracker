import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { songs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { withHandler, validateUuid } from '@/lib/api-utils';

export const DELETE = withHandler(async (
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

  await db
    .delete(songs)
    .where(and(eq(songs.id, id), eq(songs.userId, session.user.id)));

  return NextResponse.json({ ok: true });
});
