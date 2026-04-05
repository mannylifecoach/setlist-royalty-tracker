import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { searchArtists } from '@/lib/setlistfm';
import { withHandler, parseQuery } from '@/lib/api-utils';
import { setlistfmSearchSchema } from '@/lib/schemas';

export const GET = withHandler(async (request: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const qResult = parseQuery(searchParams, setlistfmSearchSchema);
  if ('error' in qResult) return qResult.error;

  const artists = await searchArtists(qResult.data.q);
  return NextResponse.json(artists);
});
