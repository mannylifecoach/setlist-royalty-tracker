import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { withHandler, parseBody } from '@/lib/api-utils';
import { updateSettingsSchema } from '@/lib/schemas';

export const GET = withHandler(async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const [user] = await db
    .select({ name: users.name, pro: users.pro, role: users.role, emailNotifications: users.emailNotifications })
    .from(users)
    .where(eq(users.id, session.user.id));

  return NextResponse.json(user || { name: null, pro: null, role: null, emailNotifications: true });
});

export const PATCH = withHandler(async (request: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await parseBody(request, updateSettingsSchema);
  if ('error' in result) return result.error;
  const { name, pro, role, emailNotifications } = result.data;

  const [updated] = await db
    .update(users)
    .set({
      name: name ?? undefined,
      pro: pro ?? undefined,
      role: role ?? undefined,
      emailNotifications: emailNotifications ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id))
    .returning();

  return NextResponse.json({ name: updated.name, pro: updated.pro, role: updated.role, emailNotifications: updated.emailNotifications });
});
