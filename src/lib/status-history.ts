import { db } from '@/db';
import { performanceStatusHistory } from '@/db/schema';
import type { PerformanceStatus } from './constants';

export type StatusChangeSource = 'user' | 'extension' | 'cron' | 'bulk';

// Append-only log of every performance status transition. Lets us answer
// "when did this row flip and from where?" if a user ever asks support.
// Inserts here are best-effort — if logging fails we don't want to fail the
// underlying status change, so callers swallow + log to console.
export async function recordStatusChange(args: {
  performanceId: string;
  userId: string;
  fromStatus: PerformanceStatus | null;
  toStatus: PerformanceStatus;
  source: StatusChangeSource;
}): Promise<void> {
  await db.insert(performanceStatusHistory).values({
    performanceId: args.performanceId,
    userId: args.userId,
    fromStatus: args.fromStatus,
    toStatus: args.toStatus,
    source: args.source,
  });
}

// Bulk variant — single multi-row insert for endpoints that flip many at once.
export async function recordStatusChanges(
  rows: Array<{
    performanceId: string;
    userId: string;
    fromStatus: PerformanceStatus | null;
    toStatus: PerformanceStatus;
    source: StatusChangeSource;
  }>
): Promise<void> {
  if (rows.length === 0) return;
  await db.insert(performanceStatusHistory).values(rows);
}
