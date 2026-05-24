import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import Resend from 'next-auth/providers/resend';
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
    pages: {
      signIn: '/login',
      verifyRequest: '/login?verify=true',
      error: '/login',
    },
    callbacks: {
      session({ session, user }) {
        if (session.user) {
          session.user.id = user.id;
        }
        return session;
      },
    },
  };
});
