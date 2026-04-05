import { NextRequest, NextResponse } from 'next/server';

const rateLimit = new Map<string, { count: number; resetTime: number }>();

function cleanupRateLimit() {
  const now = Date.now();
  for (const [key, value] of rateLimit) {
    if (now > value.resetTime) {
      rateLimit.delete(key);
    }
  }
}

// Route-specific limits: [maxRequests, windowMs]
// Order matters — more specific prefixes first
const RATE_LIMITS: [string, number, number][] = [
  ['/api/scan', 5, 60_000],        // 5/min (expensive — triggers setlist.fm API)
  ['/api/cron/', 2, 60_000],       // 2/min
  ['/api/extension/', 30, 60_000], // 30/min
  ['/api/', 60, 60_000],           // 60/min default
];

function getRateLimit(pathname: string): [number, number] {
  for (const [prefix, max, window] of RATE_LIMITS) {
    if (pathname.startsWith(prefix)) return [max, window];
  }
  return [60, 60_000];
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only rate-limit API routes, skip auth (NextAuth handles its own)
  if (!pathname.startsWith('/api/') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const key = `${ip}:${pathname}`;
  const [maxRequests, windowMs] = getRateLimit(pathname);
  const now = Date.now();

  // Periodic cleanup (~1% of requests)
  if (Math.random() < 0.01) cleanupRateLimit();

  const entry = rateLimit.get(key);
  if (!entry || now > entry.resetTime) {
    rateLimit.set(key, { count: 1, resetTime: now + windowMs });
    return NextResponse.next();
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((entry.resetTime - now) / 1000)) },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
