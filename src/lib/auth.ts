import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import Resend from 'next-auth/providers/resend';
import { getDb } from '@/db';
import { users, accounts, sessions, verificationTokens } from '@/db/schema';
import { magicLinkEmail } from '@/lib/email';

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
        async sendVerificationRequest({ identifier: to, provider, url }) {
          const { subject, html, text } = magicLinkEmail(url);
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
