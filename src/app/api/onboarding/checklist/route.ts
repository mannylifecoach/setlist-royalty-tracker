import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import {
  users,
  trackedArtists,
  songs,
  songArtists,
  performances,
  scanLog,
} from '@/db/schema';
import { and, count, eq, inArray } from 'drizzle-orm';
import { withHandler } from '@/lib/api-utils';

// 7-item get-started checklist for the dashboard. Each item is computed
// from existing tables (no new schema) — when the underlying state changes,
// the item auto-checks on the next dashboard render. Sequenced top-to-bottom
// as the canonical SRT onboarding flow so a new user can follow the list
// in order from signup to first filed performance.
//
// Per the 2026-05-25 onboarding research doc, 3-7 step checklists hit
// the highest completion rates; 7 is the upper bound. SRT's first item
// (add artist) auto-completes for everyone because onboarding seeds a
// tracked artist from stage name, so users see "1 of 7 done" on first
// load — visible progress is the dopamine that keeps them moving.

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  href: string;
  hint?: string;
}

export interface ChecklistResponse {
  items: ChecklistItem[];
  completed: number;
  total: number;
}

export const GET = withHandler(async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  // Parallel counts — Neon handles concurrent reads fine and one round-trip
  // beats seven serial ones for the dashboard's first paint.
  const [
    artistCountRow,
    songCountRow,
    linkedSongCountRow,
    scanCountRow,
    perfCountRow,
    confirmedPerfCountRow,
    submittedPerfCountRow,
    userRow,
  ] = await Promise.all([
    db.select({ c: count() }).from(trackedArtists).where(eq(trackedArtists.userId, userId)),
    db.select({ c: count() }).from(songs).where(eq(songs.userId, userId)),
    db
      .select({ c: count() })
      .from(songArtists)
      .innerJoin(songs, eq(songArtists.songId, songs.id))
      .where(eq(songs.userId, userId)),
    db.select({ c: count() }).from(scanLog).where(eq(scanLog.userId, userId)),
    db.select({ c: count() }).from(performances).where(eq(performances.userId, userId)),
    db
      .select({ c: count() })
      .from(performances)
      .where(
        and(
          eq(performances.userId, userId),
          inArray(performances.status, ['confirmed', 'submitted'])
        )
      ),
    db
      .select({ c: count() })
      .from(performances)
      .where(
        and(eq(performances.userId, userId), eq(performances.status, 'submitted'))
      ),
    db.select({ apiKey: users.apiKey }).from(users).where(eq(users.id, userId)),
  ]);

  // count() can return number or string depending on adapter; coerce.
  const num = (row: { c: unknown }[] | undefined) => Number(row?.[0]?.c ?? 0);
  const artistCount = num(artistCountRow);
  const songCount = num(songCountRow);
  const linkedSongCount = num(linkedSongCountRow);
  const scanCount = num(scanCountRow);
  const perfCount = num(perfCountRow);
  const confirmedPerfCount = num(confirmedPerfCountRow);
  const submittedPerfCount = num(submittedPerfCountRow);
  // apiKey existence is the strongest non-invasive proxy for "extension is
  // set up" — the only reason to generate an API key is to connect the
  // extension. If a user generated one and never installed, they'd still
  // count as "done" here; acceptable false positive (the next step in the
  // chain will surface that they haven't actually filed anything).
  const hasApiKey = !!userRow[0]?.apiKey;

  const items: ChecklistItem[] = [
    {
      id: 'add-artist',
      label: 'Add 1 tracked artist',
      done: artistCount > 0,
      href: '/artists',
    },
    {
      id: 'register-song',
      label: 'Register 1 song',
      done: songCount > 0,
      href: '/songs',
    },
    {
      id: 'link-song-artist',
      label: 'Link a song to its artist',
      done: linkedSongCount > 0,
      href: '/songs',
      hint: 'On the songs page, click "+ link artist" on a song.',
    },
    {
      id: 'find-perf',
      label: 'Find your first performance',
      done: scanCount > 0 || perfCount > 0,
      href: '/performances',
      hint: 'Run a scan from the dashboard, import a Serato CSV, or add a show manually.',
    },
    {
      id: 'confirm-perf',
      label: 'Mark 1 performance confirmed',
      done: confirmedPerfCount > 0,
      href: '/performances',
      hint: 'Tick a performance you actually played, then click "confirm selected".',
    },
    {
      id: 'install-ext',
      label: 'Install the Chrome extension',
      done: hasApiKey,
      href: '/settings',
      hint: 'Desktop Chrome only. Generate your API key in settings, then load the extension.',
    },
    {
      id: 'file-perf',
      label: 'File your first performance with BMI/ASCAP',
      done: submittedPerfCount > 0,
      href: '/export',
    },
  ];

  const completed = items.filter((i) => i.done).length;
  const response: ChecklistResponse = { items, completed, total: items.length };
  return NextResponse.json(response);
});
