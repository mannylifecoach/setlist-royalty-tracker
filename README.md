# Setlist Royalty Tracker (SRT)

Web app + Chrome extension that finds unreported live performances of your songs and helps you file the royalties.

**Production:** [setlistroyalty.com](https://setlistroyalty.com) · also live at [setlist-royalty-tracker.vercel.app](https://setlist-royalty-tracker.vercel.app)

---

## What it does

BMI and ASCAP auto-track only the highest-grossing tours. Every other live performance has to be self-reported, and most songwriters either don't know to do it or never get around to it. SRT scans setlist.fm's 9.6M+ crowdsourced setlists to surface performances of your songs, then auto-fills the BMI Live / ASCAP OnStage submission forms via a Chrome extension so filing takes seconds instead of hours per show.

Mobile users get a PWA-installable web app for review/triage/configure; the actual PRO filing requires desktop Chrome (chrome.debugger CDP is the only way to defeat ASCAP's `saveOnFocus` server-side reject — no mobile platform exposes that API).

---

## Tech stack

- **Framework:** Next.js 16 (App Router — see `AGENTS.md` for breaking-changes warning)
- **Database:** Neon Postgres + Drizzle ORM
- **Auth:** Auth.js v5 (JWT sessions) + Resend for magic-link / 6-digit-code email delivery
- **Hosting:** Vercel (serverless functions + cron)
- **Errors:** Sentry · **Analytics:** PostHog
- **Chrome extension:** vanilla TS, bundled with esbuild, lives in `extension/`

---

## Local dev setup

### Prerequisites

- Node 20+ (Next.js 16 + Vitest 4 baseline)
- npm
- Access to the Neon project (or a local Postgres if you want isolation)
- Resend account for email delivery
- setlist.fm API key (free, [register here](https://www.setlist.fm/settings/api))

### Install + run

```bash
git clone https://github.com/mannylifecoach/setlist-royalty-tracker.git
cd setlist-royalty-tracker
npm install
cp .env.example .env.local   # fill in real values; see Env vars below
npm run dev                  # http://localhost:3000
```

### Env vars

All required env vars are listed in `.env.example`. The critical ones:

| Var | What it's for |
|---|---|
| `DATABASE_URL` | Neon pooled connection (used at runtime) |
| `DATABASE_URL_UNPOOLED` | Neon direct connection (used for migrations via `@neondatabase/serverless`) |
| `AUTH_SECRET` | Auth.js JWT signing/encryption + verification token hashing. **Generate with `openssl rand -base64 32`** |
| `AUTH_URL` | Required by Auth.js v5 in non-default port setups; `http://localhost:3000` for dev |
| `RESEND_API_KEY` | Email delivery (magic links, expiration warnings, welcome emails) |
| `EMAIL_FROM` | `notifications@setlistroyalty.com` in prod; any verified Resend sender in dev |
| `SETLISTFM_API_KEY` | Scanner backend |
| `CRON_SECRET` | Vercel cron auth (constant-time compared via `src/lib/safe-compare.ts`) |
| `ADMIN_SECRET` | Admin endpoints (same compare path as CRON_SECRET) |
| `NEXT_PUBLIC_POSTHOG_KEY` | Optional: analytics |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional: error reporting |

---

## Running the test suite

```bash
npm test                                      # vitest, runs once
npm run test:watch                            # vitest watch mode
npx vitest run src/lib/safe-compare.test.ts   # single file
```

648+ tests across schema, scanner, fillers, helpers, routes. CI gates on every PR via `.github/workflows/ci.yml`.

---

## Database migrations

Migrations live in `drizzle/NNNN_<name>.sql`. New schema changes:

1. Add the column / table to `src/db/schema.ts`
2. Write a new `drizzle/NNNN_<name>.sql` (next sequential number, descriptive name) — use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` so re-runs are idempotent
3. Apply manually to Neon (the project doesn't use `drizzle-kit migrate` — see `AGENTS.md` for the inline tsx snippet)
4. Verify via `information_schema.columns` query

Drizzle journal in `drizzle/meta/_journal.json` is intentionally out of date; the canonical source of truth is the numbered SQL files + the live DB.

---

## Chrome extension

Lives in `extension/`. Auto-fills BMI Live + ASCAP OnStage forms.

```bash
cd extension
npm install
npm run build           # writes extension/dist/ + the two zip variants
```

The build produces two zips in `Beta Distribution/`:

- `srt-chrome-extension.zip` — per-step pause UX (default)
- `srt-chrome-extension-autoadvance.zip` — auto-advance variant for power users

Sideload via `chrome://extensions` → Developer mode → "Load unpacked" → point at `extension/dist/`.

---

## Project structure

```
src/
  app/
    (app)/                authenticated routes (dashboard, songs, performances, settings, ...)
    (auth)/               login + sign-in flow
    (pitch)/              password-gated pitch deck
    api/                  HTTP + JSON endpoints + cron entry points
      auth/               Auth.js handlers + custom verify-code (PWA 6-digit path)
      cron/               Vercel cron-protected jobs (CRON_SECRET)
      admin/              ADMIN_SECRET-protected admin views
  components/             React components shared across pages
  db/                     Drizzle schema + connection factory
  lib/                    Pure helpers + integrations (scanner, fillers, fuzzy match, ...)
  types/                  TypeScript module augmentations
extension/                Chrome extension source + build
drizzle/                  Numbered SQL migrations
```

---

## Further reading

- `AGENTS.md` — required reading for AI agents + future devs: framework warnings, patterns to follow, common pitfalls
- `Projects/Setlist Royalty Tracker - Architecture.md` (in the parent Obsidian vault) — deeper system diagrams + key decisions
- `Projects/Setlist Royalty Tracker - Main Board.md` — the live Kanban (Backlog / Up Next / In Progress / Done)
