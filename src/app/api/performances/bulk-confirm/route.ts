import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { performances } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { withHandler, parseBody } from '@/lib/api-utils';
import { bulkConfirmSchema } from '@/lib/schemas';

export const POST = withHandler(async (request: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await parseBody(request, bulkConfirmSchema);
  if ('error' in result) return result.error;
  const { ids } = result.data;

  await db
    .update(performances)
    .set({ status: 'confirmed', updatedAt: new Date() })
    .where(
      and(
        eq(performances.userId, session.user.id),
        inArray(performances.id, ids),
        eq(performances.status, 'discovered')
      )
    );

  return NextResponse.json({ ok: true, confirmed: ids.length });
});
