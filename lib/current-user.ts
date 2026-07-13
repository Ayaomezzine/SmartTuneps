import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { getSessionFromCookieStore } from './session';

export async function getCurrentUser() {
  try {
    const cookieStore = await Promise.resolve(cookies());
    const session = await getSessionFromCookieStore(cookieStore);
    if (!session) return null;

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { company: true }
    });

    return user;
  } catch {
    return null;
  }
}
