import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-key-auth';
import { db } from '@/db';
import { performances, songs, trackedArtists, users, songWriters } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { mapAttendanceToBmiRange } from '@/lib/constants';
import { getCorsHeaders } from '@/lib/cors';
import { withHandler } from '@/lib/api-utils';

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: getCorsHeaders(request, 'GET, OPTIONS') });
}

interface CoWriter {
  name: string;
  ipi: string | null;
  role: string;
  sharePercent: number;
}

interface ExtensionSong {
  performanceId: string;
  title: string;
  bmiWorkId: string | null;
  ascapWorkId: string | null;
  isrc: string | null;
  alternateTitles: string[] | null;
  durationSeconds: number | null;
  ascapRegisteredAt: string | null;
  coWriters: CoWriter[];
}

interface ExtensionEvent {
  eventKey: string;
  artistName: string;
  eventDate: string;
  eventDateFormatted: string;
  eventName: string | null;
  eventType: string | null;
  startTimeHour: string | null;
  startTimeAmPm: string | null;
  endTimeHour: string | null;
  endTimeAmPm: string | null;
  venueName: string | null;
  venueAddress: string | null;
  venueCity: string | null;
  venueState: string | null;
  venueCountry: string | null;
  venueZip: string | null;
  venuePhone: string | null;
  venueType: string | null;
  venueCapacity: string | null;
  attendance: number | null;
  attendanceRange: string;
  ticketCharge: string | null;
  // ASCAP-specific event fields. perfType/liveStreamViews/advanceTickets aren't
  // stored per-performance yet (no schema column), so we default. The OnStage
  // filler can use these defaults; users can override on the form before submit.
  perfType: string;
  liveStreamViews: number | null;
  ticketFee: boolean;
  advanceTickets: boolean;
  songs: ExtensionSong[];
}

export const GET = withHandler(async (request: NextRequest) => {
  const corsHeaders = getCorsHeaders(request, 'GET, OPTIONS');

  const user = await authenticateApiKey(request);
  if (!user) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401, headers: corsHeaders }
    );
  }

  // Load user's full profile: time defaults (BMI fallback) + ASCAP fields
  // (ipi, default role, publisher) used by both performance + work-registration auto-fill.
  // `pro` drives the popup's neutral-state CTA — so it can offer "Open BMI Live"
  // vs "Open ASCAP OnStage" without a separate /api/settings round-trip.
  const [userProfile] = await db
    .select({
      defaultStartTimeHour: users.defaultStartTimeHour,
      defaultStartTimeAmPm: users.defaultStartTimeAmPm,
      defaultEndTimeHour: users.defaultEndTimeHour,
      defaultEndTimeAmPm: users.defaultEndTimeAmPm,
      pro: users.pro,
      ipi: users.ipi,
      defaultRole: users.defaultRole,
      publisherName: users.publisherName,
      publisherIpi: users.publisherIpi,
      noPublisher: users.noPublisher,
    })
    .from(users)
    .where(eq(users.id, user.id));

  const statusFilter = request.nextUrl.searchParams.get('status') || 'confirmed';
  const validStatuses = ['confirmed', 'discovered', 'submitted'] as const;
  type ValidStatus = typeof validStatuses[number];
  const statuses = statusFilter.split(',').filter(
    (s): s is ValidStatus => (validStatuses as readonly string[]).includes(s)
  );

  const rows = await db
    .select({
      performance: performances,
      song: {
        id: songs.id,
        title: songs.title,
        bmiWorkId: songs.bmiWorkId,
        ascapWorkId: songs.ascapWorkId,
        isrc: songs.isrc,
        alternateTitles: songs.alternateTitles,
        durationSeconds: songs.durationSeconds,
        ascapRegisteredAt: songs.ascapRegisteredAt,
      },
      artist: { artistName: trackedArtists.artistName },
    })
    .from(performances)
    .innerJoin(songs, eq(performances.songId, songs.id))
    .innerJoin(trackedArtists, eq(performances.artistId, trackedArtists.id))
    .where(
      and(
        eq(performances.userId, user.id),
        inArray(performances.status, statuses)
      )
    );

  // Bulk-load co-writers for every song touched by this response — single
  // query rather than N+1. Empty when no rows matched (no songIds).
  const songIds = Array.from(new Set(rows.map((r) => r.song.id)));
  const allWriters = songIds.length
    ? await db
        .select()
        .from(songWriters)
        .where(inArray(songWriters.songId, songIds))
        .orderBy(songWriters.createdAt)
    : [];
  const writersBySong = new Map<string, CoWriter[]>();
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

  // Group by event (same date + venue + artist = one BMI submission /
  // one ASCAP setlist + performance).
  const eventMap = new Map<string, ExtensionEvent>();

  for (const row of rows) {
    const p = row.performance;
    const eventKey = `${p.eventDate}|${p.venueName}|${row.artist.artistName}`;

    if (!eventMap.has(eventKey)) {
      // Format date as MM/DD/YYYY for BMI
      const [year, month, day] = p.eventDate.split('-');
      const eventDateFormatted = `${month}/${day}/${year}`;

      eventMap.set(eventKey, {
        eventKey,
        artistName: row.artist.artistName,
        eventDate: p.eventDate,
        eventDateFormatted,
        eventName: p.eventName,
        eventType: p.eventType,
        startTimeHour: p.startTimeHour || userProfile?.defaultStartTimeHour || null,
        startTimeAmPm: p.startTimeAmPm || userProfile?.defaultStartTimeAmPm || null,
        endTimeHour: p.endTimeHour || userProfile?.defaultEndTimeHour || null,
        endTimeAmPm: p.endTimeAmPm || userProfile?.defaultEndTimeAmPm || null,
        venueName: p.venueName,
        venueAddress: p.venueAddress,
        venueCity: p.venueCity,
        venueState: p.venueState,
        venueCountry: p.venueCountry,
        venueZip: p.venueZip,
        venuePhone: p.venuePhone,
        venueType: p.venueType,
        venueCapacity: p.venueCapacity,
        attendance: p.attendance,
        attendanceRange: mapAttendanceToBmiRange(
          p.attendance,
          p.venueCapacity ? parseInt(p.venueCapacity, 10) || null : null
        ),
        ticketCharge: p.ticketCharge,
        // ASCAP defaults — derived where possible, otherwise sensible default.
        // Real per-performance storage of these is a follow-up if/when users
        // need to set non-defaults from inside SRT.
        perfType: 'CNCRT',
        liveStreamViews: null,
        ticketFee: p.ticketCharge === 'Yes',
        advanceTickets: false,
        songs: [],
      });
    }

    eventMap.get(eventKey)!.songs.push({
      performanceId: p.id,
      title: row.song.title,
      bmiWorkId: row.song.bmiWorkId,
      ascapWorkId: row.song.ascapWorkId,
      isrc: row.song.isrc,
      alternateTitles: row.song.alternateTitles,
      durationSeconds: row.song.durationSeconds,
      ascapRegisteredAt: row.song.ascapRegisteredAt
        ? row.song.ascapRegisteredAt.toISOString()
        : null,
      coWriters: writersBySong.get(row.song.id) ?? [],
    });
  }

  const events = Array.from(eventMap.values()).sort(
    (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
  );

  return NextResponse.json(
    {
      events,
      // Top-level user profile lets the OnStage + Work Reg fillers consume
      // ASCAP identity once instead of duplicating per-event. Existing BMI
      // clients can ignore this key safely.
      user: {
        pro: userProfile?.pro ?? null,
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
