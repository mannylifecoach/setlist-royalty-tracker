import { NextRequest, NextResponse } from 'next/server';
import { checkExpiringPerformances } from '@/lib/expiration';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await checkExpiringPerformances();

  return NextResponse.json({ ok: true, ...result });
}
