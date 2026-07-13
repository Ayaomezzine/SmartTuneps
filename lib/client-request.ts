'use client';

type JsonValue = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: JsonValue;
  timeoutMs?: number;
  retries?: number;
};

export async function postJsonWithRetry(url: string, options: RequestOptions = {}) {
  const { body, timeoutMs = 15000, retries = 1, ...init } = options;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          ...(init.headers ?? {})
        },
        body: body === undefined ? undefined : JSON.stringify(body)
      });

      const rawResponse = await response.text();
      let data: any = {};

      if (rawResponse) {
        try {
          data = JSON.parse(rawResponse);
        } catch {
          data = { message: rawResponse };
        }
      }

      if (!response.ok) {
        return { ok: false as const, status: response.status, data };
      }

      return { ok: true as const, status: response.status, data };
    } catch (error) {
      lastError = error;
      if (attempt >= retries) {
        break;
      }
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  return { ok: false as const, status: 0, data: null, error: lastError };
}