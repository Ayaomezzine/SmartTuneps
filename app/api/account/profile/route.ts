import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { profileSchema } from '@/lib/validators';

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request as never);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId }, include: { company: true } });
  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, phone: user.phone, notificationPreferences: user.notificationPreferences },
    company: user.company
  });
}

export async function PUT(request: Request) {
  const session = await getSessionFromRequest(request as never);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.userId },
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      notificationPreferences: parsed.data.notificationPreferences
    },
    include: { company: true }
  });

  if (updated.company) {
    await prisma.company.update({
      where: { userId: updated.id },
      data: { email: updated.email, phone: updated.phone ?? updated.company.phone }
    });
  }

  return NextResponse.json({ user: updated });
}
