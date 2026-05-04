import { NextRequest, NextResponse } from 'next/server';
import { withHandler } from '@/lib/api-utils';
import { runBmiSelectorHealthCheck } from '@/lib/bmi-selector-health';
import { sendBmiSelectorHealthAlert } from '@/lib/email';

// Vercel cron: daily at 8am Hawaii / 18:00 UTC. See vercel.json.
// Manual trigger: curl -H "Authorization: Bearer $CRON_SECRET" https://setlistroyalty.com/api/cron/bmi-health-check

async function handler(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = runBmiSelectorHealthCheck();

  if (result.status === 'unhealthy') {
    try {
      await sendBmiSelectorHealthAlert({
        failures: result.failures,
        totalFields: result.totalFields,
        resolvedFields: result.resolvedFields,
        fixtureCapturedDate: result.fixtureCapturedDate,
        checkedAt: result.checkedAt,
      });
    } catch (err) {
      // Email failure should not mask the underlying health failure — surface
      // both in the response so we can debug from logs even if Resend is down.
      console.error('[bmi-health-check] alert email failed', err);
      return NextResponse.json(
        { ...result, alertEmail: 'failed', alertError: String(err) },
        { status: 200 }
      );
    }
    return NextResponse.json({ ...result, alertEmail: 'sent' });
  }

  return NextResponse.json(result);
}

export const GET = withHandler(handler);
export const POST = withHandler(handler);
