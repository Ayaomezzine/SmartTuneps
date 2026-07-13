import { AppShell } from '@/components/app-shell';
import { ProfileForm } from '@/components/profile-form';
import { getCurrentUser } from '@/lib/current-user';

export default async function ProfilePage() {
  const user = await getCurrentUser();

  const initialValues = user
    ? {
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
      notificationPreferences: user.notificationPreferences
    }
    : {
      name: 'Utilisateur TPS',
      email: 'contact@tps.tn',
      phone: '+216 70 000 000',
      notificationPreferences: '{}'
    };

  return (
    <AppShell activeHref="/profile" title="Profil utilisateur" subtitle="Gerez votre compte, vos notifications et vos consultations sauvegardees.">
      <div className="detail-grid">
        <section className="detail-card section">
          <div>
            <p className="hero-kicker">Compte</p>
            <h2 className="section-title">Parametres personnels</h2>
            <p className="section-subtitle">Gardez vos informations d acces et preferences d alerte a jour.</p>
          </div>
          <ProfileForm initialValues={initialValues} />
        </section>

        <aside className="section">
          <div className="widget">
            <p className="hero-kicker">Activite</p>
            <h3 className="section-title">Suivi des consultations</h3>
            <div className="list-stack">
              <div className="list-item">
                <h4>Consultations sauvegardees</h4>
                <p>Toutes les consultations shortlistes restent disponibles dans la vue favoris.</p>
              </div>
              <div className="list-item">
                <h4>Suivi des statuts</h4>
                <p>Marquez les elements comme soumis, gagnes ou perdus pour aligner votre equipe.</p>
              </div>
              <div className="list-item">
                <h4>Alertes non lues</h4>
                <p>Les consultations non lues et urgentes restent visibles jusqu a ouverture ou suppression.</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
