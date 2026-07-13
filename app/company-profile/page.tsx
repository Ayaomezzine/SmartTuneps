import { AppShell } from '@/components/app-shell';
import { CompanyForm } from '@/components/company-form';
import { getCurrentUser } from '@/lib/current-user';
import { defaultBusinessProfile } from '@/lib/data';

export default async function CompanyProfilePage() {
  const user = await getCurrentUser();

  const initialValues = user?.company
    ? {
      companyName: user.company.companyName,
      businessSector: user.company.businessSector,
      vatNumber: user.company.vatNumber ?? '',
      address: user.company.address,
      phone: user.company.phone,
      email: user.company.email,
      productsJson: user.company.productsJson,
      customProducts: user.company.customProducts
    }
    : {
      companyName: defaultBusinessProfile.companyName,
      businessSector: defaultBusinessProfile.businessSector,
      vatNumber: defaultBusinessProfile.vatNumber ?? '',
      address: defaultBusinessProfile.address,
      phone: defaultBusinessProfile.phone,
      email: defaultBusinessProfile.email,
      productsJson: JSON.stringify(defaultBusinessProfile.products),
      customProducts: defaultBusinessProfile.customProducts
    };

  return (
    <AppShell activeHref="/company-profile" title="Profil entreprise" subtitle="Decrivez votre entreprise pour que l IA trouve des consultations plus pertinentes.">
      <div className="detail-grid">
        <section className="detail-card section">
          <div>
            <p className="hero-kicker">Donnees entreprise</p>
            <h2 className="section-title">Informations de l entreprise</h2>
            <p className="section-subtitle">Chaque client peut enregistrer un profil entreprise clair et structure.</p>
          </div>
          <CompanyForm initialValues={initialValues} />
        </section>

        <aside className="section">
          <div className="widget">
            <p className="hero-kicker">Profil produits</p>
            <h3 className="section-title">Ce que vend l entreprise</h3>
            <div className="profile-tags">
              {['Fournitures de bureau', 'Papeterie', 'Papier', 'Imprimantes', 'Mobilier', 'Equipement informatique', 'Reseau', 'Produits personnalises'].map((product) => (
                <span className="tag" key={product}>
                  {product}
                </span>
              ))}
            </div>
          </div>
          <div className="widget">
            <p className="hero-kicker">Produits personnalises</p>
            <h3 className="section-title">Support langage naturel</h3>
            <p className="section-subtitle">
              L IA peut lire une phrase comme : Je vends des toners Epson, des PC portables Dell et des chaises de bureau.
            </p>
            <textarea className="textarea" defaultValue="Je vends des toners Epson, des PC portables Dell et des chaises de bureau." />
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
