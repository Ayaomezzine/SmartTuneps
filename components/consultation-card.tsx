'use client';

import Link from 'next/link';
import type { Consultation } from '@/lib/types';

interface ConsultationCardProps {
  consultation: Consultation;
  matchScore: number;
  confidenceScore: number;
  matchingCategories: string[];
  saved: boolean;
  ignored: boolean;
  unread: boolean;
  onToggleSave: (id: string) => void;
  onToggleIgnore: (id: string) => void;
  onShare: (consultation: Consultation) => void;
  onMarkRead: (id: string) => void;
}

export function ConsultationCard({
  consultation,
  matchScore,
  confidenceScore,
  matchingCategories,
  saved,
  ignored,
  unread,
  onToggleSave,
  onToggleIgnore,
  onShare,
  onMarkRead
}: ConsultationCardProps) {
  const urgencyLabel = consultation.urgency === 'urgent' ? 'Urgent' : consultation.urgency === 'soon' ? 'Bientot' : 'Normale';
  const matchClass = matchScore >= 80 ? 'match-high' : matchScore >= 65 ? 'match-mid' : 'match-low';

  return (
    <article className="consultation-card reveal" aria-label={consultation.originalTitle}>
      <div className="card-top">
        <div>
          <div className="card-meta">
            <span className={`badge ${matchClass}`}>{matchScore}% note</span>
            <span className="badge neutral">Confiance {confidenceScore}%</span>
            <span className="badge neutral">{consultation.language}</span>
            <span className="badge urgent">{urgencyLabel}</span>
            {unread ? <span className="badge neutral">Non lue</span> : null}
          </div>
          <h3 className="card-title">{consultation.originalTitle}</h3>
          <p className="card-subtitle">{consultation.organization}</p>
        </div>
        <div className="inline-row">
          <button className="button-ghost" type="button" suppressHydrationWarning onClick={() => onToggleSave(consultation.id)}>
            {saved ? 'Sauvegardee' : 'Sauvegarder'}
          </button>
          <button className="button-ghost" type="button" suppressHydrationWarning onClick={() => onToggleIgnore(consultation.id)}>
            {ignored ? 'Restaurer' : 'Ignorer'}
          </button>
        </div>
      </div>

      <p className="card-body">{consultation.aiSummary}</p>

      <div className="card-stats">
        {(consultation.matchingProducts.length ? consultation.matchingProducts : matchingCategories).slice(0, 3).map((item) => (
          <span className="chip" key={item}>
            {item}
          </span>
        ))}
      </div>

      <div className="card-footer">
        <div className="muted">
          <strong>Publication:</strong> {consultation.publicationDate}<br />
          <strong>Dernier delai reception offres:</strong> {consultation.deadline}
        </div>
        <div className="actions-row">
          <Link className="button" href={`/consultations/${consultation.id}`} onClick={() => onMarkRead(consultation.id)}>
            Voir les details
          </Link>
          <a className="button" href={consultation.directLink} target="_blank" rel="noreferrer">
            Ouvrir consultation officielle
          </a>
          <button className="button-ghost" type="button" suppressHydrationWarning onClick={() => onShare(consultation)}>
            Partager
          </button>
        </div>
      </div>
    </article>
  );
}
