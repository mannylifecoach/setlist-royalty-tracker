import { describe, it, expect, vi, beforeEach } from 'vitest';
import { _resetForTests as resetRateLimit } from '@/lib/route-rate-limit';

const EMAIL = 'test@example.com';
const VALID_CODE = '123456';
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

type Vt = { identifier: string; token: string; expires: Date };
type UserRow = { id: string; email: string; emailVerified: Date | null };

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    verificationToken: null as Vt | null,
    user: null as UserRow | null,
    insertedSessions: [] as Array<{ sessionToken: string; userId: string; expires: Date }>,
    deletedTokens: [] as string[],
    updatedUsers: [] as Array<{ id: string; emailVerified: Date }>,
    createdUsers: [] as Array<{ email: string; emailVerified: Date }>,
  },
}));

vi.mock('@/db', () => ({
  db: {
    select: () => ({
      from: (table: unknown) => {
        const tableName = String(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (table as any)?.[Symbol.for('drizzle:Name')] || table
        );
        if (tableName.includes('verification_tokens') || tableName.includes('verificationTokens')) {
          return { where: () => Promise.resolve(mockDb.verificationToken ? [mockDb.verificationToken] : []) };
        }
        if (tableName.includes('users')) {
          return { where: () => Promise.resolve(mockDb.user ? [mockDb.user] : []) };
        }
        return { where: () => Promise.resolve([]) };
      },
    }),
    delete: () => ({
      where: () => {
        if (mockDb.verificationToken) {
          mockDb.deletedTokens.push(mockDb.verificationToken.token);
          mockDb.verificationToken = null;
        }
        return Promise.resolve();
      },
    }),
    insert: (table: unknown) => ({
      values: (row: Record<string, unknown>) => {
        const tableName = String(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (table as any)?.[Symbol.for('drizzle:Name')] || table
        );
        if (tableName.includes('sessions')) {
          mockDb.insertedSessions.push(row as { sessionToken: string; userId: string; expires: Date });
          return Promise.resolve();
        }
        if (tableName.includes('users')) {
          const created = { id: USER_ID, email: row.email as string, emailVerified: row.emailVerified as Date };
          mockDb.user = created;
          mockDb.createdUsers.push({ email: row.email as string, emailVerified: row.emailVerified as Date });
          return { returning: () => Promise.resolve([created]) };
        }
        return Promise.resolve();
      },
    }),
    update: (table: unknown) => ({
      set: (patch: Record<string, unknown>) => ({
        where: () => {
          const tableName = String(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (table as any)?.[Symbol.for('drizzle:Name')] || table
          );
          if (tableName.includes('users') && mockDb.user) {
            mockDb.updatedUsers.push({ id: mockDb.user.id, emailVerified: patch.emailVerified as Date });
            mockDb.user.emailVerified = patch.emailVerified as Date;
          }
          return Promise.resolve();
        },
      }),
    }),
  },
}));

import { POST } from './route';

function makeRequest(body: unknown, opts: { url?: string; ip?: string } = {}): unknown {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (opts.ip) headers.set('x-forwarded-for', opts.ip);
  return {
    url: opts.url ?? 'http://localhost:3000/api/auth/verify-code',
    headers,
    json: async () => body,
  };
}

beforeEach(() => {
  resetRateLimit();
  mockDb.verificationToken = {
    identifier: EMAIL,
    token: VALID_CODE,
    expires: new Date(Date.now() + 60 * 60 * 1000),
  };
  mockDb.user = null;
  mockDb.insertedSessions = [];
  mockDb.deletedTokens = [];
  mockDb.updatedUsers = [];
  mockDb.createdUsers = [];
});

describe('POST /api/auth/verify-code — validation', () => {
  it('returns 400 on missing email', async () => {
    const res = await POST(makeRequest({ code: VALID_CODE }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 on malformed email', async () => {
    const res = await POST(makeRequest({ email: 'not-an-email', code: VALID_CODE }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 on missing code', async () => {
    const res = await POST(makeRequest({ email: EMAIL }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 on non-6-digit code', async () => {
    const res = await POST(makeRequest({ email: EMAIL, code: '12345' }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 on alphanumeric code', async () => {
    const res = await POST(makeRequest({ email: EMAIL, code: 'abcdef' }) as never);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/verify-code — token lookup', () => {
  it('returns 400 when no verification token matches', async () => {
    mockDb.verificationToken = null;
    const res = await POST(makeRequest({ email: EMAIL, code: VALID_CODE }) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid code/i);
  });

  it('returns 400 + cleans up when the token is expired', async () => {
    mockDb.verificationToken!.expires = new Date(Date.now() - 1000);
    const res = await POST(makeRequest({ email: EMAIL, code: VALID_CODE }) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/expired/i);
    expect(mockDb.deletedTokens).toContain(VALID_CODE);
  });
});

describe('POST /api/auth/verify-code — happy path', () => {
  it('creates a new user if no row exists for the email', async () => {
    mockDb.user = null;
    const res = await POST(makeRequest({ email: EMAIL, code: VALID_CODE }) as never);
    expect(res.status).toBe(200);
    expect(mockDb.createdUsers).toHaveLength(1);
    expect(mockDb.createdUsers[0].email).toBe(EMAIL);
    expect(mockDb.createdUsers[0].emailVerified).toBeInstanceOf(Date);
  });

  it('marks an existing user as emailVerified if they were not already', async () => {
    mockDb.user = { id: USER_ID, email: EMAIL, emailVerified: null };
    const res = await POST(makeRequest({ email: EMAIL, code: VALID_CODE }) as never);
    expect(res.status).toBe(200);
    expect(mockDb.updatedUsers).toHaveLength(1);
    expect(mockDb.updatedUsers[0].id).toBe(USER_ID);
  });

  it('does not re-update an already-verified user', async () => {
    mockDb.user = { id: USER_ID, email: EMAIL, emailVerified: new Date('2026-01-01') };
    await POST(makeRequest({ email: EMAIL, code: VALID_CODE }) as never);
    expect(mockDb.updatedUsers).toHaveLength(0);
  });

  it('consumes the verification token (single-use)', async () => {
    await POST(makeRequest({ email: EMAIL, code: VALID_CODE }) as never);
    expect(mockDb.deletedTokens).toContain(VALID_CODE);
  });

  it('creates a session row with a 30-day expiry', async () => {
    await POST(makeRequest({ email: EMAIL, code: VALID_CODE }) as never);
    expect(mockDb.insertedSessions).toHaveLength(1);
    const sess = mockDb.insertedSessions[0];
    expect(sess.sessionToken).toBeTypeOf('string');
    expect(sess.sessionToken.length).toBeGreaterThan(32);
    const ttlDays = (sess.expires.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(ttlDays).toBeGreaterThan(29);
    expect(ttlDays).toBeLessThan(31);
  });

  it('sets the http (non-Secure) cookie name in dev (http URL)', async () => {
    const res = await POST(
      makeRequest({ email: EMAIL, code: VALID_CODE }, { url: 'http://localhost:3000/api/auth/verify-code' }) as never
    );
    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toMatch(/^authjs\.session-token=/);
    expect(setCookie).not.toMatch(/__Secure-/);
  });

  it('sets the __Secure-prefixed cookie name on HTTPS', async () => {
    const res = await POST(
      makeRequest(
        { email: EMAIL, code: VALID_CODE },
        { url: 'https://setlist-royalty-tracker.vercel.app/api/auth/verify-code' }
      ) as never
    );
    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toMatch(/^__Secure-authjs\.session-token=/);
    expect(setCookie).toMatch(/Secure/);
  });
});

describe('POST /api/auth/verify-code — rate limiting', () => {
  it('returns 429 after exceeding per-email limit', async () => {
    // Per-email limit is 10/hour. After 10 successful attempts (each consumes
    // the token; we'll re-set it for each call), the 11th should be blocked.
    mockDb.verificationToken = { identifier: EMAIL, token: VALID_CODE, expires: new Date(Date.now() + 60_000) };
    for (let i = 0; i < 10; i++) {
      // re-seed token so each call has a valid lookup (rate limit checks BEFORE lookup)
      mockDb.verificationToken = { identifier: EMAIL, token: VALID_CODE, expires: new Date(Date.now() + 60_000) };
      await POST(makeRequest({ email: EMAIL, code: VALID_CODE }, { ip: '1.1.1.1' }) as never);
    }
    mockDb.verificationToken = { identifier: EMAIL, token: VALID_CODE, expires: new Date(Date.now() + 60_000) };
    const res = await POST(makeRequest({ email: EMAIL, code: VALID_CODE }, { ip: '1.1.1.1' }) as never);
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
  });
});
