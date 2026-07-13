'use client';

import { useState } from 'react';

interface ChatAssistantProps {
  totalMatches: number;
  urgentCount: number;
  topCategories: string[];
}

const prompts = [
  'Montre-moi toutes les consultations papier.',
  'Trouve les appels d\'offres imprimantes.',
  'Y a-t-il du mobilier de bureau cette semaine ?',
  'Par quoi dois-je commencer pour soumissionner ?',
  'Traduis cette consultation.',
  'Resume ce PDF.'
] as const;

function answerForPrompt(prompt: string, totalMatches: number, urgentCount: number, topCategories: string[]) {
  const normalized = prompt.toLowerCase();

  if (normalized.includes('papier')) {
    return `Il y a ${totalMatches} consultations correspondantes au total et ${topCategories.includes('Papeterie') || topCategories.includes('Papier') ? 'les articles lies au papier sont inclus dans les filtres actifs.' : 'le papier est actuellement une categorie a faible volume dans ce jeu de donnees.'}`;
  }

  if (normalized.includes('imprimante')) {
    return `Des demandes d'imprimantes sont detectees dans le flux. Vous avez actuellement ${urgentCount} opportunites urgentes, donc une reponse rapide avec disponibilite stock et conditions de garantie est recommandee.`;
  }

  if (normalized.includes('mobilier')) {
    return 'Les offres de mobilier doivent mettre en avant les dimensions, les delais et l installation. Pour les marches publics, ajoutez un calendrier de livraison conforme et des garanties claires.';
  }

  if (normalized.includes('commencer') || normalized.includes('soumissionner')) {
    return `Priorisez d abord les consultations urgentes. Votre tableau de bord met actuellement en avant ${urgentCount} elements urgents, commencez par les opportunites avec la meilleure note et la date limite la plus proche.`;
  }

  if (normalized.includes('tradu')) {
    return 'Utilisez la page detail consultation pour basculer entre la langue originale et une traduction IA en francais ou en arabe.';
  }

  return 'Je peux resumer les consultations, extraire les produits, comparer les categories et proposer une shortlist de priorite selon la note de correspondance et la date limite.';
}

export function ChatAssistant({ totalMatches, urgentCount, topCategories }: ChatAssistantProps) {
  const [answer, setAnswer] = useState(
    'Demandez a l assistant de resumer votre pipeline, de mettre en avant les appels d offres urgents, ou d expliquer pourquoi une consultation correspond a votre profil.'
  );

  return (
    <aside className="assistant">
      <div>
        <p className="hero-kicker">Assistant IA</p>
        <h3 className="section-title">Copilote achats</h3>
        <p className="section-subtitle">Posez vos questions en francais ou en arabe. Le moteur est concu pour des flux bilingues.</p>
      </div>

      <div className="assistant-questions">
        {prompts.map((prompt) => (
          <button key={prompt} className="button-ghost" type="button" suppressHydrationWarning onClick={() => setAnswer(answerForPrompt(prompt, totalMatches, urgentCount, topCategories))}>
            {prompt}
          </button>
        ))}
      </div>

      <div className="assistant-answer">{answer}</div>

      <div className="profile-grid">
        <div className="metric">
          <span className="muted">Correspondances actives</span>
          <strong className="stat-value">{totalMatches}</strong>
        </div>
        <div className="metric">
          <span className="muted">Alertes urgentes</span>
          <strong className="stat-value">{urgentCount}</strong>
        </div>
        <div className="metric">
          <span className="muted">Categories principales</span>
          <div className="profile-tags">
            {topCategories.slice(0, 4).map((category) => (
              <span key={category} className="tag">
                {category}
              </span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
