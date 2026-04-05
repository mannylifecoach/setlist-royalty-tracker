import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withHandler<T extends (...args: any[]) => Promise<Response>>(handler: T): T {
  return (async (...args: unknown[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('API route error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }) as T;
}

export async function parseBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { data };
  } catch (e) {
    if (e instanceof ZodError) {
      return {
        error: NextResponse.json(
          { error: 'Validation error', details: e.issues },
          { status: 400 }
        ),
      };
    }
    return {
      error: NextResponse.json({ error: 'Invalid request body' }, { status: 400 }),
    };
  }
}

export function validateUuid(id: string): { valid: true } | { error: NextResponse } {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return { error: NextResponse.json({ error: 'Invalid ID format' }, { status: 400 }) };
  }
  return { valid: true };
}

export function parseQuery<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>
): { data: T } | { error: NextResponse } {
  try {
    const obj = Object.fromEntries(searchParams.entries());
    const data = schema.parse(obj);
    return { data };
  } catch (e) {
    if (e instanceof ZodError) {
      return {
        error: NextResponse.json(
          { error: 'Validation error', details: e.issues },
          { status: 400 }
        ),
      };
    }
    return {
      error: NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 }),
    };
  }
}
