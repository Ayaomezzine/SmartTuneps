import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { crawlerSchema } from '@/lib/validators';
import { runCrawlerJob } from '@/lib/crawler-job';

export async function POST(request: Request) {
  const cronAuthorized = Boolean(process.env.CRON_SECRET) && request.headers.get('x-cron-token') === process.env.CRON_SECRET;
  const session = await getSessionFromRequest(request as never);
  if (!session && !cronAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session ? await prisma.user.findUnique({ where: { id: session.userId } }) : null;
  if (!cronAuthorized && (!user || user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const payload = request.headers.get('content-type')?.includes('application/json') ? await request.json().catch(() => ({})) : {};
  const parsed = crawlerSchema.safeParse({
    maxPages: payload?.maxPages ?? 10,
    pageSize: payload?.pageSize ?? 100
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await runCrawlerJob({
      maxPages: parsed.data.maxPages,
      pageSize: parsed.data.pageSize,
      trigger: cronAuthorized ? 'cron' : 'manual'
    });

    return NextResponse.json({
      success: true,
      runId: result.runId,
      pages: result.pages,
      consultations: result.consultations,
      skipped: result.skipped ?? false,
      reason: result.reason ?? null
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown crawler error' }, { status: 500 });
  }
}
