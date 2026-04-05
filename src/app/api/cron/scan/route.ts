import { NextRequest, NextResponse } from 'next/server';
import { scanAllUsers } from '@/lib/scanner';
import { withHandler } from '@/lib/api-utils';

export const POST = withHandler(async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  await scanAllUsers();

  return NextResponse.json({ ok: true });
});
