import { describe, it, expect, vi, beforeEach } from 'vitest';

// Track all emails sent
const sentEmails: { from: string; to: string; subject: string; text: string; html: string }[] = [];

vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: vi.fn().mockImplementation((email: unknown) => {
        sentEmails.push(email as typeof sentEmails[number]);
        return Promise.resolve({ id: 'mock-email-id' });
      }),
    };
  },
}));

import { sendNewPerformancesEmail, sendExpirationWarningEmail } from './email';

beforeEach(() => {
  sentEmails.length = 0;
});

// ---------------------------------------------------------------------------
// sendNewPerformancesEmail
// ---------------------------------------------------------------------------
describe('sendNewPerformancesEmail', () => {
  it('sends email with correct subject for single performance', async () => {
    await sendNewPerformancesEmail('user@test.com', 'Fred Again..', 1, ['Delilah']);
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].subject).toBe('1 new performance found for Fred Again..');
    expect(sentEmails[0].to).toBe('user@test.com');
  });

  it('pluralizes subject for multiple performances', async () => {
    await sendNewPerformancesEmail('user@test.com', 'Fred Again..', 3, ['Delilah', 'Lace It', 'Rumble']);
    expect(sentEmails[0].subject).toBe('3 new performances found for Fred Again..');
  });

  it('includes all song titles in body', async () => {
    await sendNewPerformancesEmail('user@test.com', 'Fred Again..', 2, ['Delilah', 'Lace It']);
    expect(sentEmails[0].text).toContain('• Delilah');
    expect(sentEmails[0].text).toContain('• Lace It');
  });

  it('includes artist name in body', async () => {
    await sendNewPerformancesEmail('user@test.com', 'Fred Again..', 1, ['Delilah']);
    expect(sentEmails[0].text).toContain('Fred Again..');
  });

  it('includes call to action', async () => {
    await sendNewPerformancesEmail('user@test.com', 'Fred Again..', 1, ['Delilah']);
    expect(sentEmails[0].text).toContain('log in to review');
  });

  it('sends HTML version with song table', async () => {
    await sendNewPerformancesEmail('user@test.com', 'Fred Again..', 2, ['Delilah', 'Lace It']);
    expect(sentEmails[0].html).toContain('Delilah');
    expect(sentEmails[0].html).toContain('Lace It');
    expect(sentEmails[0].html).toContain('discovered');
  });

  it('HTML includes dashboard link button', async () => {
    await sendNewPerformancesEmail('user@test.com', 'Fred Again..', 1, ['Delilah']);
    expect(sentEmails[0].html).toContain('/dashboard');
    expect(sentEmails[0].html).toContain('review performances');
  });

  it('HTML uses dark theme styling', async () => {
    await sendNewPerformancesEmail('user@test.com', 'Fred Again..', 1, ['Delilah']);
    expect(sentEmails[0].html).toContain('background-color:#1a1a1a');
    expect(sentEmails[0].html).toContain('setlist royalty tracker');
  });
});

// ---------------------------------------------------------------------------
// sendExpirationWarningEmail
// ---------------------------------------------------------------------------
describe('sendExpirationWarningEmail', () => {
  it('sends email with correct subject for single performance', async () => {
    await sendExpirationWarningEmail('user@test.com', 1, 7);
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].subject).toBe('1 performance expiring in 7 days');
  });

  it('pluralizes subject for multiple performances', async () => {
    await sendExpirationWarningEmail('user@test.com', 5, 30);
    expect(sentEmails[0].subject).toBe('5 performances expiring in 30 days');
  });

  it('includes days remaining in body', async () => {
    await sendExpirationWarningEmail('user@test.com', 3, 14);
    expect(sentEmails[0].text).toContain('14 days');
  });

  it('includes performance count in body', async () => {
    await sendExpirationWarningEmail('user@test.com', 3, 14);
    expect(sentEmails[0].text).toContain('3 unsubmitted performances');
  });

  it('includes call to action to submit to PRO', async () => {
    await sendExpirationWarningEmail('user@test.com', 1, 7);
    expect(sentEmails[0].text).toContain('submit them to your PRO');
  });

  it('HTML shows urgency countdown', async () => {
    await sendExpirationWarningEmail('user@test.com', 5, 14);
    expect(sentEmails[0].html).toContain('14');
    expect(sentEmails[0].html).toContain('days remaining');
    expect(sentEmails[0].html).toContain('5');
    expect(sentEmails[0].html).toContain('at risk');
  });

  it('HTML uses red for 7-day warning', async () => {
    await sendExpirationWarningEmail('user@test.com', 1, 7);
    expect(sentEmails[0].html).toContain('#ef4444');
  });

  it('HTML uses yellow for 14-day warning', async () => {
    await sendExpirationWarningEmail('user@test.com', 1, 14);
    expect(sentEmails[0].html).toContain('#eab308');
  });

  it('HTML uses muted color for 30-day warning', async () => {
    await sendExpirationWarningEmail('user@test.com', 1, 30);
    expect(sentEmails[0].html).toContain('#777777');
  });

  it('HTML includes submit now button', async () => {
    await sendExpirationWarningEmail('user@test.com', 1, 7);
    expect(sentEmails[0].html).toContain('submit now');
    expect(sentEmails[0].html).toContain('/dashboard');
  });
});
