import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { performances } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { withHandler, parseBody, validateUuid } from '@/lib/api-utils';
import { updatePerformanceSchema } from '@/lib/schemas';
import { recordStatusChange } from '@/lib/status-history';
import type { PerformanceStatus } from '@/lib/constants';

export const PATCH = withHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const idCheck = validateUuid(id);
  if ('error' in idCheck) return idCheck.error;

  const result = await parseBody(request, updatePerformanceSchema);
  if ('error' in result) return result.error;

  // Read current row first so we can detect status transitions for the audit log.
  const [current] = await db
    .select({ status: performances.status })
    .from(performances)
    .where(and(eq(performances.id, id), eq(performances.userId, session.user.id)));

  if (!current) {
    return NextResponse.json({ error: 'performance not found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date(), ...result.data };

  const [updated] = await db
    .update(performances)
    .set(updates)
    .where(
      and(eq(performances.id, id), eq(performances.userId, session.user.id))
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: 'performance not found' }, { status: 404 });
  }

  if (result.data.status && result.data.status !== current.status) {
    try {
      await recordStatusChange({
        performanceId: id,
        userId: session.user.id,
        fromStatus: current.status as PerformanceStatus,
        toStatus: result.data.status,
        source: 'user',
      });
    } catch (err) {
      console.error('status_history insert failed', err);
    }
  }

  return NextResponse.json(updated);
});
