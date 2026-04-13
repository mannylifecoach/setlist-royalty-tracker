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
    .select({
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      country: users.country,
      city: users.city,
      stageName: users.stageName,
      capabilities: users.capabilities,
      pro: users.pro,
      role: users.role,
      emailNotifications: users.emailNotifications,
      defaultStartTimeHour: users.defaultStartTimeHour,
      defaultStartTimeAmPm: users.defaultStartTimeAmPm,
      defaultEndTimeHour: users.defaultEndTimeHour,
      defaultEndTimeAmPm: users.defaultEndTimeAmPm,
    })
    .from(users)
    .where(eq(users.id, session.user.id));

  return NextResponse.json(
    user || {
      name: null,
      firstName: null,
      lastName: null,
      country: null,
      city: null,
      stageName: null,
      capabilities: [],
      pro: null,
      role: null,
      emailNotifications: true,
      defaultStartTimeHour: '8:00',
      defaultStartTimeAmPm: 'PM',
      defaultEndTimeHour: '11:00',
      defaultEndTimeAmPm: 'PM',
    }
  );
});

export const PATCH = withHandler(async (request: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await parseBody(request, updateSettingsSchema);
  if ('error' in result) return result.error;
  const {
    name,
    firstName,
    lastName,
    country,
    city,
    stageName,
    capabilities,
    pro,
    role,
    emailNotifications,
    defaultStartTimeHour,
    defaultStartTimeAmPm,
    defaultEndTimeHour,
    defaultEndTimeAmPm,
  } = result.data;

  const [updated] = await db
    .update(users)
    .set({
      name: name ?? undefined,
      firstName: firstName ?? undefined,
      lastName: lastName ?? undefined,
      country: country ?? undefined,
      city: city ?? undefined,
      stageName: stageName ?? undefined,
      capabilities: capabilities ?? undefined,
      pro: pro ?? undefined,
      role: role ?? undefined,
      emailNotifications: emailNotifications ?? undefined,
      defaultStartTimeHour: defaultStartTimeHour ?? undefined,
      defaultStartTimeAmPm: defaultStartTimeAmPm ?? undefined,
      defaultEndTimeHour: defaultEndTimeHour ?? undefined,
      defaultEndTimeAmPm: defaultEndTimeAmPm ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id))
    .returning();

  return NextResponse.json({
    name: updated.name,
    firstName: updated.firstName,
    lastName: updated.lastName,
    country: updated.country,
    city: updated.city,
    stageName: updated.stageName,
    capabilities: updated.capabilities,
    pro: updated.pro,
    role: updated.role,
    emailNotifications: updated.emailNotifications,
    defaultStartTimeHour: updated.defaultStartTimeHour,
    defaultStartTimeAmPm: updated.defaultStartTimeAmPm,
    defaultEndTimeHour: updated.defaultEndTimeHour,
    defaultEndTimeAmPm: updated.defaultEndTimeAmPm,
  });
});
