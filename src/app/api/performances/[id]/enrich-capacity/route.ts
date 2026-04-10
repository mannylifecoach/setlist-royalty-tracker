import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { withHandler, validateUuid } from '@/lib/api-utils';
import { enrichPerformanceCapacity } from '@/lib/venue-enrichment';

export const POST = withHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const idCheck = validateUuid(id);
  if ('error' in idCheck) return idCheck.error;

  try {
    const result = await enrichPerformanceCapacity(id, session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Performance not found') {
      return NextResponse.json({ error: 'performance not found' }, { status: 404 });
    }
    throw error;
  }
});
