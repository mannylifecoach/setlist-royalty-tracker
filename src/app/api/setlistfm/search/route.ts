import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { searchArtists } from '@/lib/setlistfm';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'q parameter is required' }, { status: 400 });
  }

  const artists = await searchArtists(query);
  return NextResponse.json(artists);
}
