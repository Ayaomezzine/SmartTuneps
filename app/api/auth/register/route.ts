import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { createSessionToken, setSessionCookie } from '@/lib/session';
import { registerSchema } from '@/lib/validators';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existingUser) {
    return NextResponse.json({ error: 'Email already registered.' }, { status: 409 });
  }

  const userCount = await prisma.user.count();
  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
      role: userCount === 0 ? 'ADMIN' : 'USER',
      phone: parsed.data.phone,
      company: {
        create: {
          companyName: parsed.data.companyName,
          businessSector: parsed.data.businessSector,
          vatNumber: parsed.data.vatNumber || null,
          address: parsed.data.address,
          phone: parsed.data.phone,
          email: parsed.data.email,
          productsJson: JSON.stringify(parsed.data.products),
          customProducts: parsed.data.customProducts
        }
      }
    },
    include: { company: true }
  });

  const token = await createSessionToken({ userId: user.id, email: user.email, role: user.role });
  const response = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, company: user.company }, { status: 201 });
  setSessionCookie(response, token);
  return response;
}
