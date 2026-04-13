import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import Resend from 'next-auth/providers/resend';
import { getDb } from '@/db';
import { users, accounts, sessions, verificationTokens } from '@/db/schema';

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
          const time = new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${provider.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: provider.from,
              to,
              subject: `Sign in to setlistroyalty.com · ${time}`,
              html: `<body style="background:#000;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,sans-serif"><div style="max-width:400px;margin:0 auto;text-align:center"><h1 style="color:#fff;font-size:24px;font-weight:800;letter-spacing:-2px;text-transform:uppercase;margin-bottom:4px">SRT</h1><p style="color:#999;font-size:13px;margin-bottom:32px">setlist royalty tracker</p><p style="color:#e0e0e0;font-size:16px;margin-bottom:24px">sign in to <strong style="color:#fff">setlistroyalty.com</strong></p><a href="${url}" style="display:inline-block;background:#fff;color:#000;padding:14px 48px;font-size:14px;font-weight:500;text-decoration:none;text-transform:lowercase;letter-spacing:0.5px">sign in</a><p style="color:#666;font-size:12px;margin-top:32px">if you did not request this email you can safely ignore it.</p><p style="color:#444;font-size:11px;margin-top:24px">this link expires in 24 hours and can only be used once.</p></div></body>`,
              text: `Sign in to setlistroyalty.com\n\n${url}\n\nIf you did not request this email you can safely ignore it. This link expires in 24 hours and can only be used once.`,
            }),
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
