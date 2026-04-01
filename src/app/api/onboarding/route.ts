import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users, trackedArtists } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
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
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { pro, role, artistName } = await request.json();

  if (!pro || !role || !artistName?.trim()) {
    return NextResponse.json(
      { error: 'pro, role, and artistName are required' },
      { status: 400 }
    );
  }

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
      artistName: artistName.trim(),
    })
    .onConflictDoNothing();

  return NextResponse.json({ success: true });
}
