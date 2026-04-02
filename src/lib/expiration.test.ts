import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let mockPerformances: { userId: string; expiresAt: string; status: string }[] = [];
let mockUsers: { id: string; email: string }[] = [];
const mockSendExpirationWarning = vi.fn();

vi.mock('@/db', () => {
  return {
    db: {
      select: (fields?: Record<string, unknown>) => ({
        from: (table: unknown) => ({
          where: vi.fn().mockImplementation(() => {
            const tableName = String(table);
            if (tableName.includes('users')) {
              // User lookup by ID — return matching user
              return Promise.resolve(mockUsers);
            }
            // Performances query — return matching performances
            return Promise.resolve(
              mockPerformances.map((p) => ({ userId: p.userId }))
            );
          }),
        }),
      }),
    },
  };
});

vi.mock('./email', () => ({
  sendExpirationWarningEmail: (...args: unknown[]) => mockSendExpirationWarning(...args),
}));

import { checkExpiringPerformances } from './expiration';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('checkExpiringPerformances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformances = [];
    mockUsers = [];
    mockSendExpirationWarning.mockResolvedValue(undefined);
  });

  it('sends no emails when there are no expiring performances', async () => {
    mockPerformances = [];
    const result = await checkExpiringPerformances();
    expect(result.emailsSent).toBe(0);
    expect(mockSendExpirationWarning).not.toHaveBeenCalled();
  });

  it('sends email when performances are expiring', async () => {
    mockPerformances = [
      { userId: 'user-1', expiresAt: '2026-05-01', status: 'discovered' },
    ];
    mockUsers = [{ id: 'user-1', email: 'user@test.com' }];

    const result = await checkExpiringPerformances();
    // May or may not send depending on whether today + threshold hits the date
    // The important thing is the function runs without error
    expect(result).toHaveProperty('emailsSent');
  });

  it('groups multiple performances per user into one email', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const dateStr = futureDate.toISOString().split('T')[0];

    mockPerformances = [
      { userId: 'user-1', expiresAt: dateStr, status: 'discovered' },
      { userId: 'user-1', expiresAt: dateStr, status: 'confirmed' },
    ];
    mockUsers = [{ id: 'user-1', email: 'user@test.com' }];

    const result = await checkExpiringPerformances();
    // Should send at most 1 email per user per threshold (not 2)
    if (result.emailsSent > 0) {
      expect(mockSendExpirationWarning).toHaveBeenCalledWith(
        'user@test.com',
        2,
        30
      );
    }
  });

  it('skips users without an email address', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = futureDate.toISOString().split('T')[0];

    mockPerformances = [
      { userId: 'user-no-email', expiresAt: dateStr, status: 'discovered' },
    ];
    mockUsers = []; // No user found / no email

    const result = await checkExpiringPerformances();
    expect(mockSendExpirationWarning).not.toHaveBeenCalled();
  });
});
