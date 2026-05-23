import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { scanBandsintownForUser } from '@/lib/bandsintown-scanner';
import { withHandler } from '@/lib/api-utils';

// POST /api/scan/bandsintown — user-initiated, Bandsintown-only scan. Wraps
// scanBandsintownForUser so the settings "scan now" button can pull the user's
// past events without running the full setlist.fm scan. Cooldown + 429 backoff
// live inside scanBandsintownForUser, so this endpoint inherits both — clicks
// inside the 24h window short-circuit with skipped:cooldown_active.

export const POST = withHandler(async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await scanBandsintownForUser(session.user.id);

  if (!result) {
    // null = no api key OR no slug. The settings UI gates the button on both
    // fields being non-empty, so reaching here means the user hasn't saved
    // their creds yet (or cleared them between save and click).
    return NextResponse.json(
      {
        ok: false,
        error: 'bandsintown is not connected — save your api key + artist slug first',
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    artistName: result.artistName,
    events: result.setlistsFound,
    newPerformances: result.newPerformances,
    songTitles: result.songTitles,
    skipped: result.skipped ?? null,
  });
});
