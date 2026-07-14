import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { prisma } from '@/lib/prisma';

function isCronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const headerToken = request.headers.get('x-cron-token');
  if (headerToken === secret) return true;

  const authHeader = request.headers.get('authorization') ?? '';
  return authHeader === `Bearer ${secret}`;
}

async function canRun(request: Request) {
  const cronAuthorized = isCronAuthorized(request);
  if (cronAuthorized) return true;

  const session = await getSessionFromRequest(request as never);
  if (!session) return false;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  return Boolean(user && user.role === 'ADMIN');
}

async function runDailyJobs(request: Request) {
  const origin = new URL(request.url).origin;
  const cronToken = process.env.CRON_SECRET ?? '';

  const crawlerResponse = await fetch(`${origin}/api/jobs/crawler/run`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cronToken ? { 'x-cron-token': cronToken } : {})
    },
    body: JSON.stringify({ maxPages: 6, pageSize: 60 })
  });
  const crawlerPayload = await crawlerResponse.json().catch(() => ({}));
  if (!crawlerResponse.ok) {
    return NextResponse.json({ error: 'Crawler daily run failed', details: crawlerPayload }, { status: 500 });
  }

  const notificationResponse = await fetch(`${origin}/api/jobs/notifications/run`, {
    method: 'POST',
    headers: cronToken ? { 'x-cron-token': cronToken } : undefined
  });
  const notificationPayload = await notificationResponse.json().catch(() => ({}));
  if (!notificationResponse.ok) {
    return NextResponse.json({ error: 'Notification daily run failed', details: notificationPayload }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    crawler: crawlerPayload,
    notifications: notificationPayload
  });
}

export async function GET(request: Request) {
  try {
    if (!(await canRun(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return runDailyJobs(request);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Daily GET job failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!(await canRun(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return runDailyJobs(request);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Daily POST job failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
