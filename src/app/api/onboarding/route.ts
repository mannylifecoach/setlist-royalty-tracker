import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users, trackedArtists } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { withHandler, parseBody } from '@/lib/api-utils';
import { onboardingSchema } from '@/lib/schemas';

export const GET = withHandler(async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const [user] = await db
    .select({
      pro: users.pro,
      role: users.role,
      onboardingComplete: users.onboardingComplete,
    })
    .from(users)
    .where(eq(users.id, session.user.id));

  return NextResponse.json(user || { pro: null, role: null, onboardingComplete: null });
});

export const POST = withHandler(async (request: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await parseBody(request, onboardingSchema);
  if ('error' in result) return result.error;
  const { pro, role, artistName } = result.data;

  // Update user profile
  await db
    .update(users)
    .set({
      pro,
      role,
      onboardingComplete: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  // Add initial artist (ignore if already exists)
  await db
    .insert(trackedArtists)
    .values({
      userId: session.user.id,
      artistName,
    })
    .onConflictDoNothing();

  return NextResponse.json({ success: true });
});
