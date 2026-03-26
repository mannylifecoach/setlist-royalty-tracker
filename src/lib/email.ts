import { Resend } from 'resend';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendNewPerformancesEmail(
  to: string,
  artistName: string,
  count: number,
  songTitles: string[]
) {
  const songList = songTitles.map((t) => `• ${t}`).join('\n');

  await getResend().emails.send({
    from: process.env.EMAIL_FROM || 'noreply@example.com',
    to,
    subject: `${count} new performance${count > 1 ? 's' : ''} found for ${artistName}`,
    text: `we found ${count} new performance${count > 1 ? 's' : ''} of your songs by ${artistName}.\n\nsongs performed:\n${songList}\n\nlog in to review and confirm these performances before they expire.\n\n— setlist royalty tracker`,
  });
}

export async function sendExpirationWarningEmail(
  to: string,
  performanceCount: number,
  daysRemaining: number
) {
  await getResend().emails.send({
    from: process.env.EMAIL_FROM || 'noreply@example.com',
    to,
    subject: `${performanceCount} performance${performanceCount > 1 ? 's' : ''} expiring in ${daysRemaining} days`,
    text: `you have ${performanceCount} unsubmitted performance${performanceCount > 1 ? 's' : ''} that will expire in ${daysRemaining} days.\n\nlog in to submit them to your PRO before the deadline.\n\n— setlist royalty tracker`,
  });
}
