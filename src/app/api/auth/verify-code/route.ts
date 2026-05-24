import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { users, sessions, verificationTokens } from '@/db/schema';
import { withHandler, parseBody } from '@/lib/api-utils';
import { isValidSixDigitCode } from '@/lib/auth-code';
import { checkRateLimit, getClientIp } from '@/lib/route-rate-limit';

// POST /api/auth/verify-code — completes a sign-in by verifying a 6-digit
// code instead of clicking the magic-link URL. Required for PWA users on
// iOS, where the link from the email opens in Safari (the default browser)
// rather than the installed PWA — Safari sets the session cookie in its
// context, leaving the PWA stuck on "check your email". This endpoint lets
// the PWA finish the auth flow in its OWN context using the code paired
// with the link in the email.
//
// The 6-digit code IS the verification_tokens.token (auth.ts overrides
// generateVerificationToken to produce 6-digit values), so we can use the
// existing Auth.js token storage as-is. We replicate the post-verification
// steps the Auth.js email callback would have done: delete the token,
// find/create the user, mark emailVerified, create a session row, set the
// session cookie with the same name Auth.js reads.

const verifyCodeSchema = z.object({
  email: z.string().email().max(320),
  code: z
    .string()
    .refine(isValidSixDigitCode, 'code must be 6 digits'),
});

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, matches Auth.js default

function sessionCookieName(request: NextRequest): string {
  // Auth.js cookie naming: `__Secure-` prefix on HTTPS, no prefix on HTTP
  // (localhost dev). Match that so our cookie is the one Auth.js reads when
  // the user navigates to a protected route after verification.
  const useSecure = new URL(request.url).protocol === 'https:';
  return useSecure ? '__Secure-authjs.session-token' : 'authjs.session-token';
}

export const POST = withHandler(async (request: NextRequest) => {
  const parsed = await parseBody(request, verifyCodeSchema);
  if ('error' in parsed) return parsed.error;
  const { email, code } = parsed.data;

  const ip = getClientIp(request);
  const rl = checkRateLimit({
    keyId: email.toLowerCase(),
    ip,
    route: '/api/auth/verify-code',
    perKeyPerHour: 10,
    perIpPerHour: 30,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'too many attempts, try again later' },
      {
        status: 429,
        headers: { 'Retry-After': String(rl.retryAfterSec) },
      }
    );
  }

  // Look up the verification token. Auth.js stores tokens unhashed by default
  // (no `secret` set in the Resend provider config), so a direct equality
  // check matches the value the user typed.
  const [vt] = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, email),
        eq(verificationTokens.token, code)
      )
    );

  if (!vt) {
    return NextResponse.json({ error: 'invalid code' }, { status: 400 });
  }
  if (vt.expires < new Date()) {
    // Best-effort cleanup of the stale row; ignore failure (cron prunes anyway)
    await db
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, email),
          eq(verificationTokens.token, code)
        )
      );
    return NextResponse.json({ error: 'code expired' }, { status: 400 });
  }

  // Single-use: delete the row so neither the link nor the code can be reused.
  await db
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, email),
        eq(verificationTokens.token, code)
      )
    );

  // Find-or-create the user, matching Auth.js's email-provider semantics.
  let [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    [user] = await db
      .insert(users)
      .values({ email, emailVerified: new Date() })
      .returning();
  } else if (!user.emailVerified) {
    await db
      .update(users)
      .set({ emailVerified: new Date() })
      .where(eq(users.id, user.id));
  }

  // Mint a session row identical in shape to what Auth.js would have created
  // via the standard callback. The cookie value IS the sessionToken; Auth.js
  // looks it up via the DrizzleAdapter on every authenticated request.
  const sessionToken = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DURATION_MS);
  await db.insert(sessions).values({ sessionToken, userId: user.id, expires });

  const response = NextResponse.json({ success: true });
  const useSecure = new URL(request.url).protocol === 'https:';
  response.cookies.set(sessionCookieName(request), sessionToken, {
    httpOnly: true,
    secure: useSecure,
    sameSite: 'lax',
    expires,
    path: '/',
  });
  return response;
});
