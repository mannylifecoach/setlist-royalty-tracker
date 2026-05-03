import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-key-auth';
import { getCorsHeaders } from '@/lib/cors';
import { withHandler } from '@/lib/api-utils';
import { lookupVenue } from '@/lib/google-places';
import { checkRateLimit, getClientIp } from '@/lib/route-rate-limit';

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: getCorsHeaders(request, 'GET, OPTIONS') });
}

export const GET = withHandler(async (request: NextRequest) => {
  const corsHeaders = getCorsHeaders(request, 'GET, OPTIONS');

  const user = await authenticateApiKey(request);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const limit = checkRateLimit({
    keyId: user.id,
    ip: getClientIp(request),
    route: '/api/extension/venue-enrichment',
    perKeyPerHour: 60,
    perIpPerHour: 120,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate limit exceeded' },
      {
        status: 429,
        headers: { ...corsHeaders, 'Retry-After': String(limit.retryAfterSec) },
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name')?.trim();
  const state = searchParams.get('state')?.trim() || null;
  const city = searchParams.get('city')?.trim() || null;

  if (!name || name.length < 2 || name.length > 200) {
    return NextResponse.json(
      { error: 'invalid name parameter' },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const enrichment = await lookupVenue(name, state, city);
    return NextResponse.json(enrichment, { headers: corsHeaders });
  } catch (err) {
    console.error('venue-enrichment lookup failed:', err);
    return NextResponse.json(
      { found: false, error: 'lookup failed' },
      { status: 200, headers: corsHeaders }
    );
  }
});
