import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-key-auth';
import { db } from '@/db';
import { performances } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getCorsHeaders } from '@/lib/cors';
import { withHandler, parseBody } from '@/lib/api-utils';
import { markSubmittedSchema } from '@/lib/schemas';
import { recordStatusChanges } from '@/lib/status-history';

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: getCorsHeaders(request, 'POST, OPTIONS') });
}

export const POST = withHandler(async (request: NextRequest) => {
  const corsHeaders = getCorsHeaders(request, 'POST, OPTIONS');

  const user = await authenticateApiKey(request);
  if (!user) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401, headers: corsHeaders }
    );
  }

  const result = await parseBody(request, markSubmittedSchema);
  if ('error' in result) {
    return NextResponse.json(
      { error: 'Validation error' },
      { status: 400, headers: corsHeaders }
    );
  }
  const { performanceIds } = result.data;

  // Snapshot current statuses before mutation so the audit log can record
  // accurate from→to transitions (e.g. confirmed → submitted vs discovered → submitted).
  const before = await db
    .select({ id: performances.id, status: performances.status })
    .from(performances)
    .where(
      and(
        eq(performances.userId, user.id),
        inArray(performances.id, performanceIds)
      )
    );
  const fromById = new Map(before.map((r) => [r.id, r.status]));

  const updated = await db
    .update(performances)
    .set({ status: 'submitted', updatedAt: new Date() })
    .where(
      and(
        eq(performances.userId, user.id),
        inArray(performances.id, performanceIds)
      )
    )
    .returning({ id: performances.id });

  try {
    await recordStatusChanges(
      updated
        .filter((row) => fromById.get(row.id) !== 'submitted')
        .map((row) => ({
          performanceId: row.id,
          userId: user.id,
          fromStatus: fromById.get(row.id) ?? null,
          toStatus: 'submitted' as const,
          source: 'extension' as const,
        }))
    );
  } catch (err) {
    console.error('status_history extension insert failed', err);
  }

  return NextResponse.json(
    { updated: updated.length },
    { headers: corsHeaders }
  );
});
