import * as cheerio from 'cheerio';
import { Agent } from 'undici';

export interface TunepsListItem {
  shopNo: string;
  spShopMasterId: number;
  instNm: string;
  publicDt: string;
  deadline: string;
  titleFr?: string;
  titleAr?: string;
  titleEn?: string;
  title?: string;
  matchedBy?: string;
  shopNmFr?: string;
  shopNmAr?: string;
  shopNmEn?: string;
  spRecvEndDt?: string;
}

export interface CrawlResult {
  pages: number;
  items: TunepsListItem[];
}

export interface ConsultationDetailSignals {
  title: string;
  lastSubmissionDeadlineText: string | null;
  lastSubmissionDeadline: Date | null;
  lots: string[];
  documents: Array<{ href: string; text: string }>;
}

const LIST_URL = 'https://www.tuneps.tn/api2/portail/vSpShopMaster/data';
const TUNEPS_HOST = 'www.tuneps.tn';
const tunepsDispatcher = new Agent({
  connect: {
    rejectUnauthorized: false
  }
});

function shouldUseTunepsDispatcher(url: string) {
  try {
    return new URL(url).hostname === TUNEPS_HOST;
  } catch {
    return false;
  }
}

function tunepsFetch(url: string, init?: RequestInit) {
  const requestInit = shouldUseTunepsDispatcher(url)
    ? ({ ...init, dispatcher: tunepsDispatcher } as RequestInit & { dispatcher: Agent })
    : init;

  return fetch(url, requestInit);
}

function textQualityScore(value: string) {
  const arabic = (value.match(/[\u0600-\u06FF]/g) ?? []).length;
  const latin = (value.match(/[A-Za-zÀ-ÿ]/g) ?? []).length;
  const replacement = (value.match(/�/g) ?? []).length;
  const mojibake = (value.match(/[ÃÂØÙ]/g) ?? []).length;
  return arabic * 3 + latin - replacement * 8 - mojibake * 3;
}

function cleanupBrokenText(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
    .replace(/�+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeWithFallback(buffer: Buffer) {
  const utf8 = buffer.toString('utf8');
  const cp1256 = new TextDecoder('windows-1256').decode(buffer);
  const latin1 = new TextDecoder('iso-8859-1').decode(buffer);

  const candidates = [utf8, cp1256, latin1].map((item) => cleanupBrokenText(item));
  candidates.sort((left, right) => textQualityScore(right) - textQualityScore(left));
  return candidates[0] ?? '';
}

function sanitizeItemText(item: TunepsListItem): TunepsListItem {
  const deadline = item.deadline ?? item.spRecvEndDt ?? '';
  const titleFr = item.titleFr ?? item.shopNmFr ?? '';
  const titleAr = item.titleAr ?? item.shopNmAr ?? '';
  const titleEn = item.titleEn ?? item.shopNmEn ?? '';
  const title = item.title ?? titleFr ?? titleAr ?? titleEn ?? '';

  return {
    ...item,
    shopNo: cleanupBrokenText(item.shopNo ?? ''),
    instNm: cleanupBrokenText(item.instNm ?? ''),
    publicDt: cleanupBrokenText(item.publicDt ?? ''),
    deadline: cleanupBrokenText(deadline),
    titleFr: cleanupBrokenText(titleFr),
    titleAr: cleanupBrokenText(titleAr),
    titleEn: cleanupBrokenText(titleEn),
    title: cleanupBrokenText(title),
    matchedBy: cleanupBrokenText(item.matchedBy ?? '')
  };
}

function buildListPayload() {
  // TUNEPS currently rejects legacy pagination/sort payloads with HTTP 400.
  // An empty object is accepted and returns rows under payload.data.
  return {};
}

function asItems(payload: unknown): TunepsListItem[] {
  const raw = payload as {
    items?: TunepsListItem[];
    content?: TunepsListItem[];
    data?: TunepsListItem[];
    rows?: TunepsListItem[];
    result?: TunepsListItem[];
    payload?: {
      data?: TunepsListItem[];
    };
  };
  return raw.payload?.data ?? raw.items ?? raw.content ?? raw.data ?? raw.rows ?? raw.result ?? [];
}

export async function crawlTunepsConsultations(options: { maxPages: number; pageSize: number }) {
  const response = await tunepsFetch(LIST_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/plain, */*',
      origin: 'https://www.tuneps.tn',
      referer: 'https://www.tuneps.tn/portail/consultations',
      'x-requested-with': 'XMLHttpRequest'
    },
    body: JSON.stringify(buildListPayload())
  });

  if (!response.ok) {
    throw new Error(`TUNEPS list fetch failed with status ${response.status}`);
  }

  const bodyBuffer = Buffer.from(await response.arrayBuffer());
  const decodedBody = decodeWithFallback(bodyBuffer);
  const payload = JSON.parse(decodedBody) as unknown;
  const allItems = asItems(payload).map(sanitizeItemText);

  const parsePublishedAt = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  };

  const maxItems = Math.max(1, options.maxPages * options.pageSize);
  const items = allItems
    .sort((left, right) => parsePublishedAt(right.publicDt) - parsePublishedAt(left.publicDt))
    .slice(0, maxItems);

  return { pages: 1, items } satisfies CrawlResult;
}

export async function fetchConsultationDetailHtml(url: string) {
  const response = await tunepsFetch(url, {
    headers: {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });
  if (!response.ok) {
    throw new Error(`Detail page fetch failed with status ${response.status}`);
  }
  const bodyBuffer = Buffer.from(await response.arrayBuffer());
  return decodeWithFallback(bodyBuffer);
}

export function extractDetailSignals(html: string) {
  const $ = cheerio.load(html);
  const title = $('h1, h2, .title, .page-title').first().text().trim();

  const normalizedLabel = 'dernier delai reception offres';
  const labelElement = $('td, th, label, p, span, div')
    .filter((_, element) =>
      $(element)
        .text()
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .includes(normalizedLabel)
    )
    .first();

  const siblingCandidates = [
    labelElement.next().text().trim(),
    labelElement.parent().find('td').eq(1).text().trim(),
    labelElement.parent().find('span').last().text().trim(),
    labelElement.parent().text().replace(labelElement.text(), '').trim()
  ].filter(Boolean);

  const lastSubmissionDeadlineText = siblingCandidates[0] ?? null;
  const lastSubmissionDeadline = parseTunepsDate(lastSubmissionDeadlineText);

  const lots = $('body')
    .text()
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => /\blot\b/i.test(line) && line.length >= 4 && line.length <= 140)
    .slice(0, 8);

  const documents = $('a[href$=".pdf"], a[href*="pdf"]')
    .map((_, element) => ({
      href: $(element).attr('href') ?? '',
      text: $(element).text().trim()
    }))
    .get();

  return { title, lastSubmissionDeadlineText, lastSubmissionDeadline, lots, documents } satisfies ConsultationDetailSignals;
}

export function parseTunepsDate(value: string | null | undefined) {
  if (!value) return null;
  const compact = value.replace(/\s+/g, ' ').trim();

  const native = new Date(compact);
  if (!Number.isNaN(native.getTime())) return native;

  const match = compact.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!match) return null;

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  let year = Number.parseInt(match[3], 10);
  const hour = Number.parseInt(match[4] ?? '23', 10);
  const minute = Number.parseInt(match[5] ?? '59', 10);

  if (year < 100) {
    year += 2000;
  }

  const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function resolveAbsoluteUrl(baseUrl: string, maybeRelativeUrl: string) {
  if (!maybeRelativeUrl) return '';
  try {
    return new URL(maybeRelativeUrl, baseUrl).toString();
  } catch {
    return maybeRelativeUrl;
  }
}

export async function extractPdfTextFromUrl(url: string) {
  const response = await tunepsFetch(url);
  if (!response.ok) {
    throw new Error(`PDF fetch failed with status ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const document = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pageTexts: string[] = [];

  for (let pageIndex = 1; pageIndex <= document.numPages; pageIndex += 1) {
    const page = await document.getPage(pageIndex);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (pageText) {
      pageTexts.push(pageText);
    }

    page.cleanup();
  }

  return {
    text: pageTexts.join('\n\n'),
    pages: document.numPages
  };
}