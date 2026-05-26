import { NextRequest, NextResponse } from 'next/server';
import { scanAllUsers } from '@/lib/scanner';
import { withHandler } from '@/lib/api-utils';
import { safeCompareSecret } from '@/lib/safe-compare';

async function handler(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!safeCompareSecret(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  await scanAllUsers();

  return NextResponse.json({ ok: true });
}

export const GET = withHandler(handler);
export const POST = withHandler(handler);
