import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-key-auth';
import { db } from '@/db';
import { performances } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const user = await authenticateApiKey(request);
  if (!user) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401, headers: corsHeaders }
    );
  }

  const { performanceIds } = await request.json();
  if (!Array.isArray(performanceIds) || performanceIds.length === 0) {
    return NextResponse.json(
      { error: 'performanceIds array required' },
      { status: 400, headers: corsHeaders }
    );
  }

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
}
