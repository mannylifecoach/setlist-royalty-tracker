import { Resend } from 'resend';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://setlistroyaltytracker.com';

function layout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>setlist royalty tracker</title>
</head>
<body style="margin:0;padding:0;background-color:#000000;color:#ffffff;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;letter-spacing:0.5px;text-transform:lowercase;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
          <!-- header -->
          <tr>
            <td style="padding-bottom:32px;border-bottom:1px solid #222222;">
              <span style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-2px;text-transform:uppercase;font-family:'Sora',Arial,Helvetica,sans-serif;">srt</span>
              <br>
              <span style="font-size:13px;font-weight:500;color:#ffffff;letter-spacing:0.5px;">setlist royalty tracker</span>
            </td>
          </tr>
          <!-- content -->
          <tr>
            <td style="padding:32px 0;">
              ${content}
            </td>
          </tr>
          <!-- footer -->
          <tr>
            <td style="padding-top:32px;border-top:1px solid #222222;">
              <span style="font-size:11px;color:#777777;">you're receiving this because you have an account on setlist royalty tracker.</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;padding:8px 16px;background-color:#ffffff;color:#000000;font-size:12px;font-weight:500;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;text-decoration:none;text-transform:lowercase;letter-spacing:0.5px;border:1px solid #ffffff;">${text}</a>`;
}

function statusBadge(label: string, color: string): string {
  return `<span style="display:inline-block;padding:2px 8px;font-size:11px;color:${color};border:1px solid ${color};opacity:0.8;">${label}</span>`;
}

export function magicLinkEmail(url: string): { subject: string; html: string; text: string } {
  const time = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });

  const content = `
    <p style="margin:0 0 24px 0;color:#ffffff;font-size:15px;font-weight:400;letter-spacing:-0.3px;">
      sign in to setlistroyalty.com
    </p>

    <p style="margin:0 0 24px 0;">
      ${button('sign in', url)}
    </p>

    <p style="margin:0 0 8px 0;color:#777777;font-size:12px;">
      if you did not request this email you can safely ignore it.
    </p>
    <p style="margin:0;color:#555555;font-size:11px;">
      this link expires in 24 hours and can only be used once.
    </p>
  `;

  return {
    subject: `sign in to setlistroyalty.com · ${time}`,
    html: layout(content),
    text: `sign in to setlistroyalty.com\n\n${url}\n\nif you did not request this email you can safely ignore it.\nthis link expires in 24 hours and can only be used once.`,
  };
}

export async function sendWelcomeEmail(to: string, artistName: string) {
  const subject = 'welcome to setlist royalty tracker';

  const content = `
    <p style="margin:0 0 24px 0;color:#ffffff;font-size:15px;font-weight:400;letter-spacing:-0.3px;">
      you're in. here's how to start collecting your live performance royalties.
    </p>

    <p style="margin:0 0 16px 0;color:#5281eb;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:1px;">
      for songwriters
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;border:1px solid #151515;margin-bottom:24px;">
      <tr>
        <td style="padding:16px;border-bottom:1px solid #151515;">
          <span style="font-size:11px;color:#777777;font-weight:500;">step 1</span>
          <p style="margin:4px 0 0 0;color:#d5d5d5;font-size:13px;">add artists who perform your songs</p>
          <p style="margin:4px 0 0 0;color:#555555;font-size:11px;">we added <strong style="color:#999999;">${artistName}</strong> during setup — add more anytime.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px;border-bottom:1px solid #151515;">
          <span style="font-size:11px;color:#777777;font-weight:500;">step 2</span>
          <p style="margin:4px 0 0 0;color:#d5d5d5;font-size:13px;">register your songs and link them to artists</p>
          <p style="margin:4px 0 0 0;color:#555555;font-size:11px;">the scanner needs to know which songs to look for in setlists.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px;border-bottom:1px solid #151515;">
          <span style="font-size:11px;color:#777777;font-weight:500;">step 3</span>
          <p style="margin:4px 0 0 0;color:#d5d5d5;font-size:13px;">scan for performances</p>
          <p style="margin:4px 0 0 0;color:#555555;font-size:11px;">we search 9.6m+ setlists on setlist.fm to find concerts where your songs were played.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px;">
          <span style="font-size:11px;color:#777777;font-weight:500;">step 4</span>
          <p style="margin:4px 0 0 0;color:#d5d5d5;font-size:13px;">confirm matches and submit to your pro</p>
          <p style="margin:4px 0 0 0;color:#555555;font-size:11px;">use our chrome extension to auto-fill bmi live in seconds (requires google chrome), or export a csv as a backup.</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 16px 0;color:#5281eb;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:1px;">
      for dj-producers
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;border:1px solid #151515;margin-bottom:24px;">
      <tr>
        <td style="padding:16px;border-bottom:1px solid #151515;">
          <span style="font-size:11px;color:#777777;font-weight:500;">import your sets</span>
          <p style="margin:4px 0 0 0;color:#d5d5d5;font-size:13px;">upload serato dj history csv files</p>
          <p style="margin:4px 0 0 0;color:#555555;font-size:11px;">we match every track against your registered songs — including remixes and edits via musicbrainz.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px;">
          <span style="font-size:11px;color:#777777;font-weight:500;">remix matching</span>
          <p style="margin:4px 0 0 0;color:#d5d5d5;font-size:13px;">automatic work-level matching catches versions others miss</p>
          <p style="margin:4px 0 0 0;color:#555555;font-size:11px;">if a dj plays your track's remix, srt connects it back to your original work using musicbrainz work relationships.</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 24px 0;color:#777777;font-size:12px;">
      most songwriters and dj-producers have unreported performances they don't know about. let's find yours.
    </p>

    ${button('go to dashboard', `${APP_URL}/dashboard`)}
  `;

  const text = `welcome to setlist royalty tracker!\n\nhere's how to start collecting your live performance royalties:\n\nfor songwriters:\n1. add artists who perform your songs (we added ${artistName} during setup)\n2. register your songs and link them to artists\n3. scan for performances — we search 9.6m+ setlists\n4. confirm matches and submit to your pro using our chrome extension (requires google chrome) or csv export\n\nfor dj-producers:\n• import your serato dj history csv files\n• we match every track — including remixes and edits — via musicbrainz work relationships\n\nmost songwriters and dj-producers have unreported performances they don't know about. let's find yours.\n\nlog in: ${APP_URL}/dashboard\n\n— setlist royalty tracker`;

  await getResend().emails.send({
    from: process.env.EMAIL_FROM || 'noreply@example.com',
    to,
    subject,
    html: layout(content),
    text,
  });
}

export async function sendNewPerformancesEmail(
  to: string,
  artistName: string,
  count: number,
  songTitles: string[]
) {
  const plural = count > 1 ? 's' : '';
  const subject = `${count} new performance${plural} found for ${artistName}`;

  const songRows = songTitles
    .map(
      (t) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #151515;color:#d5d5d5;font-size:13px;">${t}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #151515;text-align:right;">${statusBadge('discovered', '#5281eb')}</td>
        </tr>`
    )
    .join('');

  const content = `
    <p style="margin:0 0 24px 0;color:#ffffff;font-size:15px;font-weight:400;letter-spacing:-0.3px;">
      we found <strong>${count}</strong> new performance${plural} of your songs by <strong>${artistName}</strong>.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;border:1px solid #151515;margin-bottom:24px;">
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #222222;color:#777777;font-size:11px;font-weight:500;">song</td>
        <td style="padding:8px 12px;border-bottom:1px solid #222222;color:#777777;font-size:11px;font-weight:500;text-align:right;">status</td>
      </tr>
      ${songRows}
    </table>

    <p style="margin:0 0 24px 0;color:#777777;font-size:12px;">
      review and confirm these performances before they expire.
    </p>

    ${button('review performances', `${APP_URL}/dashboard`)}
  `;

  const text = `we found ${count} new performance${plural} of your songs by ${artistName}.\n\nsongs performed:\n${songTitles.map((t) => `• ${t}`).join('\n')}\n\nlog in to review and confirm these performances before they expire.\n\n— setlist royalty tracker`;

  await getResend().emails.send({
    from: process.env.EMAIL_FROM || 'noreply@example.com',
    to,
    subject,
    html: layout(content),
    text,
  });
}

export async function sendExpirationWarningEmail(
  to: string,
  performanceCount: number,
  daysRemaining: number
) {
  const plural = performanceCount > 1 ? 's' : '';
  const subject = `${performanceCount} performance${plural} expiring in ${daysRemaining} days`;

  const urgencyColor =
    daysRemaining <= 7 ? '#ef4444' : daysRemaining <= 14 ? '#eab308' : '#777777';

  const content = `
    <p style="margin:0 0 24px 0;color:#ffffff;font-size:15px;font-weight:400;letter-spacing:-0.3px;">
      you have <strong>${performanceCount}</strong> unsubmitted performance${plural} expiring soon.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;border:1px solid #151515;margin-bottom:24px;">
      <tr>
        <td style="padding:16px;text-align:center;">
          <span style="font-size:32px;font-weight:300;color:${urgencyColor};letter-spacing:-2px;">${daysRemaining}</span>
          <br>
          <span style="font-size:11px;color:#777777;">days remaining</span>
        </td>
        <td style="padding:16px;text-align:center;border-left:1px solid #222222;">
          <span style="font-size:32px;font-weight:300;color:#ffffff;letter-spacing:-2px;">${performanceCount}</span>
          <br>
          <span style="font-size:11px;color:#777777;">performance${plural} at risk</span>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 24px 0;color:#777777;font-size:12px;">
      submit them to your PRO before the deadline to claim your royalties.
    </p>

    ${button('submit now', `${APP_URL}/dashboard`)}
  `;

  const text = `you have ${performanceCount} unsubmitted performance${plural} that will expire in ${daysRemaining} days.\n\nlog in to submit them to your PRO before the deadline.\n\n— setlist royalty tracker`;

  await getResend().emails.send({
    from: process.env.EMAIL_FROM || 'noreply@example.com',
    to,
    subject,
    html: layout(content),
    text,
  });
}
