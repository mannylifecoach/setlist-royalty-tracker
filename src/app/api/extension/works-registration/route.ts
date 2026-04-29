import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-key-auth';
import { db } from '@/db';
import { songs, songWriters, users } from '@/db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { getCorsHeaders } from '@/lib/cors';
import { withHandler } from '@/lib/api-utils';

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request, 'GET, OPTIONS'),
  });
}

interface UnregisteredSongWriter {
  name: string;
  ipi: string | null;
  role: string;
  sharePercent: number;
}

interface UnregisteredSong {
  id: string;
  title: string;
  alternateTitles: string[] | null;
  isrc: string | null;
  durationSeconds: number | null;
  recordingMbid: string | null;
  workMbid: string | null;
  iswc: string | null;
  writers: UnregisteredSongWriter[];
}

// GET /api/extension/works-registration
// Returns the user's songs that have not yet been registered with ASCAP, plus
// the user's publisher profile. Consumed by the ASCAP Work Registration filler
// to pick a song from the popup and pre-fill the registration form.
//
// Authz: filters by `songs.user_id = current user` — no IDOR window. Rate
// limiting is global at /api/extension/* (30/min) via src/proxy.ts.
export const GET = withHandler(async (request: NextRequest) => {
  const corsHeaders = getCorsHeaders(request, 'GET, OPTIONS');

  const user = await authenticateApiKey(request);
  if (!user) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401, headers: corsHeaders }
    );
  }

  const [userProfile] = await db
    .select({
      ipi: users.ipi,
      defaultRole: users.defaultRole,
      publisherName: users.publisherName,
      publisherIpi: users.publisherIpi,
      noPublisher: users.noPublisher,
    })
    .from(users)
    .where(eq(users.id, user.id));

  // Songs the user owns where ASCAP registration hasn't been recorded yet.
  // The OnStage performance form rejects works that aren't pre-registered, so
  // these are the queue the user needs to walk through before they can file.
  const unregistered = await db
    .select({
      id: songs.id,
      title: songs.title,
      alternateTitles: songs.alternateTitles,
      isrc: songs.isrc,
      durationSeconds: songs.durationSeconds,
      recordingMbid: songs.recordingMbid,
      workMbid: songs.workMbid,
      iswc: songs.iswc,
    })
    .from(songs)
    .where(and(eq(songs.userId, user.id), isNull(songs.ascapRegisteredAt)))
    .orderBy(songs.title);

  // Bulk-load writers for those songs in one query — no N+1.
  const songIds = unregistered.map((s) => s.id);
  const allWriters = songIds.length
    ? await db
        .select()
        .from(songWriters)
        .where(inArray(songWriters.songId, songIds))
        .orderBy(songWriters.createdAt)
    : [];
  const writersBySong = new Map<string, UnregisteredSongWriter[]>();
  for (const w of allWriters) {
    const list = writersBySong.get(w.songId) ?? [];
    list.push({
      name: w.name,
      ipi: w.ipi,
      role: w.role,
      sharePercent: Number(w.sharePercent),
    });
    writersBySong.set(w.songId, list);
  }

  const songsResp: UnregisteredSong[] = unregistered.map((s) => ({
    ...s,
    writers: writersBySong.get(s.id) ?? [],
  }));

  return NextResponse.json(
    {
      songs: songsResp,
      user: {
        ipi: userProfile?.ipi ?? null,
        defaultRole: userProfile?.defaultRole ?? null,
        publisherName: userProfile?.publisherName ?? null,
        publisherIpi: userProfile?.publisherIpi ?? null,
        noPublisher: userProfile?.noPublisher ?? false,
      },
    },
    { headers: corsHeaders }
  );
});
