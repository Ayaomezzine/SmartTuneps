'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { BusinessProfile, Consultation } from '@/lib/types';
import { buildAiSummary, matchConsultationAgainstCatalog } from '@/lib/matching-browser';
import type { ProductRecord } from '@/lib/product-catalog';
import { ConsultationCard } from './consultation-card';
import { ChatAssistant } from './chat-assistant';

interface DashboardClientProps {
  consultations: Consultation[];
  profile: BusinessProfile;
  savedIds: string[];
  ignoredIds: string[];
  productCatalog: ProductRecord[];
  renderedAt: number;
}

type FilterState = 'all' | 'saved' | 'unread' | 'urgent';

const READ_KEY = 'smart-tuneps-read';

function safeReadSet(key: string) {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const raw = window.localStorage.getItem(key);
    return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set<string>();
  }
}

function safeWriteSet(key: string, value: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(Array.from(value)));
  } catch {
    return;
  }
}

function formatDateLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC'
  }).format(parsed);
}

function normalizeText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const STRONG_INTEREST_TOKENS = [
  'toner', 'toners', 'cartouche', 'cartouches', 'encre', 'encres', 'imprimante', 'imprimantes', 'photocopieur', 'photocopieurs',
  'scanner', 'scanners', 'ordinateur', 'ordinateurs', 'portable', 'portables', 'laptop', 'laptops', 'pc', 'tablette', 'tablettes',
  'disque', 'disques', 'usb', 'reseau', 'souris', 'ecran', 'papier', 'a4', 'chemise', 'pochette', 'agrafes', 'stylo', 'stylos',
  'scotch', 'feutre', 'marqueur', 'papeterie', 'informatique', 'bureautique',
  'jeu', 'jeux', 'echec', 'echecs', 'dame', 'dames', 'domino', 'dominos', 'ludo', 'jakki', 'puzzle', 'scrable', 'scrabble',
  'ballon', 'ballons', 'foot', 'football', 'basket', 'basketball', 'volley', 'volleyball', 'ping', 'pong', 'raquette',
  'حبر', 'احبار', 'خرطوشة', 'خراطيش', 'طابعة', 'طابعات', 'حاسوب', 'حواسيب', 'ماسح', 'ورق', 'قرطاسية', 'مستلزمات', 'اعلامية'
];

const GENERIC_INTEREST_TOKENS = ['papier', 'ruban', 'couverture', 'page', 'fourniture', 'fournitures', 'consommable', 'consommables', 'ورق'];

const NEGATIVE_CONTEXT_TOKENS = [
  'hygienique', 'hygiénique', 'hospitalier', 'corbeille', 'poubelle', 'securite', 'secours', 'chirurgical', 'orthopedique',
  'radiologique', 'film', 'films', 'metre', 'mètre', 'cartographie', 'aerienne', 'aérienne', 'tôle', 'tole', 'climatiseur',
  'motor', 'moteur', 'scie', 'batterie', 'ouvrage', 'construction', 'cuisine', 'electromenager', 'électroménager', 'electro menager', 'electro m', 'menager', 'ménager', 'm nager',
  'صحي', 'استشفائي', 'جراحي', 'عظام', 'راديولوجي', 'افلام', 'متر', 'رسم', 'خريطة', 'سلة'
];

const HARD_EXCLUDE_CONTEXT_TOKENS = [
  'cuisine', 'electromenager', 'électroménager', 'electro menager', 'electro m', 'menager', 'ménager', 'm nager', 'chirurgical', 'orthopedique', 'radiologique',
  'climatiseur', 'construction', 'جراحي', 'عظام', 'راديولوجي'
];

const BUSINESS_PHRASES = [
  'consommables informatiques',
  'materiel informatique',
  'materiels informatiques',
  'equipements informatiques',
  'fourniture informatique',
  'fournitures de bureau',
  'fourniture de bureau',
  'informatique et bureautique',
  'encres et fourniture du bureau',
  'pc imprimante',
  'imprimante et disque dur',
  'produits informatiques',
  'ordinateur et imprimante',
  'consommables',
  'jeux educatifs',
  'jeux de societe',
  'jeux de société',
  'articles de sport',
  'materiel sportif',
  'materiel de loisirs',
  'ballons sportifs',
  'ballon fb',
  'raquettes ping pong',
  'قرطاسية',
  'مستلزمات مكتبية',
  'معدات اعلامية',
  'تجهيزات اعلامية'
];

function countTokenHits(normalized: string, tokens: string[]) {
  return tokens.reduce((count, token) => count + (normalized.includes(token) ? 1 : 0), 0);
}

function hasBusinessContext(title: string) {
  const normalized = normalizeText(title);
  const hasStrongInterestToken = STRONG_INTEREST_TOKENS.some((token) => normalized.includes(token));
  const hasOnlyGenericInterestToken =
    !STRONG_INTEREST_TOKENS.some((token) => !GENERIC_INTEREST_TOKENS.includes(token) && normalized.includes(token)) &&
    GENERIC_INTEREST_TOKENS.some((token) => normalized.includes(token));
  const hasNegativeContext = NEGATIVE_CONTEXT_TOKENS.some((token) => normalized.includes(token));
  const hasHardExcludeContext = HARD_EXCLUDE_CONTEXT_TOKENS.some((token) => normalized.includes(token));

  if (hasHardExcludeContext) {
    return false;
  }

  if (!hasStrongInterestToken) {
    return false;
  }

  if (hasNegativeContext && hasOnlyGenericInterestToken) {
    return false;
  }

  return true;
}

function evaluateBusinessRelevance(title: string, sourceText: string, matchScore: number, matchingProducts: string[]) {
  const normalizedTitle = normalizeText(title);
  const normalizedSource = normalizeText(sourceText);
  const hasHardExcludeContext = HARD_EXCLUDE_CONTEXT_TOKENS.some((token) => normalizedTitle.includes(token) || normalizedSource.includes(token));
  if (hasHardExcludeContext) {
    return { strong: false, soft: false, score: -100 };
  }

  const positiveTitleHits = countTokenHits(normalizedTitle, STRONG_INTEREST_TOKENS);
  const positiveSourceHits = countTokenHits(normalizedSource, STRONG_INTEREST_TOKENS);
  const genericTitleHits = countTokenHits(normalizedTitle, GENERIC_INTEREST_TOKENS);
  const negativeHits = countTokenHits(normalizedTitle, NEGATIVE_CONTEXT_TOKENS) + countTokenHits(normalizedSource, NEGATIVE_CONTEXT_TOKENS);
  const phraseHits = BUSINESS_PHRASES.reduce((count, phrase) => count + ((normalizedTitle.includes(phrase) || normalizedSource.includes(phrase)) ? 1 : 0), 0);
  const titleHasBusinessContext = hasBusinessContext(title);

  const score =
    positiveTitleHits * 14 +
    positiveSourceHits * 6 +
    phraseHits * 18 +
    Math.min(matchScore, 60) -
    genericTitleHits * 3 -
    negativeHits * 15 +
    (matchingProducts.length > 0 ? 10 : 0);

  const strong = titleHasBusinessContext && (matchingProducts.length > 0 || phraseHits > 0 || positiveTitleHits >= 2);
  const soft = !strong && !hasHardExcludeContext && (phraseHits > 0 || positiveTitleHits >= 1 || matchScore >= 22);

  return { strong, soft, score };
}

function normalizeLanguage(value: string) {
  const normalized = normalizeText(value);
  if (normalized === 'francais' || normalized === 'français' || normalized === 'french') return 'french';
  if (normalized === 'arabe' || normalized === 'arabic') return 'arabic';
  if (normalized === 'bilingue' || normalized === 'bilingual') return 'bilingual';
  if (normalized === 'toutes' || normalized === 'all') return 'all';
  return normalized;
}

function languageFromTitle(title: string) {
  const hasArabic = /[\u0600-\u06FF]/.test(title);
  const hasLatin = /[A-Za-zÀ-ÿ]/.test(title);
  if (hasArabic && hasLatin) return 'bilingual';
  if (hasArabic) return 'arabic';
  return 'french';
}

export function DashboardClient({ consultations, profile, savedIds: initialSavedIds, ignoredIds: initialIgnoredIds, productCatalog, renderedAt }: DashboardClientProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Toutes');
  const [language, setLanguage] = useState('Toutes');
  const [view, setView] = useState<FilterState>('all');
  const [profileText, setProfileText] = useState(profile.customProducts);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(initialSavedIds));
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set(initialIgnoredIds));
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [currentTime] = useState(renderedAt);

  const deferredQuery = useDeferredValue(query);
  const deferredProfileText = useDeferredValue(profileText);

  useEffect(() => {
    setReadIds(safeReadSet(READ_KEY));
  }, []);

  const candidateConsultations = useMemo(() => (
    consultations
      .filter((consultation) => {
        const titleSource = `${consultation.originalTitle} ${consultation.translatedTitle}`.trim();
        return hasBusinessContext(titleSource) || hasBusinessContext(consultation.sourceTitle) || consultation.matchScore >= 20;
      })
      .sort((left, right) => right.matchScore - left.matchScore)
      .slice(0, 80)
  ), [consultations]);

  const enriched = useMemo(() => candidateConsultations.map((consultation) => {
    const titleSource = `${consultation.originalTitle} ${consultation.translatedTitle}`.trim();
    const matching = matchConsultationAgainstCatalog(productCatalog, deferredProfileText, titleSource, consultation.urgency);
    const relevance = evaluateBusinessRelevance(titleSource, consultation.sourceTitle, matching.score, matching.matchingProducts);
    const isRelevant = relevance.strong;

    return {
      ...consultation,
      matchScore: matching.score,
      confidenceScore: matching.confidence,
      matchingProducts: matching.matchingProducts,
      matchingCategories: matching.matchingCategories,
      aiSummary: buildAiSummary(consultation.originalTitle, matching.matchingProducts, matching.matchingCategories),
      category: matching.matchingCategories[0] ?? consultation.category,
      isRelevant,
      relevanceScore: relevance.score,
      isSoftRelevant: relevance.soft
    };
  }), [candidateConsultations, deferredProfileText, productCatalog]);

  const categories = useMemo(() => ['Toutes', ...Array.from(new Set(enriched.flatMap((item) => item.matchingCategories.length ? item.matchingCategories : [item.category])))], [enriched]);
  const languages = ['Toutes', 'Francais', 'Arabe', 'Bilingue'];

  const filtered = useMemo(() => enriched.filter((consultation) => {
    const deadlineTs = new Date(consultation.deadline).getTime();
    const isActive = Number.isFinite(deadlineTs) && deadlineTs > currentTime;

    const haystack = normalizeText([
      consultation.originalTitle,
      consultation.translatedTitle,
      consultation.organization,
      consultation.category,
      consultation.reason,
      consultation.sourceTitle,
      consultation.matchingCategories.join(' ')
    ].join(' '));

    const matchesQuery = !deferredQuery || haystack.includes(normalizeText(deferredQuery));
    const normalizedCategory = normalizeText(category);
    const matchesCategory =
      normalizedCategory === 'toutes' ||
      consultation.matchingCategories.some((itemCategory) => normalizeText(itemCategory) === normalizedCategory) ||
      normalizeText(consultation.category) === normalizedCategory;
    const selectedLanguage = normalizeLanguage(language);
    const consultationLanguage = languageFromTitle(consultation.originalTitle);
    const matchesLanguage = selectedLanguage === 'all' || consultationLanguage === selectedLanguage;
    const matchesView =
      view === 'all' ||
        (view === 'saved' && savedIds.has(consultation.id)) ||
        (view === 'unread' && !readIds.has(consultation.id)) ||
        (view === 'urgent' && consultation.urgency === 'urgent');
    const isIgnored = ignoredIds.has(consultation.id);

    return isActive && consultation.isRelevant && !isIgnored && matchesQuery && matchesCategory && matchesLanguage && matchesView;
  }), [category, currentTime, deferredQuery, enriched, ignoredIds, language, readIds, savedIds, view]);

  const hasActiveUserFilters =
    Boolean(deferredQuery.trim()) ||
    category !== 'Toutes' ||
    language !== 'Toutes' ||
    view !== 'all';

  const activeRelevantFallback = useMemo(() => enriched
    .filter((consultation) => {
      const deadlineTs = new Date(consultation.deadline).getTime();
      return Number.isFinite(deadlineTs) && deadlineTs > currentTime && (consultation.isRelevant || consultation.isSoftRelevant) && !ignoredIds.has(consultation.id);
    })
    .sort((left, right) => {
      if (right.relevanceScore !== left.relevanceScore) {
        return right.relevanceScore - left.relevanceScore;
      }
      return right.matchScore - left.matchScore;
    }), [currentTime, enriched, ignoredIds]);

  const todayActiveFallback = useMemo(() => {
    const now = new Date(currentTime);
    const startTodayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const endTodayUtc = startTodayUtc + 24 * 60 * 60 * 1000;

    return enriched
      .filter((consultation) => {
        const deadlineTs = new Date(consultation.deadline).getTime();
        const publicationTs = new Date(consultation.publicationDate).getTime();
        const isActive = Number.isFinite(deadlineTs) && deadlineTs > currentTime;
        const isPublishedToday = Number.isFinite(publicationTs) && publicationTs >= startTodayUtc && publicationTs < endTodayUtc;
        return isActive && isPublishedToday && !ignoredIds.has(consultation.id);
      })
      .sort((left, right) => right.matchScore - left.matchScore);
  }, [currentTime, enriched, ignoredIds]);

  const blendedDailyFallback = useMemo(() => {
    const shortlist: typeof enriched = [];
    const seen = new Set<string>();

    for (const consultation of activeRelevantFallback) {
      if (!seen.has(consultation.id)) {
        shortlist.push(consultation);
        seen.add(consultation.id);
      }
      if (shortlist.length >= 5) return shortlist;
    }

    for (const consultation of todayActiveFallback) {
      if (!seen.has(consultation.id)) {
        shortlist.push(consultation);
        seen.add(consultation.id);
      }
      if (shortlist.length >= 5) break;
    }

    return shortlist;
  }, [activeRelevantFallback, todayActiveFallback]);

  const minimumDailyShortlist = !hasActiveUserFilters && filtered.length < 5
    ? blendedDailyFallback
    : filtered;

  const filteredWithFallback = minimumDailyShortlist.length || hasActiveUserFilters
    ? minimumDailyShortlist
    : blendedDailyFallback;

  const sorted = useMemo(() => filteredWithFallback.slice().sort((left, right) => {
    if (view === 'urgent') {
      return right.matchScore - left.matchScore;
    }
    return new Date(left.deadline).getTime() - new Date(right.deadline).getTime();
  }), [filteredWithFallback, view]);

  const urgentCount = useMemo(() => sorted.filter((item) => item.urgency === 'urgent').length, [sorted]);
  const savedCount = Array.from(savedIds).length;
  const topCategories = useMemo(() => Array.from(
    sorted.reduce((accumulator, item) => {
      item.matchingCategories.forEach((itemCategory) => {
        accumulator.set(itemCategory, (accumulator.get(itemCategory) ?? 0) + 1);
      });
      return accumulator;
    }, new Map<string, number>())
  )
    .sort((left, right) => right[1] - left[1])
    .map(([itemCategory]) => itemCategory), [sorted]);

  const stats = useMemo(() => [
    { label: 'Consultations correspondantes', value: sorted.length, copy: 'Consultations actives alignees sur votre catalogue produit.' },
    { label: 'Echeances urgentes', value: urgentCount, copy: 'Consultations avec date limite proche (7 jours ou moins).' },
    { label: 'Consultations sauvegardees', value: savedCount, copy: 'Elements conserves pour suivi et reponse.' },
    { label: 'Score moyen', value: sorted.length ? Math.round(sorted.reduce((sum, item) => sum + item.matchScore, 0) / sorted.length) : 0, copy: 'Niveau de correspondance semantique du tableau actuel.' }
  ], [savedCount, sorted, urgentCount]);

  function toggleSave(id: string) {
    const isSaved = savedIds.has(id);
    const method = isSaved ? 'DELETE' : 'POST';
    fetch(`/api/consultations/${id}/save`, { method }).catch(() => undefined);
    setSavedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleIgnore(id: string) {
    const isIgnored = ignoredIds.has(id);
    const method = isIgnored ? 'DELETE' : 'POST';
    fetch(`/api/consultations/${id}/ignore`, { method }).catch(() => undefined);
    setIgnoredIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function markRead(id: string) {
    setReadIds((current) => {
      const next = new Set(current);
      next.add(id);
      safeWriteSet(READ_KEY, next);
      return next;
    });
  }

  async function shareConsultation(consultation: Consultation) {
    const url = consultation.directLink;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      return;
    }
    window.prompt('Copier le lien de la consultation', url);
  }

  return (
    <div className="page-grid">
      <section className="hero reveal">
        <div className="hero-panel">
          <p className="hero-kicker">Intelligence achats pilotee par IA</p>
          <h2 className="hero-title">
            Identifiez les consultations <strong>TUNEPS</strong> pertinentes avant vos concurrents.
          </h2>
          <p className="hero-copy">
            Smart TUNEPS analyse chaque consultation en francais et en arabe, compare au catalogue produit
            et affiche uniquement les opportunites actives et pertinentes.
          </p>
          <div className="hero-actions">
            <a className="button-strong" href="#consultations">
              Voir les consultations pertinentes
            </a>
            <a className="button" href="#assistant">
              Ouvrir l&apos;assistant IA
            </a>
          </div>
          <div className="hero-badges">
            <span className="pill">Support arabe et francais</span>
            <span className="pill">Collecte quotidienne automatique</span>
            <span className="pill">Analyse PDF integree</span>
            <span className="pill">Score de match et confiance</span>
          </div>
        </div>

        <div className="panel">
          <div className="section-head">
            <div>
              <p className="hero-kicker">Profil entreprise</p>
              <h3 className="section-title">{profile.companyName}</h3>
              <p className="section-subtitle">{profile.businessSector}</p>
            </div>
            <span className="badge neutral">{profile.products.length} familles produit</span>
          </div>
          <div className="profile-grid">
            <label className="field">
              <span>Profil et termes produits</span>
              <textarea
                className="textarea"
                suppressHydrationWarning
                value={profileText}
                onChange={(event) => setProfileText(event.target.value)}
                placeholder="Decrivez les produits que vous commercialisez..."
              />
            </label>
            <div className="profile-tags">
              {profile.products.map((product) => (
                <span className="tag" key={product}>
                  {product}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        {stats.map((stat) => (
          <article className="stat-card reveal" key={stat.label}>
            <p className="stat-label">{stat.label}</p>
            <p className="stat-value">{stat.value}</p>
            <p className="stat-copy">{stat.copy}</p>
          </article>
        ))}
      </section>

      <section className="filter-panel reveal" id="filters">
        <div className="filter-grid">
          <label className="field">
            <span>Recherche globale</span>
            <input className="input" suppressHydrationWarning value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Produit, autorite, arabe, francais, date limite" />
          </label>
          <label className="field">
            <span>Categorie</span>
            <select className="select" suppressHydrationWarning value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((itemCategory) => (
                <option key={itemCategory} value={itemCategory}>
                  {itemCategory}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Langue</span>
            <select className="select" suppressHydrationWarning value={language} onChange={(event) => setLanguage(event.target.value)}>
              {languages.map((itemLanguage) => (
                <option key={itemLanguage} value={itemLanguage}>
                  {itemLanguage}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Vue</span>
            <select className="select" suppressHydrationWarning value={view} onChange={(event) => setView(event.target.value as FilterState)}>
              <option value="all">Toutes</option>
              <option value="saved">Sauvegardees</option>
              <option value="unread">Non lues</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
        </div>
      </section>

      <div className="dashboard-layout">
        <section className="section" id="consultations">
          <div className="section-head">
            <div>
              <p className="hero-kicker">Consultations pertinentes d&apos;aujourd&apos;hui et d&apos;hier</p>
              <h3 className="section-title">Flux trie par date limite</h3>
              <p className="section-subtitle">
                Les resultats sont scores semantiquement a partir de votre profil et de votre catalogue sur les publications des deux derniers jours.
              </p>
            </div>
            <span className="badge neutral">{sorted.length} visibles</span>
          </div>

          <div className="consultation-grid" id="favorites">
            {sorted.map((consultation) => (
              <ConsultationCard
                key={consultation.id}
                consultation={{
                  ...consultation,
                  deadline: formatDateLabel(consultation.deadline),
                  publicationDate: formatDateLabel(consultation.publicationDate)
                }}
                matchScore={consultation.matchScore}
                confidenceScore={consultation.confidenceScore}
                matchingCategories={consultation.matchingCategories}
                saved={savedIds.has(consultation.id)}
                ignored={ignoredIds.has(consultation.id)}
                unread={!readIds.has(consultation.id)}
                onToggleSave={toggleSave}
                onToggleIgnore={toggleIgnore}
                onShare={shareConsultation}
                onMarkRead={markRead}
              />
            ))}
          </div>
        </section>

        <div className="section" id="assistant">
          <ChatAssistant totalMatches={sorted.length} urgentCount={urgentCount} topCategories={topCategories} />

          <div className="widget">
            <p className="hero-kicker">Signal summary</p>
            <h3 className="section-title">Lecture IA en cours</h3>
            <div className="timeline">
              <div className="timeline-item">
                <h4>Focus actuel</h4>
                <p>L&apos;algorithme privilegie les consultations reliees a vos produits du catalogue et exclut les lots hors perimetre.</p>
              </div>
              <div className="timeline-item">
                <h4>Pression delai</h4>
                <p>Les consultations avec echeance proche sont marquees Urgent pour prioriser la reponse.</p>
              </div>
              <div className="timeline-item">
                <h4>Couverture linguistique</h4>
                <p>Traitement complet francais/arabe incluant contenu consultation et documents PDF.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
