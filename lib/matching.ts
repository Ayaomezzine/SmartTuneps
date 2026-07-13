import { getProductCatalog } from './product-catalog';
import { matchConsultationAgainstCatalog } from './matching-core';
export { buildAiSummary, inferLanguage, matchConsultationAgainstCatalog, normalizeCatalogText } from './matching-core';

export async function matchConsultation(profileText: string, sourceText: string, urgency: string) {
  const catalog = await getProductCatalog();
  return matchConsultationAgainstCatalog(catalog, profileText, sourceText, urgency);
}
