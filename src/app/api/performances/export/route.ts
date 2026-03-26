import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { performances, songs, trackedArtists } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { generateBmiLiveCsv, generateAscapOnStageCsv } from '@/lib/export';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const pro = searchParams.get('pro') as 'bmi' | 'ascap';
  const ids = searchParams.get('ids')?.split(',').filter(Boolean);

  if (!pro || !['bmi', 'ascap'].includes(pro)) {
    return NextResponse.json({ error: 'pro must be bmi or ascap' }, { status: 400 });
  }

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
}
