export interface MatchableProductRecord {
  designation: string;
  brand: string;
  family: string;
  searchCorpus: string;
}

const OPPORTUNITY = {
  urgent: 'Opportunite elevee: repondez rapidement avec une offre complete et conforme.',
  soon: 'Bonne opportunite si vous confirmez rapidement le stock et le delai de livraison.',
  normal: 'Opportunite stable pour une reponse structuree avec focus conformite et prix.'
} as const;

const STOP_WORDS = new Set([
  'de', 'du', 'des', 'la', 'le', 'les', 'un', 'une', 'and', 'et', 'for', 'of', 'pour', 'with', 'sans',
  'a', 'an', 'the', 'l', 'd', 'en', 'au', 'aux', 'avec', 'sur', 'dans', 'par', 'to',
  'من', 'الى', 'في', 'على', 'عن', 'مع', 'و', 'ب', 'ال'
]);

const WEAK_MATCH_TOKENS = new Set([
  'consultation', 'consultations', 'acquisition', 'achat', 'achats', 'fourniture', 'fournitures',
  'service', 'services', 'travaux', 'travail', 'entretien', 'maintenance', 'reparation', 'pieces', 'piece',
  'materiel', 'materiels', 'equipement', 'equipements', 'lot', 'lots', 'article', 'articles', 'bureau',
  'etude', 'etudes', 'designation', 'commune', 'ministere', 'direction', 'societe', 'centre', 'hopital',
  'استشارة', 'اقتناء', 'اقتناءات', 'شراء', 'تزويد', 'خدمة', 'خدمات', 'اشغال', 'صيانة', 'معدات', 'لوازم', 'قطع', 'غيار', 'دراسة'
]);

const SHORT_MEANINGFUL_TOKENS = new Set([
  'a3', 'a4', 'a5', 'hp', 'pc', 'wf', 'mx', 'tk', 'bt', 'bp', 'ar', 'ms', 'ml', 'dr', 'cf', 'ce', 'exv', 'lq'
]);

const AMBIGUOUS_MATCH_TOKENS = new Set([
  'ruban', 'couverture', 'page', 'metro', 'metre', 'mètre'
]);

const PROCUREMENT_CONTEXT_TOKENS = [
  'fourniture', 'fournitures', 'bureau', 'papeterie', 'administratif', 'administrative',
  'impression', 'imprimante', 'consommable', 'consommables', 'cartouche', 'toner', 'encre',
  'papier', 'a4', 'classement', 'dossier', 'chemise', 'ruban', 'agrafes', 'scotch',
  'jeu', 'jeux', 'echec', 'echecs', 'dame', 'dames', 'domino', 'dominos', 'ludo', 'jakki', 'puzzle', 'scrable', 'scrabble',
  'ballon', 'ballons', 'football', 'foot', 'basket', 'basketball', 'volley', 'volleyball', 'ping', 'pong', 'raquette',
  'مستلزمات', 'مكتبية', 'قرطاسية', 'طابعة', 'حبر', 'خرطوشة', 'تونر', 'ورق', 'مستهلكات', 'الطباعة', 'ادارية'
];

function normalizeText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    .replace(/[\u2013\u2014\u2015]/g, '-')
    .replace(/[^\p{L}\p{N}\u0600-\u06FF]+/gu, ' ')
    .toLowerCase()
    .trim();
}

export function normalizeCatalogText(value: string) {
  return normalizeText(value);
}

function tokenize(value: string) {
  return normalizeCatalogText(value)
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !STOP_WORDS.has(token));
}

function isMeaningfulToken(token: string) {
  if (SHORT_MEANINGFUL_TOKENS.has(token)) return true;
  if (/^[a-z]{1,3}\d+[a-z0-9-]*$/i.test(token)) return true;
  return token.length >= 3 && !WEAK_MATCH_TOKENS.has(token);
}

function meaningfulTokens(value: string) {
  return tokenize(value).filter(isMeaningfulToken);
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function scoreOverlap(left: string[], right: string[]) {
  if (!left.length || !right.length) return 0;
  const rightSet = new Set(right);
  let hits = 0;
  for (const token of left) {
    if (rightSet.has(token)) hits += 1;
  }
  return hits / Math.max(right.length, left.length);
}

function overlapCount(left: string[], right: string[]) {
  if (!left.length || !right.length) return 0;
  const rightSet = new Set(right);
  let hits = 0;
  for (const token of left) {
    if (rightSet.has(token)) hits += 1;
  }
  return hits;
}

function overlappingTokens(left: string[], right: string[]) {
  if (!left.length || !right.length) return [] as string[];
  const rightSet = new Set(right);
  return unique(left.filter((token) => rightSet.has(token)));
}

function trigrams(value: string) {
  const compact = normalizeCatalogText(value).replace(/\s+/g, '');
  const grams = new Set<string>();
  for (let index = 0; index < compact.length - 2; index += 1) {
    grams.add(compact.slice(index, index + 3));
  }
  return grams;
}

function scoreTrigramSimilarity(left: string, right: string) {
  const leftGrams = trigrams(left);
  const rightGrams = trigrams(right);
  if (!leftGrams.size || !rightGrams.size) return 0;
  let intersection = 0;
  for (const gram of leftGrams) {
    if (rightGrams.has(gram)) intersection += 1;
  }
  return intersection / Math.max(leftGrams.size, rightGrams.size);
}

function buildCompetitors(family: string, brand: string) {
  return [
    `Distributeurs ${family}`,
    `Revendeurs compatibles ${brand}`,
    `Fournisseurs secteur public: ${family}`
  ];
}

function buildStrategy(family: string, topProduct: string) {
  return `Positionnez votre offre sur la conformite technique, la disponibilite stock et le prix pour ${topProduct.toLowerCase()}. Mettez en avant la compatibilite ${family.toLowerCase()} et le delai de livraison.`;
}

export function inferLanguage(text: string) {
  if (/[\u0600-\u06FF]/.test(text) && /[A-Za-z]/.test(text)) {
    return 'Bilingual' as const;
  }
  if (/[\u0600-\u06FF]/.test(text)) {
    return 'Arabic' as const;
  }
  if (/[A-Za-z]/.test(text)) {
    return 'French' as const;
  }
  return 'Bilingual' as const;
}

export function matchConsultationAgainstCatalog(catalog: MatchableProductRecord[], profileText: string, sourceText: string, urgency: string) {
  const normalizedSource = normalizeCatalogText(sourceText);
  const sourceTokens = tokenize(sourceText);
  const sourceMeaningfulTokens = meaningfulTokens(sourceText);
  const profileTokens = meaningfulTokens(profileText);
  const hasProcurementContext = PROCUREMENT_CONTEXT_TOKENS.some((token) => normalizedSource.includes(token));

  const scoredProducts = catalog
    .map((record) => {
      const recordTokens = tokenize(record.searchCorpus);
      const recordMeaningfulTokens = meaningfulTokens(record.searchCorpus);
      const tokenScore = scoreOverlap(sourceTokens, recordTokens);
      const textScore = scoreTrigramSimilarity(normalizedSource, record.searchCorpus);
      const profileScore = scoreOverlap(profileTokens, recordTokens);
      const brandScore = normalizedSource.includes(normalizeCatalogText(record.brand)) ? 0.14 : 0;
      const overlapTokens = overlappingTokens(sourceMeaningfulTokens, recordMeaningfulTokens);
      const sourceOverlap = overlapTokens.length;
      const sourceOverlapScore = Math.min(0.3, sourceOverlap * 0.12);
      const exactDesignationHit = normalizedSource.includes(normalizeCatalogText(record.designation)) ? 0.28 : 0;
      const exactFamilyHit = normalizedSource.includes(normalizeCatalogText(record.family)) ? 0.18 : 0;
      const contextScore = hasProcurementContext ? scoreOverlap(sourceTokens, recordTokens) * 0.08 : 0;
      const isSingleAmbiguousOverlap =
        sourceOverlap === 1 &&
        overlapTokens.every((token) => AMBIGUOUS_MATCH_TOKENS.has(token)) &&
        brandScore === 0 &&
        exactDesignationHit === 0 &&
        exactFamilyHit === 0 &&
        textScore < 0.35;
      const hasStrongSourceSignal = sourceOverlap > 0 || exactDesignationHit > 0 || exactFamilyHit > 0 || brandScore > 0 || textScore >= 0.22;
      const score = hasStrongSourceSignal
        ? Math.min(1, tokenScore * 0.26 + textScore * 0.18 + profileScore * 0.05 + brandScore + sourceOverlapScore + exactDesignationHit + exactFamilyHit + contextScore)
        : 0;

      return {
        record,
        score,
        hasStrongSourceSignal: hasStrongSourceSignal && !isSingleAmbiguousOverlap,
        sourceOverlap
      };
    })
    .sort((left, right) => right.score - left.score)
    .filter((item) => item.hasStrongSourceSignal)
    .filter((item) => item.score >= (hasProcurementContext ? 0.16 : 0.2))
    .slice(0, 8);

  const selectedProducts = scoredProducts;
  const matchingProducts = unique(selectedProducts.map((item) => item.record.designation));
  const matchingCategories = unique(selectedProducts.map((item) => item.record.family));
  const primaryProduct = selectedProducts[0]?.record.designation ?? 'fourniture generale';
  const primaryFamily = selectedProducts[0]?.record.family ?? 'fourniture generale';

  const score = Math.max(
    8,
    Math.min(
      100,
      Math.round(
        (selectedProducts.reduce((sum, item) => sum + item.score, 0) / Math.max(1, selectedProducts.length)) * 100 +
          Math.min(matchingProducts.length * 5, 22) +
          (hasProcurementContext ? 8 : 0) +
          (urgency === 'urgent' ? 10 : urgency === 'soon' ? 5 : 0)
      )
    )
  );
  const confidence = Math.max(40, Math.min(99, score + (matchingProducts.length > 3 ? 6 : 0)));

  return {
    score,
    confidence,
    matchingProducts,
    matchingCategories,
    semanticCategory: primaryFamily,
    suggestedStrategy: buildStrategy(primaryFamily, primaryProduct),
    potentialCompetitors: buildCompetitors(primaryFamily, scoredProducts[0]?.record.brand ?? 'General'),
    estimatedOpportunity: OPPORTUNITY[urgency as keyof typeof OPPORTUNITY] ?? OPPORTUNITY.normal
  };
}

export function buildAiSummary(title: string, matchingProducts: string[], matchingCategories: string[]) {
  const focusProducts = matchingProducts.length ? matchingProducts.slice(0, 3).join(', ') : 'produits du catalogue';
  const focusFamilies = matchingCategories.length ? matchingCategories.slice(0, 3).join(', ') : 'fournitures generales';
  return `Consultation analysee: ${title.toLowerCase()}. Produits correspondants: ${focusProducts}. Categories correspondantes: ${focusFamilies}.`;
}
