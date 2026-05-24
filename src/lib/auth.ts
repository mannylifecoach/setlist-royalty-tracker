import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import Resend from 'next-auth/providers/resend';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { users, accounts, sessions, verificationTokens } from '@/db/schema';
import { magicLinkEmail } from '@/lib/email';
import { generateSixDigitCode } from '@/lib/auth-code';

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const db = getDb();
  return {
    adapter: DrizzleAdapter(db, {
      usersTable: users,
      accountsTable: accounts as never,
      sessionsTable: sessions as never,
      verificationTokensTable: verificationTokens as never,
    }),
    providers: [
      Resend({
        from: process.env.EMAIL_FROM || 'noreply@example.com',
        apiKey: process.env.RESEND_API_KEY,
        // Override Auth.js's default long random token with a 6-digit code.
        // The token IS the user-facing code — it goes in the magic link URL
        // (?token=123456) AND is displayed in the email body. PWA users can
        // paste it into the app via /api/auth/verify-code without leaving
        // the standalone context.
        generateVerificationToken: generateSixDigitCode,
        async sendVerificationRequest({ identifier: to, provider, url, token }) {
          const { subject, html, text } = magicLinkEmail(url, token);
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${provider.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ from: provider.from, to, subject, html, text }),
          });
          if (!res.ok)
            throw new Error('Resend error: ' + JSON.stringify(await res.json()));
        },
      }),
    ],
    // JWT session strategy: tokens are signed with AUTH_SECRET and decoded
    // stateless on every request — no DB roundtrip per page navigation.
    // Tradeoff: server-side revocation requires a token denylist (deferred —
    // not needed at current scale). Existing DB-session users get logged out
    // on deploy + sign back in via the 6-digit code path.
    session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 days
    pages: {
      signIn: '/login',
      verifyRequest: '/login?verify=true',
      error: '/login',
    },
    callbacks: {
      // jwt runs on initial sign-in (when `user` is present from the adapter)
      // and on every subsequent request (when only `token` is present). Stash
      // the user id + onboarding flag in the token on sign-in so they're
      // available to the session callback below without further DB work.
      //
      // Lazy refresh: if the cached value is "not onboarded yet," DB-check on
      // each request so a freshly-completed onboarding flow flips the JWT
      // without requiring the user to sign in again. Once true, the JWT
      // caches that forever (until expiry) — zero DB calls in steady state.
      jwt: async ({ token, user }) => {
        if (user) {
          token.id = user.id;
          const fullUser = user as typeof user & { onboardingComplete?: Date | null };
          token.onboardingComplete = !!fullUser.onboardingComplete;
        }
        if (!token.onboardingComplete && token.id) {
          const [dbUser] = await db
            .select({ onboardingComplete: users.onboardingComplete })
            .from(users)
            .where(eq(users.id, token.id as string));
          if (dbUser?.onboardingComplete) {
            token.onboardingComplete = true;
          }
        }
        return token;
      },
      session({ session, token }) {
        if (session.user && token) {
          session.user.id = token.id as string;
          session.user.onboardingComplete = !!token.onboardingComplete;
        }
        return session;
      },
    },
  };
});
