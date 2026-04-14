import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  users,
  songs,
  trackedArtists,
  performances,
  scanLog,
} from '@/db/schema';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/stats
 *
 * Tier 1 KPIs for the admin view. Returns signup funnel + activation metrics.
 * Protected by ADMIN_SECRET header.
 *
 * Usage:
 *   curl -H "x-admin-secret: $ADMIN_SECRET" https://setlistroyalty.com/api/admin/stats
 */
export async function GET(request: NextRequest) {
  const providedSecret = request.headers.get('x-admin-secret');
  if (!process.env.ADMIN_SECRET || providedSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Total users + onboarded users
  const userCounts = await db.execute<{
    total_users: number;
    onboarded_users: number;
  }>(sql`
    SELECT
      COUNT(*)::int AS total_users,
      COUNT(${users.onboardingComplete})::int AS onboarded_users
    FROM ${users}
  `);

  // Activation funnel — count users with ≥1 of each entity
  const activation = await db.execute<{
    users_with_artist: number;
    users_with_song: number;
  }>(sql`
    SELECT
      (SELECT COUNT(DISTINCT user_id)::int FROM ${trackedArtists}) AS users_with_artist,
      (SELECT COUNT(DISTINCT user_id)::int FROM ${songs}) AS users_with_song
  `);

  const performanceActivation = await db.execute<{
    users_with_scan: number;
    users_with_discovered: number;
    users_with_confirmed: number;
    users_with_submitted: number;
  }>(sql`
    SELECT
      (SELECT COUNT(DISTINCT user_id)::int FROM ${scanLog}) AS users_with_scan,
      (SELECT COUNT(DISTINCT user_id)::int FROM ${performances} WHERE status IN ('discovered', 'confirmed', 'submitted')) AS users_with_discovered,
      (SELECT COUNT(DISTINCT user_id)::int FROM ${performances} WHERE status IN ('confirmed', 'submitted')) AS users_with_confirmed,
      (SELECT COUNT(DISTINCT user_id)::int FROM ${performances} WHERE status = 'submitted') AS users_with_submitted
  `);

  // Total performances by status
  const performanceCounts = await db.execute<{
    total_discovered: number;
    total_confirmed: number;
    total_submitted: number;
    total_expired: number;
  }>(sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'discovered')::int AS total_discovered,
      COUNT(*) FILTER (WHERE status = 'confirmed')::int AS total_confirmed,
      COUNT(*) FILTER (WHERE status = 'submitted')::int AS total_submitted,
      COUNT(*) FILTER (WHERE status = 'expired')::int AS total_expired
    FROM ${performances}
  `);

  // Capability distribution (users can have multiple — count each flag)
  const capabilityRows = await db.execute<{
    capability: string;
    count: number;
  }>(sql`
    SELECT unnest(capabilities) AS capability, COUNT(*)::int AS count
    FROM ${users}
    WHERE capabilities IS NOT NULL
    GROUP BY capability
    ORDER BY count DESC
  `);

  // Country distribution
  const countryRows = await db.execute<{
    country: string;
    count: number;
  }>(sql`
    SELECT country, COUNT(*)::int AS count
    FROM ${users}
    WHERE country IS NOT NULL
    GROUP BY country
    ORDER BY count DESC
  `);

  // PRO affiliation distribution
  const proRows = await db.execute<{
    pro: string;
    count: number;
  }>(sql`
    SELECT pro, COUNT(*)::int AS count
    FROM ${users}
    WHERE pro IS NOT NULL
    GROUP BY pro
    ORDER BY count DESC
  `);

  // Referral source distribution
  const referralRows = await db.execute<{
    referral_source: string;
    count: number;
  }>(sql`
    SELECT referral_source, COUNT(*)::int AS count
    FROM ${users}
    WHERE referral_source IS NOT NULL
    GROUP BY referral_source
    ORDER BY count DESC
  `);

  const uc = userCounts.rows[0];
  const act = activation.rows[0];
  const pAct = performanceActivation.rows[0];
  const pc = performanceCounts.rows[0];

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    users: {
      total: uc.total_users,
      onboarded: uc.onboarded_users,
      with_artist: act.users_with_artist,
      with_song: act.users_with_song,
      with_scan: pAct.users_with_scan,
      with_discovered_performance: pAct.users_with_discovered,
      with_confirmed_performance: pAct.users_with_confirmed,
      with_submitted_performance: pAct.users_with_submitted,
    },
    performances: {
      discovered: pc.total_discovered,
      confirmed: pc.total_confirmed,
      submitted: pc.total_submitted,
      expired: pc.total_expired,
    },
    distributions: {
      capability: capabilityRows.rows,
      country: countryRows.rows,
      pro: proRows.rows,
      referral_source: referralRows.rows,
    },
  });
}
