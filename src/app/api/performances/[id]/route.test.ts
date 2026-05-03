import { describe, it, expect, vi, beforeEach } from 'vitest';

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PERF_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const { mockSession, mockState } = vi.hoisted(() => ({
  mockSession: { value: null as { user: { id: string; email: string } } | null },
  mockState: { ownsRow: true, deletedRowsLength: null as number | null },
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => mockSession.value),
}));

vi.mock('@/db', () => ({
  db: {
    delete: () => ({
      where: () => ({
        returning: () =>
          Promise.resolve(
            mockState.deletedRowsLength != null
              ? Array.from({ length: mockState.deletedRowsLength }, () => ({ id: PERF_ID }))
              : mockState.ownsRow
                ? [{ id: PERF_ID }]
                : []
          ),
      }),
    }),
  },
}));

import { DELETE } from './route';

function makeRequest(): unknown {
  return {} as unknown;
}

beforeEach(() => {
  mockSession.value = { user: { id: USER_ID, email: 'test@example.com' } };
  mockState.ownsRow = true;
  mockState.deletedRowsLength = null;
});

describe('DELETE /api/performances/[id] — auth', () => {
  it('returns 401 when no session', async () => {
    mockSession.value = null;
    const res = await DELETE(makeRequest() as never, { params: Promise.resolve({ id: PERF_ID }) });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/performances/[id] — input validation', () => {
  it('returns 400 when id is not a UUID', async () => {
    const res = await DELETE(makeRequest() as never, {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/performances/[id] — IDOR protection', () => {
  it('returns 404 when row does not belong to caller (delete returns 0 rows)', async () => {
    mockState.ownsRow = false;
    const res = await DELETE(makeRequest() as never, {
      params: Promise.resolve({ id: PERF_ID }),
    });
    expect(res.status).toBe(404);
  });

  it('does not echo the requested id back in the 404 body (no enumeration oracle)', async () => {
    mockState.ownsRow = false;
    const res = await DELETE(makeRequest() as never, {
      params: Promise.resolve({ id: PERF_ID }),
    });
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain(PERF_ID);
  });
});

describe('DELETE /api/performances/[id] — happy path', () => {
  it('returns 200 with { deleted: true, id } when the row is removed', async () => {
    mockState.ownsRow = true;
    const res = await DELETE(makeRequest() as never, {
      params: Promise.resolve({ id: PERF_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(true);
    expect(body.id).toBe(PERF_ID);
  });
});
