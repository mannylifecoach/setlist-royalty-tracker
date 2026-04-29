import { WRITER_SHARE_TOTAL } from './constants';

export interface WriterRow {
  name: string;
  ipi?: string | null;
  role: string;
  sharePercent: number | string;
}

// ASCAP enforces writers=50%, publishers=50%. Writers must therefore sum to
// exactly 50.00 across all rows for one song. Allow a tiny rounding epsilon
// since users enter percentages and floats accumulate noise.
const EPSILON = 0.01;

export function validateWriterSplits(rows: WriterRow[]): {
  ok: boolean;
  total: number;
  error?: string;
} {
  if (rows.length === 0) {
    return {
      ok: false,
      total: 0,
      error: `at least one writer is required (sum to ${WRITER_SHARE_TOTAL})`,
    };
  }
  const total = rows.reduce((acc, r) => acc + Number(r.sharePercent || 0), 0);
  if (Math.abs(total - WRITER_SHARE_TOTAL) > EPSILON) {
    return {
      ok: false,
      total,
      error: `writer shares must sum to ${WRITER_SHARE_TOTAL} (currently ${total.toFixed(2)})`,
    };
  }
  return { ok: true, total };
}
