type ScheduledEvent = {
  id?: string;
  time?: string;
};

function getBaseUrl() {
  return (
    process.env.PUBLIC_APP_URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.URL ||
    ''
  ).replace(/\/$/, '');
}

export async function handler(_event: ScheduledEvent) {
  try {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing deployment URL environment variable' })
      };
    }

    const cronSecret = process.env.CRON_SECRET ?? '';
    const response = await fetch(`${baseUrl}/api/jobs/daily/run`, {
      method: 'POST',
      headers: {
        ...(cronSecret ? { 'x-cron-token': cronSecret } : {})
      }
    });

    const rawBody = await response.text().catch(() => '');
    let payload: unknown = {};
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      payload = { rawBody };
    }

    if (!response.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Daily refresh failed',
          status: response.status,
          details: payload
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, payload })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Unhandled daily-refresh failure',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}