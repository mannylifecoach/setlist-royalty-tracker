import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { withHandler, validateUuid } from '@/lib/api-utils';
import { enrichSongMetadata } from '@/lib/song-enrichment';

export const POST = withHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const idCheck = validateUuid(id);
  if ('error' in idCheck) return idCheck.error;

  try {
    const result = await enrichSongMetadata(id, session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Song not found') {
      return NextResponse.json({ error: 'song not found' }, { status: 404 });
    }
    throw error;
  }
});
