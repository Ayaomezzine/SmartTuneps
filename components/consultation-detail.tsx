import Link from 'next/link';
import type { Consultation } from '@/lib/types';

interface ConsultationDetailProps {
  consultation: Consultation;
  related: Consultation[];
}

export function ConsultationDetail({ consultation, related }: ConsultationDetailProps) {
  return (
    <div className="page-grid">
      <section className="hero reveal">
        <div className="hero-panel">
          <p className="hero-kicker">Detail consultation</p>
          <h2 className="hero-title">
            {consultation.originalTitle}
          </h2>
          <p className="hero-copy">{consultation.aiSummary}</p>
          <div className="hero-actions">
            <a className="button-strong" href={consultation.directLink} target="_blank" rel="noreferrer">
              Ouvrir consultation officielle
            </a>
            <a className="button" href="#documents">
              Voir documents
            </a>
            <Link className="button-ghost" href="/dashboard">
              Retour au tableau de bord
            </Link>
          </div>
          <div className="hero-badges">
            <span className="pill">Score match: {consultation.matchScore}%</span>
            <span className="pill">Confiance: {consultation.confidenceScore}%</span>
            <span className="pill">Langue originale: {consultation.language}</span>
            <span className="pill">Dernier delai reception offres: {consultation.deadline}</span>
            <span className="pill">Jours restants: {consultation.remainingDaysBeforeDeadline}</span>
          </div>
        </div>

        <div className="panel">
          <div className="section-head">
            <div>
              <p className="hero-kicker">Opportunity snapshot</p>
              <h3 className="section-title">Pourquoi cette consultation a ete retenue</h3>
            </div>
            <span className="badge neutral">{consultation.urgency}</span>
          </div>
          <div className="timeline">
            <div className="timeline-item">
              <h4>Produits demandes</h4>
              <p>{consultation.productsRequested.join(', ')}</p>
            </div>
            <div className="timeline-item">
              <h4>Produits du catalogue correspondants</h4>
              <p>{consultation.matchingProducts.join(', ')}</p>
            </div>
            <div className="timeline-item">
              <h4>Categories correspondantes</h4>
              <p>{consultation.matchingCategories.join(', ')}</p>
            </div>
            <div className="timeline-item">
              <h4>Motif de selection</h4>
              <p>{consultation.reason}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="detail-grid">
        <section className="detail-card section">
          <div className="section-head">
            <div>
              <p className="hero-kicker">Consultation intelligence</p>
              <h3 className="section-title">Analyse IA</h3>
              <p className="section-subtitle">Analyse bilingue FR/AR, matching produit et synthese de pertinence.</p>
            </div>
          </div>

          <div className="metrics-columns">
            <div className="metric-grid">
              <div className="metric">
                <span className="muted">Autorite contractante</span>
                <strong>{consultation.organization}</strong>
              </div>
              <div className="metric">
                <span className="muted">Date de publication</span>
                <strong>{consultation.publicationDate}</strong>
              </div>
              <div className="metric">
                <span className="muted">Dernier delai reception offres</span>
                <strong>{consultation.deadline}</strong>
              </div>
              <div className="metric">
                <span className="muted">Jours restants</span>
                <strong>{consultation.remainingDaysBeforeDeadline}</strong>
              </div>
              <div className="metric">
                <span className="muted">Categorie</span>
                <strong>{consultation.category}</strong>
              </div>
            </div>

            <div className="timeline">
              <div className="timeline-item">
                <h4>Strategie suggeree</h4>
                <p>
                  {consultation.estimatedOpportunity}
                </p>
              </div>
              <div className="timeline-item">
                <h4>Concurrents potentiels</h4>
                <p>{consultation.potentialCompetitors.join(', ')}</p>
              </div>
              <div className="timeline-item">
                <h4>Conditions critiques</h4>
                <p>Prioriser les delais, la conformite technique et l’exhaustivite du dossier.</p>
              </div>
            </div>
          </div>
        </section>

        <aside className="section" id="documents">
          <div className="widget">
            <p className="hero-kicker">Donnees extraites</p>
            <h3 className="section-title">Lots et specifications</h3>
            <div className="list-stack">
              <div className="list-item">
                <h4>Lots</h4>
                <p>{consultation.lots.join(', ')}</p>
              </div>
              <div className="list-item">
                <h4>Specifications techniques</h4>
                <p>{consultation.technicalSpecifications.join(', ')}</p>
              </div>
              <div className="list-item">
                <h4>Produits correspondants</h4>
                <p>{consultation.matchingProducts.join(', ')}</p>
              </div>
              <div className="list-item">
                <h4>Raison de selection</h4>
                <p>{consultation.reason}</p>
              </div>
            </div>
          </div>

          <div className="widget">
            <p className="hero-kicker">Documents attaches</p>
            <h3 className="section-title">Pieces de la consultation</h3>
            <div className="list-stack">
              {consultation.documents.length ? consultation.documents.map((document) => (
                <a className="list-item" href={document.url} target="_blank" rel="noreferrer" key={document.id}>
                  <h4>{document.fileName}</h4>
                  <p>{document.url}</p>
                </a>
              )) : (
                <div className="list-item">
                  <h4>Aucun document detecte</h4>
                  <p>La consultation officielle reste accessible via le lien TUNEPS.</p>
                </div>
              )}
            </div>
          </div>

          <div className="widget">
            <p className="hero-kicker">Opportunites similaires</p>
            <h3 className="section-title">Autres consultations a verifier</h3>
            <div className="list-stack">
              {related.slice(0, 3).map((item) => (
                <Link className="list-item" href={`/consultations/${item.id}`} key={item.id}>
                  <h4>{item.originalTitle}</h4>
                  <p>{item.organization} · {item.deadline}</p>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
