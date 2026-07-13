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
      name: 'Utilisateur Smart TUNEPS',
      email: 'contact@smart-tuneps.tn',
      phone: '+216 70 000 000',
      notificationPreferences: '{}'
    };

  return (
    <AppShell activeHref="/profile" title="User profile" subtitle="Manage your account, notification preferences, and saved searches.">
      <div className="detail-grid">
        <section className="detail-card section">
          <div>
            <p className="hero-kicker">Account</p>
            <h2 className="section-title">Personal settings</h2>
            <p className="section-subtitle">Keep your access details and alert preferences up to date.</p>
          </div>
          <ProfileForm initialValues={initialValues} />
        </section>

        <aside className="section">
          <div className="widget">
            <p className="hero-kicker">Activity</p>
            <h3 className="section-title">Saved and submitted work</h3>
            <div className="list-stack">
              <div className="list-item">
                <h4>Saved consultations</h4>
                <p>All shortlisted consultations stay available in the favorites view.</p>
              </div>
              <div className="list-item">
                <h4>Status tracking</h4>
                <p>Mark items as submitted, won, or lost to keep your team aligned.</p>
              </div>
              <div className="list-item">
                <h4>Unread alerts</h4>
                <p>Unread and urgent consultations stay visible until you open or dismiss them.</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
