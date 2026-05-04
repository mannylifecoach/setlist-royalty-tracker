import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

const { mockHealth, mockSendAlert } = vi.hoisted(() => ({
  mockHealth: {
    value: {
      status: 'healthy' as 'healthy' | 'unhealthy',
      totalFields: 18,
      resolvedFields: 18,
      failures: [] as Array<{ key: string; step: string; selector: unknown }>,
      fixtureCapturedDate: '2026-04-24',
      checkedAt: '2026-05-03T18:00:00.000Z',
    },
  },
  mockSendAlert: vi.fn(),
}));

vi.mock('@/lib/bmi-selector-health', () => ({
  runBmiSelectorHealthCheck: () => mockHealth.value,
}));

vi.mock('@/lib/email', () => ({
  sendBmiSelectorHealthAlert: mockSendAlert,
}));

import { GET, POST } from './route';

const ORIGINAL_SECRET = process.env.CRON_SECRET;

function makeRequest(authHeader?: string): unknown {
  return {
    headers: new Headers(authHeader ? { authorization: authHeader } : {}),
  };
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-cron-secret';
  mockSendAlert.mockReset();
  mockHealth.value = {
    status: 'healthy',
    totalFields: 18,
    resolvedFields: 18,
    failures: [],
    fixtureCapturedDate: '2026-04-24',
    checkedAt: '2026-05-03T18:00:00.000Z',
  };
});

describe('GET /api/cron/bmi-health-check — auth', () => {
  it('returns 401 when no auth header', async () => {
    const res = await GET(makeRequest() as never);
    expect(res.status).toBe(401);
  });

  it('returns 401 when CRON_SECRET does not match', async () => {
    const res = await GET(makeRequest('Bearer wrong-secret') as never);
    expect(res.status).toBe(401);
  });

  it('accepts the valid CRON_SECRET on GET (Vercel cron pattern)', async () => {
    const res = await GET(makeRequest('Bearer test-cron-secret') as never);
    expect(res.status).toBe(200);
  });

  it('accepts the valid CRON_SECRET on POST (manual trigger pattern)', async () => {
    const res = await POST(makeRequest('Bearer test-cron-secret') as never);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/cron/bmi-health-check — healthy path', () => {
  it('returns the health result with status=healthy', async () => {
    const res = await GET(makeRequest('Bearer test-cron-secret') as never);
    const body = await res.json();
    expect(body.status).toBe('healthy');
    expect(body.totalFields).toBe(18);
    expect(body.resolvedFields).toBe(18);
    expect(body.failures).toEqual([]);
  });

  it('does NOT send an alert email when healthy', async () => {
    await GET(makeRequest('Bearer test-cron-secret') as never);
    expect(mockSendAlert).not.toHaveBeenCalled();
  });

  it('does not include alertEmail field when healthy', async () => {
    const res = await GET(makeRequest('Bearer test-cron-secret') as never);
    const body = await res.json();
    expect(body.alertEmail).toBeUndefined();
  });
});

describe('GET /api/cron/bmi-health-check — unhealthy path', () => {
  beforeEach(() => {
    mockHealth.value = {
      status: 'unhealthy',
      totalFields: 18,
      resolvedFields: 16,
      failures: [
        { key: 'eventName', step: 'step1', selector: { placeholder: 'Event name', tag: 'INPUT' } },
        { key: 'songSearch', step: 'step2', selector: { id: 'tbSongSearch', tag: 'INPUT' } },
      ],
      fixtureCapturedDate: '2026-04-24',
      checkedAt: '2026-05-03T18:00:00.000Z',
    };
  });

  it('sends an alert email when unhealthy', async () => {
    await GET(makeRequest('Bearer test-cron-secret') as never);
    expect(mockSendAlert).toHaveBeenCalledTimes(1);
    const call = mockSendAlert.mock.calls[0][0];
    expect(call.failures).toHaveLength(2);
    expect(call.totalFields).toBe(18);
    expect(call.resolvedFields).toBe(16);
  });

  it('returns 200 with status=unhealthy and alertEmail=sent', async () => {
    const res = await GET(makeRequest('Bearer test-cron-secret') as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('unhealthy');
    expect(body.alertEmail).toBe('sent');
    expect(body.failures).toHaveLength(2);
  });

  it('still returns 200 with the failure list when alert email throws', async () => {
    mockSendAlert.mockRejectedValueOnce(new Error('Resend down'));
    const res = await GET(makeRequest('Bearer test-cron-secret') as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('unhealthy');
    expect(body.alertEmail).toBe('failed');
    expect(body.alertError).toContain('Resend down');
    // The failures list is still surfaced so a human looking at logs can debug.
    expect(body.failures).toHaveLength(2);
  });
});

afterAll(() => {
  if (ORIGINAL_SECRET !== undefined) {
    process.env.CRON_SECRET = ORIGINAL_SECRET;
  } else {
    delete process.env.CRON_SECRET;
  }
});
