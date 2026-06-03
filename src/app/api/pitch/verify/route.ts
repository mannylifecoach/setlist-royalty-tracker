import { NextRequest, NextResponse } from 'next/server';
import { withHandler, parseBody } from '@/lib/api-utils';
import { pitchVerifySchema } from '@/lib/schemas';
import { safeCompareSecret } from '@/lib/safe-compare';

export const POST = withHandler(async (req: NextRequest) => {
  const result = await parseBody(req, pitchVerifySchema);
  if ('error' in result) return result.error;

  // Constant-time comparison — `===` short-circuits on first mismatch and
  // leaks PITCH_PASSWORD one character at a time under timing analysis.
  // (See AGENTS.md "Constant-time secret comparison".)
  const valid = safeCompareSecret(result.data.password, process.env.PITCH_PASSWORD);
  return NextResponse.json({ valid }, { status: valid ? 200 : 401 });
});
