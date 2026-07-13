import { prisma } from '@/lib/prisma';
import {
  crawlTunepsConsultations,
  extractDetailSignals,
  extractPdfTextFromUrl,
  fetchConsultationDetailHtml,
  parseTunepsDate,
  resolveAbsoluteUrl
} from '@/lib/crawler';
import { buildAiSummary, inferLanguage, matchConsultation } from '@/lib/matching';
import { decodeMojibake } from '@/lib/text-encoding';

type RunCrawlerJobOptions = {
  maxPages?: number;
  pageSize?: number;
  force?: boolean;
  trigger?: 'manual' | 'cron' | 'auto-dashboard';
};

type RunCrawlerJobResult = {
  runId: string;
  pages: number;
  consultations: number;
  skipped?: boolean;
  reason?: string;
};

const AUTO_REFRESH_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const globalForCrawlerJob = globalThis as unknown as {
  crawlerJobPromise?: Promise<RunCrawlerJobResult>;
};

function normalizeDate(value?: string | null) {
  const parsed = parseTunepsDate(value ?? null) ?? new Date(value ?? '');
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function computeUrgency(deadline: Date) {
  const diffDays = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return 'urgent';
  if (diffDays <= 14) return 'soon';
  return 'normal';
}

async function shouldSkipAutomaticRefresh(force: boolean) {
  if (force) return null;

  const [latestSuccessRun, activeConsultationsCount] = await Promise.all([
    prisma.crawlRun.findFirst({
      where: { status: 'SUCCESS' },
      orderBy: { startedAt: 'desc' },
      select: { startedAt: true }
    }),
    prisma.consultation.count({ where: { deadline: { gt: new Date() } } })
  ]);

  if (!latestSuccessRun || activeConsultationsCount === 0) {
    return null;
  }

  const ageMs = Date.now() - latestSuccessRun.startedAt.getTime();
  if (ageMs < AUTO_REFRESH_MAX_AGE_MS) {
    return `Latest successful crawl is ${Math.round(ageMs / (60 * 1000))} minutes old.`;
  }

  return null;
}

async function runCrawlerJobInternal(options: Required<RunCrawlerJobOptions>): Promise<RunCrawlerJobResult> {
  const skipReason = options.trigger === 'auto-dashboard'
    ? await shouldSkipAutomaticRefresh(options.force)
    : null;

  if (skipReason) {
    return {
      runId: 'skipped',
      pages: 0,
      consultations: 0,
      skipped: true,
      reason: skipReason
    };
  }

  const run = await prisma.crawlRun.create({
    data: {
      status: 'RUNNING',
      payload: JSON.stringify({
        maxPages: options.maxPages,
        pageSize: options.pageSize,
        trigger: options.trigger,
        force: options.force
      })
    }
  });

  try {
    const result = await crawlTunepsConsultations({
      maxPages: options.maxPages,
      pageSize: options.pageSize
    });

    let activeConsultations = 0;

    for (const item of result.items) {
      try {
        const sourceUrl = `https://www.tuneps.tn/portail/consultations/consultationdetails/${item.spShopMasterId}/${item.shopNo}`;
        const detailHtml = await fetchConsultationDetailHtml(sourceUrl).catch(() => '');
        const detail = detailHtml
          ? (() => {
            try {
              return extractDetailSignals(detailHtml);
            } catch {
              return null;
            }
          })()
          : null;
        const detailDeadline = detail?.lastSubmissionDeadline;
        const fallbackDeadline = normalizeDate(item.deadline);
        const effectiveDeadline = detailDeadline ?? fallbackDeadline;

        if (!effectiveDeadline || effectiveDeadline.getTime() <= Date.now()) {
          continue;
        }

        const documents = (detail?.documents ?? [])
          .map((document) => ({
            url: resolveAbsoluteUrl(sourceUrl, document.href),
            fileName: document.text || null
          }))
          .filter((document) => /^https?:\/\//i.test(document.url));

        const extractedPdfParts: string[] = [];
        for (const document of documents) {
          const extracted = await extractPdfTextFromUrl(document.url).catch(() => null);
          if (extracted?.text) {
            extractedPdfParts.push(extracted.text);
          }
        }

        const title = decodeMojibake(item.titleFr ?? item.titleAr ?? item.titleEn ?? item.title ?? item.shopNo);
        const organization = decodeMojibake(item.instNm);
        const sourceText = [
          title,
          decodeMojibake(item.matchedBy ?? ''),
          decodeMojibake(detail?.title ?? ''),
          detail?.lots.join(' '),
          extractedPdfParts.join(' ')
        ]
          .filter(Boolean)
          .join(' ');
        const urgency = computeUrgency(effectiveDeadline);
        const match = await matchConsultation('', sourceText, urgency);

        await prisma.consultation.upsert({
          where: { consultationNumber: item.shopNo },
          create: {
            id: item.shopNo,
            consultationNumber: item.shopNo,
            sourceUrl,
            originalTitle: title,
            translatedTitle: decodeMojibake(item.titleEn ?? item.titleFr ?? item.titleAr ?? item.title ?? item.shopNo),
            organization,
            publicationDate: normalizeDate(item.publicDt) ?? new Date(),
            deadline: effectiveDeadline,
            language: inferLanguage([item.titleFr, item.titleAr, item.titleEn, item.title, extractedPdfParts.join(' ')].map((value) => decodeMojibake(value)).join(' ')),
            category: match.matchingCategories[0] ?? 'Fournitures',
            matchScore: match.score,
            confidenceScore: match.confidence,
            matchingCategoriesJson: JSON.stringify(match.matchingCategories),
            urgency,
            aiSummary: buildAiSummary(title, match.matchingProducts, match.matchingCategories),
            productsRequestedJson: JSON.stringify(match.matchingProducts),
            lotsJson: JSON.stringify(detail?.lots ?? []),
            technicalSpecificationsJson: JSON.stringify(match.matchingCategories),
            estimatedOpportunity: match.estimatedOpportunity,
            potentialCompetitorsJson: JSON.stringify(match.potentialCompetitors),
            reason: `Selection basee sur le catalogue produit: ${match.matchingProducts.join(', ')}.`,
            sourceTitle: sourceText,
            pdfText: extractedPdfParts.join('\n\n'),
            embeddings: null
          },
          update: {
            sourceUrl,
            originalTitle: title,
            translatedTitle: decodeMojibake(item.titleEn ?? item.titleFr ?? item.titleAr ?? item.title ?? item.shopNo),
            organization,
            publicationDate: normalizeDate(item.publicDt) ?? new Date(),
            deadline: effectiveDeadline,
            language: inferLanguage([item.titleFr, item.titleAr, item.titleEn, item.title, extractedPdfParts.join(' ')].map((value) => decodeMojibake(value)).join(' ')),
            category: match.matchingCategories[0] ?? 'Fournitures',
            matchScore: match.score,
            confidenceScore: match.confidence,
            matchingCategoriesJson: JSON.stringify(match.matchingCategories),
            urgency,
            aiSummary: buildAiSummary(title, match.matchingProducts, match.matchingCategories),
            productsRequestedJson: JSON.stringify(match.matchingProducts),
            lotsJson: JSON.stringify(detail?.lots ?? []),
            technicalSpecificationsJson: JSON.stringify(match.matchingCategories),
            estimatedOpportunity: match.estimatedOpportunity,
            potentialCompetitorsJson: JSON.stringify(match.potentialCompetitors),
            reason: `Selection basee sur le catalogue produit: ${match.matchingProducts.join(', ')}.`,
            sourceTitle: sourceText,
            pdfText: extractedPdfParts.join('\n\n')
          }
        });

        await prisma.document.deleteMany({ where: { consultationId: item.shopNo } });
        if (documents.length) {
          await prisma.document.createMany({
            data: documents.map((document) => ({
              consultationId: item.shopNo,
              url: document.url,
              fileName: document.fileName,
              extractedText: null
            }))
          });
        }

        activeConsultations += 1;
      } catch {
        // Skip malformed consultation entries to keep crawl job resilient.
        continue;
      }
    }

    await prisma.crawlRun.update({
      where: { id: run.id },
      data: {
        status: 'SUCCESS',
        finishedAt: new Date(),
        pageCount: result.pages,
        consultationCount: activeConsultations
      }
    });

    return {
      runId: run.id,
      pages: result.pages,
      consultations: activeConsultations
    };
  } catch (error) {
    await prisma.crawlRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        finishedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown crawler error'
      }
    });
    throw error;
  }
}

export async function runCrawlerJob(options: RunCrawlerJobOptions = {}) {
  const normalized: Required<RunCrawlerJobOptions> = {
    maxPages: options.maxPages ?? 10,
    pageSize: options.pageSize ?? 100,
    force: options.force ?? false,
    trigger: options.trigger ?? 'manual'
  };

  if (globalForCrawlerJob.crawlerJobPromise) {
    return globalForCrawlerJob.crawlerJobPromise;
  }

  globalForCrawlerJob.crawlerJobPromise = runCrawlerJobInternal(normalized)
    .finally(() => {
      globalForCrawlerJob.crawlerJobPromise = undefined;
    });

  return globalForCrawlerJob.crawlerJobPromise;
}