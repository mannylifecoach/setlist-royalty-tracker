import { NextRequest, NextResponse } from 'next/server';
import { checkExpiringPerformances } from '@/lib/expiration';
import { withHandler } from '@/lib/api-utils';

async function handler(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await checkExpiringPerformances();

  return NextResponse.json({ ok: true, ...result });
}

export const GET = withHandler(handler);
export const POST = withHandler(handler);
