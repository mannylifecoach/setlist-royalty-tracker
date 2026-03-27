import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const apiKey = `srt_${randomUUID().replace(/-/g, '')}`;

  const [updated] = await db
    .update(users)
    .set({ apiKey, updatedAt: new Date() })
    .where(eq(users.id, session.user.id))
    .returning({ apiKey: users.apiKey });

  return NextResponse.json({ apiKey: updated.apiKey });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const [user] = await db
    .select({ apiKey: users.apiKey })
    .from(users)
    .where(eq(users.id, session.user.id));

  return NextResponse.json({
    hasApiKey: !!user?.apiKey,
    apiKeyPreview: user?.apiKey
      ? `${user.apiKey.slice(0, 8)}...${user.apiKey.slice(-4)}`
      : null,
  });
}
