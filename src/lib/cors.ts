const ALLOWED_ORIGINS = [
  'https://setlistroyalty.com',
  'https://www.setlistroyalty.com',
  'https://setlist-royalty-tracker.vercel.app',
  'https://ols.bmi.com',
];

export function getCorsHeaders(request: Request, methods: string): Record<string, string> {
  const origin = request.headers.get('origin') ?? '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
