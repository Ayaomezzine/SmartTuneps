import { AppShell } from '@/components/app-shell';
import { AdminActions } from '@/components/admin-actions';
import { getCurrentUser } from '@/lib/current-user';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <AppShell activeHref="/admin" title="Administration" subtitle="Gestion utilisateurs, jobs crawler, notifications et catalogue produit.">
      <div className="page-grid">
        <section className="stats-grid">
          {[
            ['Utilisateurs', '128', 'Comptes clients actifs sur plusieurs secteurs.'],
            ['Etat crawler', 'OK', 'Collecte quotidienne et alertes operationnelles.'],
            ['Versions prompts', '7', 'Instructions IA de resume et matching gerees.'],
            ['Journaux audit', 'Actif', 'Tracabilite complete des actions critiques.']
          ].map(([label, value, copy]) => (
            <article className="stat-card" key={label}>
              <p className="stat-label">{label}</p>
              <p className="stat-value">{value}</p>
              <p className="stat-copy">{copy}</p>
            </article>
          ))}
        </section>

        <div className="detail-grid">
          <section className="detail-card section">
            <div className="section-head">
              <div>
                <p className="hero-kicker">Admin controls</p>
                <h3 className="section-title">Pilotage operationnel</h3>
              </div>
            </div>
            <div className="timeline">
              <div className="timeline-item">
                <h4>Gestion abonnements</h4>
                <p>Controle des plans, droits et quotas entreprise.</p>
              </div>
              <div className="timeline-item">
                <h4>Gestion categories</h4>
                <p>Mise a jour des familles produit et synonymes multilingues.</p>
              </div>
              <div className="timeline-item">
                <h4>Journaux</h4>
                <p>Suivi crawler, extraction PDF et notifications depuis une interface unique.</p>
              </div>
            </div>
          </section>

          <aside className="section">
            <AdminActions />
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
