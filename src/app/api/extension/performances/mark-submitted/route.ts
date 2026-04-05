import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-key-auth';
import { db } from '@/db';
import { performances } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getCorsHeaders } from '@/lib/cors';
import { withHandler, parseBody } from '@/lib/api-utils';
import { markSubmittedSchema } from '@/lib/schemas';

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

  return NextResponse.json(
    { updated: updated.length },
    { headers: corsHeaders }
  );
});
