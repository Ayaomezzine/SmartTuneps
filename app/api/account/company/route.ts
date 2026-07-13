import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { companySchema } from '@/lib/validators';

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request as never);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId }, include: { company: true } });
  if (!user?.company) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ company: user.company });
}

export async function PUT(request: Request) {
  const session = await getSessionFromRequest(request as never);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = companySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.company.update({
    where: { userId: session.userId },
    data: {
      companyName: parsed.data.companyName,
      businessSector: parsed.data.businessSector,
      vatNumber: parsed.data.vatNumber || null,
      address: parsed.data.address,
      phone: parsed.data.phone,
      email: parsed.data.email,
      productsJson: JSON.stringify(parsed.data.products),
      customProducts: parsed.data.customProducts
    }
  });

  return NextResponse.json({ company: updated });
}
