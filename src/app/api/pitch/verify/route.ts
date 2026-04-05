import { NextRequest, NextResponse } from 'next/server';
import { withHandler, parseBody } from '@/lib/api-utils';
import { pitchVerifySchema } from '@/lib/schemas';

export const POST = withHandler(async (req: NextRequest) => {
  const result = await parseBody(req, pitchVerifySchema);
  if ('error' in result) return result.error;

  const valid = result.data.password === process.env.PITCH_PASSWORD;
  return NextResponse.json({ valid }, { status: valid ? 200 : 401 });
});
