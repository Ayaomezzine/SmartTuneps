import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { matchConsultation } from '@/lib/matching';

function isCronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const headerToken = request.headers.get('x-cron-token');
  if (headerToken === secret) return true;

  const authHeader = request.headers.get('authorization') ?? '';
  return authHeader === `Bearer ${secret}`;
}

function companyProfileText(company: { productsJson: string; customProducts: string; businessSector: string; companyName: string }) {
  return [company.companyName, company.businessSector, company.customProducts, company.productsJson].join(' ');
}

export async function POST(request: Request) {
  try {
    const cronAuthorized = isCronAuthorized(request);
    const session = await getSessionFromRequest(request as never);
    if (!session && !cronAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session ? await prisma.user.findUnique({ where: { id: session.userId } }) : null;
    if (!cronAuthorized && (!user || user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const companies = await prisma.company.findMany({ include: { user: true } });
    const consultations = await prisma.consultation.findMany({ where: { deadline: { gt: new Date() } } });
    let notificationsCreated = 0;

    for (const company of companies) {
      const profileText = companyProfileText(company);

      for (const consultation of consultations) {
        const match = await matchConsultation(profileText, `${consultation.originalTitle} ${consultation.organization} ${consultation.category} ${consultation.reason}`, consultation.urgency as 'urgent' | 'soon' | 'normal');
        if (match.score < 70 || !match.matchingProducts.length) continue;

        const existing = await prisma.notification.findFirst({
          where: {
            userId: company.userId,
            consultationId: consultation.id,
            title: { contains: consultation.consultationNumber }
          }
        });

        if (existing) continue;

        await prisma.notification.create({
          data: {
            userId: company.userId,
            consultationId: consultation.id,
            channel: 'EMAIL',
            title: `Nouveau match ${match.score}% - ${consultation.originalTitle}`,
            body: `Date limite: ${consultation.deadline.toISOString()} - ${consultation.organization}.`,
            payload: JSON.stringify({ matchScore: match.score, confidence: match.confidence, categories: match.matchingCategories })
          }
        });
        notificationsCreated += 1;
      }
    }

    return NextResponse.json({ success: true, notificationsCreated });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Notifications run failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
