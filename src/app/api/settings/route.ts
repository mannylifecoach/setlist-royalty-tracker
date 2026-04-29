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
      ipi: users.ipi,
      defaultRole: users.defaultRole,
      publisherName: users.publisherName,
      publisherIpi: users.publisherIpi,
      noPublisher: users.noPublisher,
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
      ipi: null,
      defaultRole: 'CA',
      publisherName: null,
      publisherIpi: null,
      noPublisher: false,
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
  const data = result.data;

  const [updated] = await db
    .update(users)
    .set({
      name: data.name ?? undefined,
      firstName: data.firstName ?? undefined,
      lastName: data.lastName ?? undefined,
      country: data.country ?? undefined,
      city: data.city ?? undefined,
      stageName: data.stageName ?? undefined,
      capabilities: data.capabilities ?? undefined,
      pro: data.pro ?? undefined,
      role: data.role ?? undefined,
      emailNotifications: data.emailNotifications ?? undefined,
      defaultStartTimeHour: data.defaultStartTimeHour ?? undefined,
      defaultStartTimeAmPm: data.defaultStartTimeAmPm ?? undefined,
      defaultEndTimeHour: data.defaultEndTimeHour ?? undefined,
      defaultEndTimeAmPm: data.defaultEndTimeAmPm ?? undefined,
      ipi: data.ipi ?? undefined,
      defaultRole: data.defaultRole ?? undefined,
      publisherName: data.publisherName ?? undefined,
      publisherIpi: data.publisherIpi ?? undefined,
      noPublisher: data.noPublisher ?? undefined,
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
    ipi: updated.ipi,
    defaultRole: updated.defaultRole,
    publisherName: updated.publisherName,
    publisherIpi: updated.publisherIpi,
    noPublisher: updated.noPublisher,
  });
});
