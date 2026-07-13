import path from 'path';
import { readFile } from 'fs/promises';
import { prisma } from './prisma';
import { buildAiSummary, inferLanguage, matchConsultation } from './matching';
import { decodeMojibake, isSuspiciousText } from './text-encoding';
import { runCrawlerJob } from './crawler-job';
import type { BusinessProfile, Consultation } from './types';

type RawSeed = {
  count: number;
  items: Array<{
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
  }>;
};

function computeRemainingDays(deadline: Date) {
  return Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

function computeUrgencyFromDeadline(deadline: Date) {
  const days = computeRemainingDays(deadline);
  if (days <= 7) return 'urgent' as const;
  if (days <= 14) return 'soon' as const;
  return 'normal' as const;
}

function getRecentPublicationWindow(now = new Date()) {
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);

  const start = new Date(end);
  start.setDate(start.getDate() - 2);

  return { start, end };
}

function isPublishedRecently(value: Date, now = new Date()) {
  const { start, end } = getRecentPublicationWindow(now);
  return value >= start && value < end;
}

export const defaultBusinessProfile: BusinessProfile = {
  companyName: 'Atlas Office Supply',
  businessSector: 'Office Supplies and IT Equipment',
  vatNumber: '1234567/A',
  address: 'Tunis, Tunisia',
  phone: '+216 70 000 000',
  email: 'hello@atlasoffice.tn',
  products: ['Office Supplies', 'Stationery', 'Paper', 'Printers', 'Furniture', 'IT Equipment', 'Networking'],
  customProducts: 'I sell Epson toners, Dell laptops, office chairs, A4 paper, and administrative stationery.'
};

function sanitizeText(value?: string) {
  return decodeMojibake((value ?? '').replace(/\s+/g, ' ').trim());
}

function pickTitle(item: RawSeed['items'][number]) {
  const candidates = [item.titleFr, item.titleAr, item.titleEn, item.title].map(sanitizeText).filter(Boolean);
  return sanitizeText(candidates[0] ?? item.shopNo);
}

function parseJsonArray(value: string | null | undefined) {
  try {
    const parsed = JSON.parse(value ?? '[]');
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

function serializeJsonArray(values: string[]) {
  return JSON.stringify(values);
}

async function buildConsultation(item: RawSeed['items'][number], profileText: string): Promise<Consultation | null> {
  const title = pickTitle(item);
  const sourceText = [item.titleFr, item.titleAr, item.titleEn, item.title, item.matchedBy].filter(Boolean).join(' ');
  const language = inferLanguage(title) === 'Arabic' && /[A-Za-z]/.test(title) ? 'Bilingual' : inferLanguage(title);
  const deadline = sanitizeText(item.deadline);
  const publicationDate = sanitizeText(item.publicDt);
  const deadlineDate = new Date(deadline);
  if (Number.isNaN(deadlineDate.getTime()) || deadlineDate.getTime() <= Date.now()) {
    return null;
  }

  const urgency = computeUrgencyFromDeadline(deadlineDate);
  const match = await matchConsultation(profileText, `${title} ${sourceText}`, urgency);
  if (!match.matchingProducts.length) {
    return null;
  }

  const productsRequested = match.matchingCategories.length
    ? match.matchingCategories
    : [item.matchedBy?.replace('shopNmFr:', '').replace('shopNmAr:', '') || 'General procurement'];

  const lots = Array.from(new Set((title.match(/\b\d+\b/g) ?? []).slice(0, 3)));
  const technicalSpecifications = [
    item.matchedBy?.replace('shopNmFr:', '').replace('shopNmAr:', '').toLowerCase() || 'tender notice',
    title.length > 55 ? 'multi-item request' : 'single-line request',
    /imprim|photocop|printer/i.test(title) ? 'printing equipment compatibility' : 'standard procurement compliance'
  ];

  const translatedTitle = language === 'Arabic'
    ? 'French translation available in the AI summary'
    : title;

  return {
    id: item.shopNo,
    consultationNumber: item.shopNo,
    originalTitle: title,
    translatedTitle,
    organization: sanitizeText(item.instNm),
    publicationDate,
    deadline,
    language,
    category: match.matchingCategories[0] ?? 'General Supplies',
    matchScore: match.score,
    confidenceScore: match.confidence,
    matchingProducts: match.matchingProducts,
    matchingCategories: match.matchingCategories,
    urgency,
    aiSummary: buildAiSummary(title, match.matchingProducts, match.matchingCategories),
    productsRequested: match.matchingProducts.length ? match.matchingProducts : productsRequested,
    lots: lots.length ? lots : ['Main lot'],
    technicalSpecifications,
    estimatedOpportunity: match.estimatedOpportunity,
    potentialCompetitors: [...match.potentialCompetitors],
    directLink: `https://www.tuneps.tn/portail/consultations/consultationdetails/${item.spShopMasterId}/${item.shopNo}`,
    reason: `Selectionnee par rapport aux produits du catalogue: ${match.matchingProducts.join(', ')}.`,
    sourceTitle: sourceText,
    remainingDaysBeforeDeadline: computeRemainingDays(deadlineDate),
    documents: []
  };
}

async function buildConsultationFromRow(
  row: NonNullable<Awaited<ReturnType<typeof prisma.consultation.findFirst<{ include: { documents: true } }>>>>,
  profileText: string
): Promise<Consultation | null> {
  if (!isPublishedRecently(row.publicationDate)) {
    return null;
  }

  if (row.deadline.getTime() <= Date.now()) {
    return null;
  }

  const originalTitle = sanitizeText(row.originalTitle);
  const translatedTitleCandidate = sanitizeText(row.translatedTitle);
  const translatedTitle = translatedTitleCandidate && !isSuspiciousText(translatedTitleCandidate)
    ? translatedTitleCandidate
    : originalTitle;
  const organization = sanitizeText(row.organization);
  const category = sanitizeText(row.category);
  const reason = sanitizeText(row.reason);
  const sourceTitle = sanitizeText(row.sourceTitle);

  const sourceText = [originalTitle, translatedTitle, organization, category, reason, sourceTitle].join(' ');
  const urgency = computeUrgencyFromDeadline(row.deadline);
  const match = await matchConsultation(profileText, sourceText, urgency);

  const effectiveCategories = match.matchingCategories.length ? match.matchingCategories : [category || 'Fournitures'];
  const effectiveProducts = match.matchingProducts.length ? match.matchingProducts : parseJsonArray(row.productsRequestedJson);
  const effectiveScore = match.matchingProducts.length ? match.score : row.matchScore;
  const effectiveConfidence = match.matchingProducts.length ? match.confidence : row.confidenceScore;
  const effectiveCompetitors = match.matchingProducts.length ? match.potentialCompetitors : parseJsonArray(row.potentialCompetitorsJson);

  return {
    id: row.id,
    consultationNumber: row.consultationNumber,
    originalTitle,
    translatedTitle,
    organization,
    publicationDate: row.publicationDate.toISOString(),
    deadline: row.deadline.toISOString(),
    language: row.language as Consultation['language'],
    category,
    matchScore: effectiveScore,
    confidenceScore: effectiveConfidence,
    matchingProducts: effectiveProducts,
    matchingCategories: effectiveCategories,
    urgency,
    aiSummary: buildAiSummary(originalTitle, effectiveProducts, effectiveCategories),
    productsRequested: effectiveProducts,
    lots: parseJsonArray(row.lotsJson),
    technicalSpecifications: parseJsonArray(row.technicalSpecificationsJson),
    estimatedOpportunity: sanitizeText(row.estimatedOpportunity),
    potentialCompetitors: effectiveCompetitors,
    directLink: row.sourceUrl,
    reason,
    sourceTitle,
    remainingDaysBeforeDeadline: computeRemainingDays(row.deadline),
    documents: row.documents.map((document) => ({
      id: document.id,
      fileName: document.fileName ?? 'Document',
      url: document.url
    }))
  };
}

async function seedConsultationsFromFile(profileText: string) {
  const filePath = path.join(process.cwd(), 'data', 'tuneps-consultations.json');
  const raw = await readFile(filePath, 'utf8');
  const data = JSON.parse(raw.replace(/^\uFEFF/, '')) as RawSeed;

  for (const item of data.items) {
    const consultation = await buildConsultation(item, profileText);
    if (!consultation) continue;

    await prisma.consultation.upsert({
      where: { consultationNumber: consultation.consultationNumber },
      create: {
        id: consultation.id,
        consultationNumber: consultation.consultationNumber,
        sourceUrl: consultation.directLink,
        originalTitle: consultation.originalTitle,
        translatedTitle: consultation.translatedTitle,
        organization: consultation.organization,
        publicationDate: new Date(consultation.publicationDate),
        deadline: new Date(consultation.deadline),
        language: consultation.language,
        category: consultation.category,
        matchScore: consultation.matchScore,
        confidenceScore: consultation.confidenceScore,
        matchingCategoriesJson: serializeJsonArray(consultation.matchingCategories),
        urgency: consultation.urgency,
        aiSummary: consultation.aiSummary,
        productsRequestedJson: serializeJsonArray(consultation.productsRequested),
        lotsJson: serializeJsonArray(consultation.lots),
        technicalSpecificationsJson: serializeJsonArray(consultation.technicalSpecifications),
        estimatedOpportunity: consultation.estimatedOpportunity,
        potentialCompetitorsJson: serializeJsonArray(consultation.potentialCompetitors),
        reason: consultation.reason,
        sourceTitle: consultation.sourceTitle,
        pdfText: null,
        embeddings: null
      },
      update: {
        sourceUrl: consultation.directLink,
        originalTitle: consultation.originalTitle,
        translatedTitle: consultation.translatedTitle,
        organization: consultation.organization,
        publicationDate: new Date(consultation.publicationDate),
        deadline: new Date(consultation.deadline),
        language: consultation.language,
        category: consultation.category,
        matchScore: consultation.matchScore,
        confidenceScore: consultation.confidenceScore,
        matchingCategoriesJson: serializeJsonArray(consultation.matchingCategories),
        urgency: consultation.urgency,
        aiSummary: consultation.aiSummary,
        productsRequestedJson: serializeJsonArray(consultation.productsRequested),
        lotsJson: serializeJsonArray(consultation.lots),
        technicalSpecificationsJson: serializeJsonArray(consultation.technicalSpecifications),
        estimatedOpportunity: consultation.estimatedOpportunity,
        potentialCompetitorsJson: serializeJsonArray(consultation.potentialCompetitors),
        reason: consultation.reason,
        sourceTitle: consultation.sourceTitle
      }
    });
  }
}

async function ensureConsultationsFresh() {
  const { start, end } = getRecentPublicationWindow();

  const [latestSuccessRun, activeConsultationsCount] = await Promise.all([
    prisma.crawlRun.findFirst({
      where: { status: 'SUCCESS' },
      orderBy: { startedAt: 'desc' },
      select: { startedAt: true }
    }),
    prisma.consultation.count({
      where: {
        deadline: { gt: new Date() },
        publicationDate: {
          gte: start,
          lt: end
        }
      }
    })
  ]);

  const latestRunAgeMs = latestSuccessRun ? Date.now() - latestSuccessRun.startedAt.getTime() : Number.POSITIVE_INFINITY;
  const needsRefresh = activeConsultationsCount === 0 || latestRunAgeMs >= 24 * 60 * 60 * 1000;

  if (!needsRefresh) {
    return;
  }

  if (activeConsultationsCount === 0) {
    // On serverless, fire-and-forget background work may be terminated when the request ends.
    // Awaiting the first refresh avoids a persistent empty dashboard window.
    await runCrawlerJob({
      maxPages: 20,
      pageSize: 100,
      trigger: 'auto-dashboard',
      force: true
    });
    return;
  }

  void runCrawlerJob({
    maxPages: 20,
    pageSize: 100,
    trigger: 'auto-dashboard',
    force: false
  }).catch(() => undefined);
}

export async function loadConsultations(profileText = defaultBusinessProfile.customProducts) {
  try {
    const existingCount = await prisma.consultation.count();
    if (existingCount === 0) {
      await seedConsultationsFromFile(profileText);
    }

    try {
      await ensureConsultationsFresh();
    } catch (error) {
      // Keep dashboard available even if auto-refresh fails, but log for serverless diagnostics.
      console.error('ensureConsultationsFresh failed', error);
    }

    const { start, end } = getRecentPublicationWindow();

    const rows = await prisma.consultation.findMany({
      where: {
        deadline: { gt: new Date() },
        publicationDate: {
          gte: start,
          lt: end
        }
      },
      include: { documents: true },
      orderBy: { deadline: 'asc' }
    });
    const built = await Promise.all(rows.map((row) => buildConsultationFromRow(row, profileText)));
    return built.filter((item): item is Consultation => item !== null);
  } catch (error) {
    // If DB is temporarily unavailable in serverless runtime, avoid hard-crashing the app shell.
    console.error('loadConsultations failed', error);
    return [];
  }
}

export async function loadConsultationById(id: string, profileText = defaultBusinessProfile.customProducts) {
  try {
    const row = await prisma.consultation.findUnique({ where: { id }, include: { documents: true } });
    if (row) {
      return buildConsultationFromRow(row, profileText);
    }
  } catch {
    return null;
  }

  const consultations = await loadConsultations(profileText);
  return consultations.find((consultation) => consultation.id === id) ?? null;
}
