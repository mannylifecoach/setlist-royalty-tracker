import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSession, mockSend } = vi.hoisted(() => ({
  mockSession: { value: null as { user: { id?: string; email?: string } } | null },
  mockSend: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => mockSession.value),
}));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
}));

import { POST } from './route';
import { _resetForTests } from '@/lib/route-rate-limit';

function makeRequest(body: unknown, ip = '1.2.3.4'): unknown {
  return {
    headers: new Headers({ 'x-forwarded-for': ip }),
    url: 'https://x/api/feedback',
    json: async () => body,
  };
}

beforeEach(() => {
  _resetForTests();
  mockSession.value = null;
  mockSend.mockReset();
  mockSend.mockResolvedValue({ data: { id: 'em_test' } });
});

describe('POST /api/feedback — validation', () => {
  it('returns 400 when message is missing', async () => {
    const res = await POST(makeRequest({ context: 'bmi' }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 when message is too short', async () => {
    const res = await POST(makeRequest({ context: 'bmi', message: 'short' }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 when context is not one of the allowed enum values', async () => {
    const res = await POST(
      makeRequest({ context: 'invalid', message: 'a valid length message' }) as never
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when email is malformed', async () => {
    const res = await POST(
      makeRequest({
        context: 'bmi',
        message: 'a valid length message',
        email: 'not-an-email',
      }) as never
    );
    expect(res.status).toBe(400);
  });

  it('accepts a minimal valid submission (context + message only)', async () => {
    const res = await POST(
      makeRequest({ context: 'general', message: 'something is broken on mobile' }) as never
    );
    expect(res.status).toBe(200);
  });
});

describe('POST /api/feedback — honeypot', () => {
  it('silently returns 200 without sending email when honeypot is filled', async () => {
    const res = await POST(
      makeRequest({
        context: 'bmi',
        message: 'a valid length message',
        website: 'http://spammer.example.com',
      }) as never
    );
    expect(res.status).toBe(200);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('sends email when honeypot is absent or empty', async () => {
    const res = await POST(
      makeRequest({ context: 'bmi', message: 'a valid length message' }) as never
    );
    expect(res.status).toBe(200);
    expect(mockSend).toHaveBeenCalled();
  });
});

describe('POST /api/feedback — email content', () => {
  it('sends to ADMIN_EMAIL with subject including context label + sender', async () => {
    await POST(
      makeRequest({
        context: 'ascap',
        message: 'work registration is confusing',
        name: 'Tiffany',
      }) as never
    );
    expect(mockSend).toHaveBeenCalledOnce();
    const sent = mockSend.mock.calls[0][0];
    expect(sent.subject).toContain('ASCAP flow');
    expect(sent.subject).toContain('Tiffany');
    expect(sent.text).toContain('work registration is confusing');
  });

  it('includes the IP address in the admin email body', async () => {
    await POST(
      makeRequest({ context: 'bmi', message: 'a valid length message' }, '5.6.7.8') as never
    );
    const sent = mockSend.mock.calls[0][0];
    expect(sent.text).toContain('5.6.7.8');
  });

  it('escapes HTML in the message to prevent injection into admin email', async () => {
    await POST(
      makeRequest({
        context: 'extension',
        message: '<script>alert(1)</script> needs to be escaped',
      }) as never
    );
    const sent = mockSend.mock.calls[0][0];
    expect(sent.html).not.toContain('<script>alert(1)</script>');
    expect(sent.html).toContain('&lt;script&gt;');
  });

  it('sets replyTo to the submitter email when provided', async () => {
    await POST(
      makeRequest({
        context: 'general',
        message: 'a valid length message',
        email: 'tester@example.com',
      }) as never
    );
    const sent = mockSend.mock.calls[0][0];
    expect(sent.replyTo).toBe('tester@example.com');
  });

  it('does not set replyTo when no email is provided', async () => {
    await POST(
      makeRequest({ context: 'general', message: 'a valid length message' }) as never
    );
    const sent = mockSend.mock.calls[0][0];
    expect(sent.replyTo).toBeUndefined();
  });
});

describe('POST /api/feedback — auto-ack', () => {
  it('sends an acknowledgment to the submitter when email is provided', async () => {
    await POST(
      makeRequest({
        context: 'bmi',
        message: 'a valid length message',
        email: 'tester@example.com',
      }) as never
    );
    expect(mockSend).toHaveBeenCalledTimes(2);
    const ack = mockSend.mock.calls[1][0];
    expect(ack.to).toBe('tester@example.com');
    expect(ack.subject).toMatch(/thanks/i);
  });

  it('does not send an ack when no email is provided', async () => {
    await POST(
      makeRequest({ context: 'bmi', message: 'a valid length message' }) as never
    );
    expect(mockSend).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/feedback — authenticated user enrichment', () => {
  it('includes the authed user id + email in the admin email when signed in', async () => {
    mockSession.value = {
      user: { id: 'user-123', email: 'mckay@example.com' },
    };
    await POST(
      makeRequest({ context: 'bmi', message: 'a valid length message' }) as never
    );
    const sent = mockSend.mock.calls[0][0];
    expect(sent.text).toContain('mckay@example.com');
    expect(sent.text).toContain('user-123');
  });

  it('notes "(not signed in)" when no session is present', async () => {
    await POST(
      makeRequest({ context: 'bmi', message: 'a valid length message' }) as never
    );
    const sent = mockSend.mock.calls[0][0];
    expect(sent.text).toContain('(not signed in)');
  });
});

describe('POST /api/feedback — rate limiting', () => {
  it('allows 5 requests per hour from the same IP', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await POST(
        makeRequest({ context: 'bmi', message: 'a valid length message' }) as never
      );
      expect(res.status).toBe(200);
    }
  });

  it('returns 429 with Retry-After on the 6th request', async () => {
    for (let i = 0; i < 5; i++) {
      await POST(
        makeRequest({ context: 'bmi', message: 'a valid length message' }) as never
      );
    }
    const res = await POST(
      makeRequest({ context: 'bmi', message: 'a valid length message' }) as never
    );
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).not.toBeNull();
  });

  it('does not call Resend when rate-limited', async () => {
    for (let i = 0; i < 5; i++) {
      await POST(
        makeRequest({ context: 'bmi', message: 'a valid length message' }) as never
      );
    }
    mockSend.mockClear();
    await POST(
      makeRequest({ context: 'bmi', message: 'a valid length message' }) as never
    );
    expect(mockSend).not.toHaveBeenCalled();
  });
});
