// IDOR (Insecure Direct Object Reference) integration tests — every
// authenticated route taking a UUID in the path must scope its query to the
// current session's user_id, so user B can never read or mutate user A's
// resources by guessing/leaking an ID.
//
// Strategy: for each route we mock @/lib/auth + @/db so the wrong-user query
// returns no rows (which is exactly what a correct `WHERE id = ? AND user_id
// = ?` would produce when the WHERE filtered B's session against A's id).
// Then we call the handler and assert one of two safe outcomes:
//
//   1. 404 not found — the route prechecks ownership or filters in a
//      .returning() call and surfaces missing as 404 (preferred — no info
//      leak about whether the id exists for some other user).
//
//   2. 200 ok with no mutation — the route puts user_id in the WHERE clause
//      of the mutation itself, so wrong-user calls become idempotent no-ops
//      (acceptable; the resource is unchanged because nothing matched).
//
// Routes covered (12 method-route pairs):
//   GET    /api/songs/[id]/writers
//   PUT    /api/songs/[id]/writers
//   PATCH  /api/songs/[id]
//   DELETE /api/songs/[id]
//   POST   /api/songs/[id]/artists
//   DELETE /api/songs/[id]/artists
//   POST   /api/songs/[id]/enrich-metadata
//   PATCH  /api/performances/[id]
//   DELETE /api/performances/[id]
//   POST   /api/performances/[id]/enrich-capacity
//   POST   /api/artists/[id]/resolve
//   DELETE /api/artists/[id]
//
// If a new route taking [id] in the path is added, mirror it here. The
// alternative — silently shipping a route without IDOR coverage — has cost a
// real exposure on at least one card already (songs/[id]/artists DELETE
// missed an ownership check pre-2026-04-30 fix).

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Valid UUID v4 format — Zod's .uuid() in newer versions requires the
// version digit (13th char) to be a real version (1-8). Plain repeating
// chars like 'aaa-aaaa-aaaa-aaaa-aaa' fail because 'a' = 10 isn't a valid
// version. Use '4' in the version position.
const ATTACKER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const VICTIM_RESOURCE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const SOME_ARTIST_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SOME_MBID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

// Auth mock — returns the attacker's session. Routes scope db queries by
// session.user.id, so when paired with the wrong-user-empty db mock below
// every query returns nothing.
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => ({
    user: { id: ATTACKER_ID, email: 'attacker@example.com' },
  })),
}));

// Lib-level mocks that some routes delegate to. Both throw "not found" exactly
// the way the routes expect — proving they too scope by userId rather than
// trusting whatever id the route hands them.
vi.mock('@/lib/venue-enrichment', () => ({
  enrichPerformanceCapacity: vi.fn(async () => {
    throw new Error('Performance not found');
  }),
}));
vi.mock('@/lib/song-enrichment', () => ({
  enrichSongMetadata: vi.fn(async () => {
    throw new Error('Song not found');
  }),
  enrichSongInBackground: vi.fn(),
}));

// Build a thenable chain for db that resolves to `[]` for any select/update/
// delete/insert that ends with awaited terminal — i.e. the wrong-user filter
// returned no rows. Each query method also returns the same shape so chained
// calls like `update().set().where().returning()` work uniformly.
function emptyChain(): unknown {
  const empty: unknown[] = [];
  const node = {
    then: (resolve: (v: unknown[]) => void) => resolve(empty),
    from: () => node,
    set: () => node,
    values: () => node,
    where: () => node,
    orderBy: () => node,
    returning: () => node,
    onConflictDoNothing: () => node,
    innerJoin: () => node,
    limit: () => node,
  };
  return node;
}

vi.mock('@/db', () => ({
  db: {
    select: () => emptyChain(),
    update: () => emptyChain(),
    delete: () => emptyChain(),
    insert: () => emptyChain(),
    transaction: async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        select: () => emptyChain(),
        update: () => emptyChain(),
        delete: () => emptyChain(),
        insert: () => emptyChain(),
      }),
  },
}));

// Helpers for constructing minimal Next request objects per handler shape.
function mkRequest(opts: { body?: unknown } = {}): unknown {
  return {
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: async () => opts.body ?? {},
    nextUrl: { searchParams: new URLSearchParams() },
  };
}
function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------- Read/mutate routes that should return 404 when the resource is
// not owned by the current user ----------

describe('IDOR: returns 404 when wrong-user accesses a resource', () => {
  it('GET /api/songs/[id]/writers', async () => {
    const { GET } = await import('@/app/api/songs/[id]/writers/route');
    const res = await GET(mkRequest() as never, paramsFor(VICTIM_RESOURCE_ID) as never);
    expect(res.status).toBe(404);
    const body = await res.json();
    // Negative leak check: error body must not echo the victim's id back.
    expect(JSON.stringify(body)).not.toContain(VICTIM_RESOURCE_ID);
  });

  it('PUT /api/songs/[id]/writers', async () => {
    const { PUT } = await import('@/app/api/songs/[id]/writers/route');
    const res = await PUT(
      mkRequest({
        body: { writers: [{ name: 'X', role: 'CA', sharePercent: 50 }] },
      }) as never,
      paramsFor(VICTIM_RESOURCE_ID) as never
    );
    expect(res.status).toBe(404);
  });

  it('PATCH /api/songs/[id]', async () => {
    const { PATCH } = await import('@/app/api/songs/[id]/route');
    const res = await PATCH(
      mkRequest({ body: { title: 'attacker-rename' } }) as never,
      paramsFor(VICTIM_RESOURCE_ID) as never
    );
    expect(res.status).toBe(404);
  });

  it('POST /api/songs/[id]/artists (link)', async () => {
    const { POST } = await import('@/app/api/songs/[id]/artists/route');
    const res = await POST(
      mkRequest({ body: { artistId: SOME_ARTIST_ID } }) as never,
      paramsFor(VICTIM_RESOURCE_ID) as never
    );
    expect(res.status).toBe(404);
  });

  it('DELETE /api/songs/[id]/artists (unlink) — fixed 2026-04-30', async () => {
    // This is the IDOR that was found during this card. Pre-fix the DELETE
    // didn't precheck song ownership and just ran a WHERE id+artistId delete,
    // letting any authenticated user unlink artists from any other user's
    // song. Test now pins the fix in place.
    const { DELETE } = await import('@/app/api/songs/[id]/artists/route');
    const res = await DELETE(
      mkRequest({ body: { artistId: SOME_ARTIST_ID } }) as never,
      paramsFor(VICTIM_RESOURCE_ID) as never
    );
    expect(res.status).toBe(404);
  });

  it('POST /api/songs/[id]/enrich-metadata', async () => {
    const { POST } = await import('@/app/api/songs/[id]/enrich-metadata/route');
    const res = await POST(
      mkRequest() as never,
      paramsFor(VICTIM_RESOURCE_ID) as never
    );
    expect(res.status).toBe(404);
  });

  it('PATCH /api/performances/[id]', async () => {
    const { PATCH } = await import('@/app/api/performances/[id]/route');
    const res = await PATCH(
      mkRequest({ body: { status: 'submitted' } }) as never,
      paramsFor(VICTIM_RESOURCE_ID) as never
    );
    expect(res.status).toBe(404);
  });

  it('DELETE /api/performances/[id]', async () => {
    const { DELETE } = await import('@/app/api/performances/[id]/route');
    const res = await DELETE(
      mkRequest() as never,
      paramsFor(VICTIM_RESOURCE_ID) as never
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    // Negative leak check: 404 must not echo the requested id.
    expect(JSON.stringify(body)).not.toContain(VICTIM_RESOURCE_ID);
  });

  it('POST /api/performances/[id]/enrich-capacity', async () => {
    const { POST } = await import('@/app/api/performances/[id]/enrich-capacity/route');
    const res = await POST(
      mkRequest() as never,
      paramsFor(VICTIM_RESOURCE_ID) as never
    );
    expect(res.status).toBe(404);
  });

  it('POST /api/artists/[id]/resolve', async () => {
    const { POST } = await import('@/app/api/artists/[id]/resolve/route');
    const res = await POST(
      mkRequest({ body: { mbid: SOME_MBID } }) as never,
      paramsFor(VICTIM_RESOURCE_ID) as never
    );
    expect(res.status).toBe(404);
  });
});

// ---------- Mutation routes that put userId in the WHERE clause and return
// 200 ok regardless. Pre-fix exposure surface is "the WHERE filtered nothing
// to delete," which is privacy-preserving but indistinguishable from success
// in the response. Tests pin the no-mutation behavior by spying on the
// underlying db.delete chain. ----------

describe('IDOR: routes returning 200 ok must filter mutation by userId', () => {
  it('DELETE /api/songs/[id] — wrong user does not delete (no userId leak in 200 body)', async () => {
    const { DELETE } = await import('@/app/api/songs/[id]/route');
    const res = await DELETE(
      mkRequest() as never,
      paramsFor(VICTIM_RESOURCE_ID) as never
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    // The privacy-preserving 200 doesn't echo any victim data.
    expect(JSON.stringify(body)).not.toContain(VICTIM_RESOURCE_ID);
  });

  it('DELETE /api/artists/[id] — wrong user does not delete', async () => {
    const { DELETE } = await import('@/app/api/artists/[id]/route');
    const res = await DELETE(
      mkRequest() as never,
      paramsFor(VICTIM_RESOURCE_ID) as never
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });
});

// ---------- Unauthenticated baseline — every route should refuse without a
// session before even reaching authz code. We swap the auth mock to return
// null in-place rather than vi.doMock + resetModules, which fights with the
// already-imported mocked module graph. ----------

describe('Unauthenticated baseline (sanity check that auth gate runs first)', () => {
  it('every [id] route returns 401 with no session', async () => {
    const auth = (await import('@/lib/auth')) as unknown as {
      auth: ReturnType<typeof vi.fn>;
    };
    auth.auth.mockResolvedValueOnce(null);
    auth.auth.mockResolvedValueOnce(null);
    auth.auth.mockResolvedValueOnce(null);
    auth.auth.mockResolvedValueOnce(null);
    auth.auth.mockResolvedValueOnce(null);
    auth.auth.mockResolvedValueOnce(null);
    auth.auth.mockResolvedValueOnce(null);
    auth.auth.mockResolvedValueOnce(null);
    auth.auth.mockResolvedValueOnce(null);
    auth.auth.mockResolvedValueOnce(null);
    auth.auth.mockResolvedValueOnce(null);
    auth.auth.mockResolvedValueOnce(null);

    const cases = [
      [(await import('@/app/api/songs/[id]/writers/route')).GET, 'GET writers'],
      [(await import('@/app/api/songs/[id]/writers/route')).PUT, 'PUT writers'],
      [(await import('@/app/api/songs/[id]/route')).PATCH, 'PATCH song'],
      [(await import('@/app/api/songs/[id]/route')).DELETE, 'DELETE song'],
      [(await import('@/app/api/songs/[id]/artists/route')).POST, 'POST song-artist'],
      [(await import('@/app/api/songs/[id]/artists/route')).DELETE, 'DELETE song-artist'],
      [(await import('@/app/api/songs/[id]/enrich-metadata/route')).POST, 'POST enrich-metadata'],
      [(await import('@/app/api/performances/[id]/route')).PATCH, 'PATCH performance'],
      [(await import('@/app/api/performances/[id]/route')).DELETE, 'DELETE performance'],
      [(await import('@/app/api/performances/[id]/enrich-capacity/route')).POST, 'POST enrich-capacity'],
      [(await import('@/app/api/artists/[id]/route')).DELETE, 'DELETE artist'],
      [(await import('@/app/api/artists/[id]/resolve/route')).POST, 'POST resolve-artist'],
    ] as const;

    for (const [handler, label] of cases) {
      const res = await handler(
        mkRequest({ body: { artistId: SOME_ARTIST_ID, mbid: SOME_MBID } }) as never,
        paramsFor(VICTIM_RESOURCE_ID) as never
      );
      expect(res.status, label).toBe(401);
    }
  });
});
