<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# SRT-specific patterns

Read these before touching code. The README covers what SRT is; this doc covers HOW SRT writes code.

## Adding a database migration

The project does NOT use `drizzle-kit migrate` to apply migrations — the journal is intentionally out of date. The canonical flow:

1. Edit `src/db/schema.ts` — add the column / table / index.
2. Add a new SQL file `drizzle/NNNN_<descriptive-name>.sql`. Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (or equivalent) so re-runs are idempotent.
3. Apply to Neon inline via the project's `@neondatabase/serverless` client:

```bash
set -a && source .env.local && set +a && npx tsx -e "
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
(async () => {
  const sql = neon(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL);
  const ddl = readFileSync('drizzle/NNNN_<name>.sql', 'utf8');
  const stripped = ddl.split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
  const statements = stripped.split(';').map(s => s.trim()).filter(Boolean);
  for (const stmt of statements) await sql.query(stmt);
  console.log('applied');
})();
"
```

4. Verify the column exists via `information_schema.columns` before considering the migration shipped.

## Building the Chrome extension

```bash
cd extension && npm run build
```

The build script (`extension/build.mjs`) writes `extension/dist/` AND two zip variants into `Beta Distribution/` at the repo root. Bump `extension/manifest.json#version` BEFORE building when shipping a new build to testers — they need a visible version bump in `chrome://extensions` to confirm they re-installed.

## IDOR check pattern for new routes

Every authenticated route that takes an ID from the request body or URL params MUST verify the resource belongs to `session.user.id` before reading/writing it. Pattern:

```ts
const [artist] = await db
  .select({ id: trackedArtists.id })
  .from(trackedArtists)
  .where(and(eq(trackedArtists.id, body.artistId), eq(trackedArtists.userId, userId)));
if (!artist) {
  return NextResponse.json({ error: 'artist not found' }, { status: 404 });
}
```

**Return 404, not 403.** A 403 confirms the resource exists (just not for this user) — that's an enumeration oracle. 404 is indistinguishable from "doesn't exist at all."

For bulk operations, do the IDOR check via a single `inArray` query and verify the result length matches the input length:

```ts
const ownedSongs = await db
  .select({ id: songs.id })
  .from(songs)
  .where(and(inArray(songs.id, candidateSongIds), eq(songs.userId, userId)));
if (ownedSongs.length !== candidateSongIds.length) {
  return NextResponse.json({ error: 'one or more songs not found' }, { status: 404 });
}
```

## Tests live next to the code

Every file in `src/lib/foo.ts` SHOULD have a `src/lib/foo.test.ts` next to it. Every route in `src/app/api/foo/route.ts` SHOULD have a `src/app/api/foo/route.test.ts`. No central `tests/` directory.

When you add a new helper, write the test FIRST or alongside — the project's CI gates on the full vitest suite and PRs without tests for new lib files won't pass review.

## Constant-time secret comparison

Any comparison of `CRON_SECRET`, `ADMIN_SECRET`, or any other long-lived shared secret MUST go through `safeCompareSecret` from `src/lib/safe-compare.ts`. Never use `===` for secret comparisons — it leaks timing.

```ts
import { safeCompareSecret } from '@/lib/safe-compare';

if (!safeCompareSecret(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}
```

## Auth.js v5 verification token hashing (subtle)

Auth.js v5 ALWAYS stores email-provider verification tokens as `SHA-256(token + AUTH_SECRET)`, hex-encoded. The provider's `secret` config field is documented as if it's optional but the framework falls back to `AUTH_SECRET` and hashes anyway.

If you write code that reads `verification_tokens` directly (custom verify endpoint, debug script, etc.), hash the input first:

```ts
import { createHash } from 'crypto';
const hashed = createHash('sha256').update(`${userTypedToken}${process.env.AUTH_SECRET}`).digest('hex');
```

See `src/app/api/auth/verify-code/route.ts` for a working reference implementation.

## Sessions are JWT, not database

As of 2026-05-23 the project uses `session: { strategy: 'jwt' }`. The `sessions` table in the schema is still defined (DrizzleAdapter requires it for type compatibility) but is no longer written to at runtime. Don't add code that inserts into `sessions` directly — issue a JWT via `@auth/core/jwt` `encode()` instead. See `src/app/api/auth/verify-code/route.ts` for the encode call with the correct salt + secret.

The `jwt` callback in `src/lib/auth.ts` lazy-refreshes `onboardingComplete` from the DB while it's cached as `false`; once `true`, it caches forever (until token expiry). If you add new fields to the session, follow the same pattern — initial value at sign-in time, lazy DB refresh only while the cached value is "stale-might-need-update".

## Sentry scrubbing

Sentry events go through `src/lib/sentry-scrub.ts` before send (wired into `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`). When adding new sensitive data flows, audit whether the scrubber covers them — Authorization headers and `Bearer XXX` / `srt_XXX` patterns are stripped today, but new patterns need explicit additions.

## Mobile vs desktop split

Filing to BMI/ASCAP via the Chrome extension is DESKTOP-ONLY by design — `chrome.debugger` CDP has no mobile equivalent on iOS or Android. The web app (PWA-installable, mobile-responsive) covers everything except the actual PRO submission. Don't try to bridge this gap; it's a platform-policy limit, not a missing feature.
