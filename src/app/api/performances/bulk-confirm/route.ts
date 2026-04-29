import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { performances } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { withHandler, parseBody } from '@/lib/api-utils';
import { bulkConfirmSchema } from '@/lib/schemas';
import { recordStatusChanges } from '@/lib/status-history';

export const POST = withHandler(async (request: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await parseBody(request, bulkConfirmSchema);
  if ('error' in result) return result.error;
  const { ids } = result.data;

  const updated = await db
    .update(performances)
    .set({ status: 'confirmed', updatedAt: new Date() })
    .where(
      and(
        eq(performances.userId, session.user.id),
        inArray(performances.id, ids),
        eq(performances.status, 'discovered')
      )
    )
    .returning({ id: performances.id });

  try {
    await recordStatusChanges(
      updated.map((row) => ({
        performanceId: row.id,
        userId: session.user!.id!,
        fromStatus: 'discovered' as const,
        toStatus: 'confirmed' as const,
        source: 'bulk' as const,
      }))
    );
  } catch (err) {
    console.error('status_history bulk insert failed', err);
  }

  return NextResponse.json({ ok: true, confirmed: updated.length });
});
