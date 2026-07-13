import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getSessionFromRequest(request as never);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  await prisma.savedConsultation.upsert({
    where: { userId_consultationId: { userId: session.userId, consultationId: id } },
    create: { userId: session.userId, consultationId: id, status: 'saved' },
    update: { status: 'saved', archivedAt: null }
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, context: RouteContext) {
  const session = await getSessionFromRequest(request as never);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  await prisma.savedConsultation.deleteMany({ where: { userId: session.userId, consultationId: id } });
  return NextResponse.json({ success: true });
}
