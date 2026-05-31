import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';
import { auth } from '@/lib/auth';
import { withHandler, parseBody } from '@/lib/api-utils';
import { checkRateLimit, getClientIp } from '@/lib/route-rate-limit';

const FEEDBACK_CONTEXTS = ['bmi', 'ascap', 'extension', 'general'] as const;

const FeedbackSchema = z.object({
  name: z.string().trim().max(80).optional(),
  email: z.string().trim().email().max(200).optional().or(z.literal('')),
  context: z.enum(FEEDBACK_CONTEXTS),
  message: z.string().trim().min(10).max(5000),
  // Honeypot — bots fill every field; humans never see this. If non-empty,
  // we return 200 silently without sending email so the bot thinks it worked.
  website: z.string().max(200).optional(),
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const POST = withHandler(async (request: NextRequest) => {
  const ip = getClientIp(request);
  const limit = checkRateLimit({
    keyId: ip,
    ip,
    route: '/api/feedback',
    perKeyPerHour: 5,
    perIpPerHour: 5,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
    );
  }

  const parsed = await parseBody(request, FeedbackSchema);
  if ('error' in parsed) return parsed.error;
  const { name, email, context, message, website } = parsed.data;

  if (website && website.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  const session = await auth().catch(() => null);
  const authedUserId = session?.user?.id;
  const authedUserEmail = session?.user?.email;

  const adminEmail = process.env.ADMIN_EMAIL || 'manny.alboroto@gmail.com';
  const fromAddress = process.env.EMAIL_FROM || 'noreply@example.com';
  const resend = new Resend(process.env.RESEND_API_KEY);
  const submittedAt = new Date().toISOString();

  const contextLabel: Record<typeof context, string> = {
    bmi: 'BMI flow',
    ascap: 'ASCAP flow',
    extension: 'Chrome extension',
    general: 'General',
  };

  const subjectName = name?.trim() || authedUserEmail || email || 'anonymous';
  const subject = `[SRT feedback · ${contextLabel[context]}] from ${subjectName}`;

  const adminHtml = `
    <div style="font-family:-apple-system,sans-serif;font-size:14px;line-height:1.5;color:#1a1a1a;">
      <p><strong>Context:</strong> ${escapeHtml(contextLabel[context])}</p>
      <p><strong>From:</strong> ${escapeHtml(name?.trim() || '(no name)')}${email ? ` &lt;${escapeHtml(email)}&gt;` : ''}</p>
      ${authedUserId ? `<p><strong>Authed user:</strong> ${escapeHtml(authedUserEmail || '')} (id: ${escapeHtml(authedUserId)})</p>` : '<p><strong>Authed user:</strong> (not signed in)</p>'}
      <p><strong>IP:</strong> ${escapeHtml(ip)}</p>
      <p><strong>Submitted:</strong> ${escapeHtml(submittedAt)}</p>
      <hr style="border:0;border-top:1px solid #ddd;margin:16px 0;" />
      <pre style="white-space:pre-wrap;font-family:-apple-system,sans-serif;font-size:14px;background:#f5f5f5;padding:12px;border-radius:4px;">${escapeHtml(message)}</pre>
    </div>
  `;
  const adminText = `Context: ${contextLabel[context]}
From: ${name?.trim() || '(no name)'}${email ? ` <${email}>` : ''}
${authedUserId ? `Authed user: ${authedUserEmail} (id: ${authedUserId})` : 'Authed user: (not signed in)'}
IP: ${ip}
Submitted: ${submittedAt}

---

${message}`;

  await resend.emails.send({
    from: fromAddress,
    to: adminEmail,
    subject,
    html: adminHtml,
    text: adminText,
    replyTo: email && email.length > 0 ? email : undefined,
  });

  if (email && email.length > 0) {
    const ackSubject = 'thanks for your feedback — srt';
    const ackHtml = `
      <div style="font-family:-apple-system,sans-serif;font-size:14px;line-height:1.5;color:#1a1a1a;">
        <p>got it. thanks for sending feedback on srt — we read everything.</p>
        <p>if there's anything urgent, you can also email <a href="mailto:manny.alboroto@gmail.com">manny.alboroto@gmail.com</a> directly.</p>
        <p style="color:#666;font-size:12px;margin-top:24px;">— setlist royalty tracker</p>
      </div>
    `;
    const ackText = `got it. thanks for sending feedback on srt — we read everything.

if there's anything urgent, you can also email manny.alboroto@gmail.com directly.

— setlist royalty tracker`;
    await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: ackSubject,
      html: ackHtml,
      text: ackText,
    });
  }

  return NextResponse.json({ ok: true });
});
