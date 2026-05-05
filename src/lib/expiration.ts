import { db } from '@/db';
import { performances, users } from '@/db/schema';
import { eq, and, lte, gte, inArray } from 'drizzle-orm';
import { sendExpirationWarningEmail } from './email';

const WARNING_THRESHOLDS_DAYS = [30, 14, 7] as const;

/**
 * Check for performances approaching their BMI Live filing deadline
 * and send warning emails to affected users.
 *
 * Deadlines are calculated by `calculateExpirationDate()` based on BMI's
 * actual quarterly tracking windows (verified 2026-05-04) — not a flat
 * 9-month rule. See setlistfm.ts for the full quarter→deadline mapping.
 *
 * Runs daily. Sends one email per user per threshold crossed
 * (e.g. "5 performances expiring in 14 days").
 */
export async function checkExpiringPerformances(): Promise<{
  emailsSent: number;
}> {
  let emailsSent = 0;
  const today = new Date();

  for (const daysOut of WARNING_THRESHOLDS_DAYS) {
    // Find the target date window: performances expiring on exactly this day threshold
    // Use a 1-day window so we don't re-send every day
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + daysOut);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];

    // Find unsubmitted performances expiring in this window
    const expiring = await db
      .select({
        userId: performances.userId,
      })
      .from(performances)
      .where(
        and(
          inArray(performances.status, ['discovered', 'confirmed']),
          gte(performances.expiresAt, targetDateStr),
          lte(performances.expiresAt, nextDayStr)
        )
      );

    if (expiring.length === 0) continue;

    // Group by user
    const byUser = new Map<string, number>();
    for (const row of expiring) {
      byUser.set(row.userId, (byUser.get(row.userId) || 0) + 1);
    }

    // Send one email per user
    for (const [userId, count] of byUser) {
      const user = await db
        .select({ email: users.email, emailNotifications: users.emailNotifications })
        .from(users)
        .where(eq(users.id, userId));

      if (user.length > 0 && user[0].email && user[0].emailNotifications) {
        await sendExpirationWarningEmail(user[0].email, count, daysOut);
        emailsSent++;
      }
    }
  }

  return { emailsSent };
}
