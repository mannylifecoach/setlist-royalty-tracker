import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-key-auth';
import { db } from '@/db';
import { performances, songs, trackedArtists } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { mapAttendanceToBmiRange } from '@/lib/constants';
import { getCorsHeaders } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: getCorsHeaders(request, 'GET, OPTIONS') });
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request, 'GET, OPTIONS');

  const user = await authenticateApiKey(request);
  if (!user) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401, headers: corsHeaders }
    );
  }

  const statusFilter = request.nextUrl.searchParams.get('status') || 'confirmed';
  const validStatuses = ['confirmed', 'discovered', 'submitted'] as const;
  type ValidStatus = typeof validStatuses[number];
  const statuses = statusFilter.split(',').filter(
    (s): s is ValidStatus => (validStatuses as readonly string[]).includes(s)
  );

  const rows = await db
    .select({
      performance: performances,
      song: { title: songs.title, bmiWorkId: songs.bmiWorkId },
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

  // Group by event (same date + venue + artist = one BMI submission)
  const eventMap = new Map<
    string,
    {
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
      songs: { performanceId: string; title: string; bmiWorkId: string | null }[];
    }
  >();

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
        startTimeHour: p.startTimeHour,
        startTimeAmPm: p.startTimeAmPm,
        endTimeHour: p.endTimeHour,
        endTimeAmPm: p.endTimeAmPm,
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
        attendanceRange: mapAttendanceToBmiRange(p.attendance),
        ticketCharge: p.ticketCharge,
        songs: [],
      });
    }

    eventMap.get(eventKey)!.songs.push({
      performanceId: p.id,
      title: row.song.title,
      bmiWorkId: row.song.bmiWorkId,
    });
  }

  const events = Array.from(eventMap.values()).sort(
    (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
  );

  return NextResponse.json({ events }, { headers: corsHeaders });
}
