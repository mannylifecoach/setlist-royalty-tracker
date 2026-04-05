import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { performances, songs, trackedArtists } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { generateBmiLiveCsv, generateAscapOnStageCsv } from '@/lib/export';
import { withHandler, parseQuery } from '@/lib/api-utils';
import { exportQuerySchema } from '@/lib/schemas';

export const GET = withHandler(async (request: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const qResult = parseQuery(searchParams, exportQuerySchema);
  if ('error' in qResult) return qResult.error;
  const { pro, ids: idsParam } = qResult.data;
  const ids = idsParam?.split(',').filter(Boolean);

  const conditions = [eq(performances.userId, session.user.id)];
  if (ids && ids.length > 0) {
    conditions.push(inArray(performances.id, ids));
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
    .where(and(...conditions));

  const csv =
    pro === 'bmi'
      ? generateBmiLiveCsv(results)
      : generateAscapOnStageCsv(results);

  const filename = `${pro}-export-${new Date().toISOString().split('T')[0]}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});
