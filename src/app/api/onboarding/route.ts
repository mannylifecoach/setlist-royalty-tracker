import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users, trackedArtists } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { withHandler, parseBody } from '@/lib/api-utils';
import { onboardingSchema } from '@/lib/schemas';
import { sendWelcomeEmail } from '@/lib/email';

export const GET = withHandler(async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const [user] = await db
    .select({
      pro: users.pro,
      role: users.role,
      firstName: users.firstName,
      lastName: users.lastName,
      country: users.country,
      city: users.city,
      stageName: users.stageName,
      capabilities: users.capabilities,
      referralSource: users.referralSource,
      onboardingComplete: users.onboardingComplete,
    })
    .from(users)
    .where(eq(users.id, session.user.id));

  return NextResponse.json(user || { pro: null, role: null, onboardingComplete: null });
});

// Derive a legacy single-value role from the capabilities multi-select so
// existing code that still reads `role` keeps working. We pick the most
// specific capability a user checked.
function deriveRole(
  capabilities: Array<'write' | 'perform' | 'dj' | 'produce' | 'publish'>
): 'songwriter' | 'performer' | 'dj' | 'publisher' | 'manager' {
  if (capabilities.includes('publish')) return 'publisher';
  if (capabilities.includes('dj')) return 'dj';
  if (capabilities.includes('perform')) return 'performer';
  if (capabilities.includes('write') || capabilities.includes('produce')) return 'songwriter';
  return 'songwriter';
}

export const POST = withHandler(async (request: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await parseBody(request, onboardingSchema);
  if ('error' in result) return result.error;
  const {
    firstName,
    lastName,
    country,
    city,
    stageName,
    pro,
    capabilities,
    referralSource,
  } = result.data;

  const derivedRole = deriveRole(capabilities);

  // Update user profile
  await db
    .update(users)
    .set({
      firstName,
      lastName,
      country,
      city: city ?? null,
      stageName,
      capabilities,
      referralSource: referralSource ?? null,
      pro: pro ?? null,
      role: derivedRole,
      onboardingComplete: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  // Seed the user's first tracked artist from their stage name so the
  // scanner has something to work with out of the box.
  await db
    .insert(trackedArtists)
    .values({
      userId: session.user.id,
      artistName: stageName,
    })
    .onConflictDoNothing();

  // Send welcome email (non-blocking)
  if (session.user.email) {
    sendWelcomeEmail(session.user.email, stageName).catch(() => {});
  }

  return NextResponse.json({ success: true });
});
