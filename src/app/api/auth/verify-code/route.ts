import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { encode } from '@auth/core/jwt';
import { db } from '@/db';
import { users, verificationTokens } from '@/db/schema';
import { withHandler, parseBody } from '@/lib/api-utils';
import { isValidSixDigitCode } from '@/lib/auth-code';
import { checkRateLimit, getClientIp } from '@/lib/route-rate-limit';

// Auth.js v5 stores verification tokens as SHA-256(token + secret), hex-
// encoded. Match that here so our code-path lookup hits the same row the
// magic-link callback would find. Source:
//   @auth/core/lib/actions/signin/send-token.js:63
//   @auth/core/lib/utils/web.js (createHash helper)
async function hashAuthToken(token: string): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    // Without AUTH_SECRET nothing will ever match — fail loudly instead of
    // silently returning "invalid code" for every user.
    throw new Error('AUTH_SECRET env var is required for code verification');
  }
  return createHash('sha256').update(`${token}${secret}`).digest('hex');
}

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

  // Hash the user-supplied code with AUTH_SECRET so it matches what Auth.js
  // stored when it sent the email. The raw 6-digit code never appears in
  // the database — only the hash.
  const hashedToken = await hashAuthToken(code);
  const [vt] = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, email),
        eq(verificationTokens.token, hashedToken)
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
          eq(verificationTokens.token, hashedToken)
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
        eq(verificationTokens.token, hashedToken)
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

  // Mint a JWT identical in shape to what Auth.js would produce on its own
  // sign-in flow. Salt MUST be the cookie name (Auth.js derives the
  // encryption key from secret + salt; mismatched salt = decryption failure
  // on the next request). Payload mirrors the jwt callback in src/lib/auth.ts.
  const expiresMs = Date.now() + SESSION_DURATION_MS;
  const expires = new Date(expiresMs);
  const cookieName = sessionCookieName(request);
  const sessionToken = await encode({
    salt: cookieName,
    secret: process.env.AUTH_SECRET!,
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      // onboardingComplete reflects the actual user state. For brand-new
      // users this will be false; the jwt callback in src/lib/auth.ts will
      // lazy-refresh to true once they finish the /onboarding flow.
      onboardingComplete: !!user.onboardingComplete,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiresMs / 1000),
    },
  });

  const response = NextResponse.json({ success: true });
  const useSecure = new URL(request.url).protocol === 'https:';
  response.cookies.set(cookieName, sessionToken, {
    httpOnly: true,
    secure: useSecure,
    sameSite: 'lax',
    expires,
    path: '/',
  });
  return response;
});
