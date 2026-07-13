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
    <AppShell activeHref="/company-profile" title="Company profile" subtitle="Describe your company so the AI can match consultations more accurately.">
      <div className="detail-grid">
        <section className="detail-card section">
          <div>
            <p className="hero-kicker">Company data</p>
            <h2 className="section-title">Business information</h2>
            <p className="section-subtitle">Every client can store a clean, structured company profile.</p>
          </div>
          <CompanyForm initialValues={initialValues} />
        </section>

        <aside className="section">
          <div className="widget">
            <p className="hero-kicker">Product profile</p>
            <h3 className="section-title">What the company sells</h3>
            <div className="profile-tags">
              {['Office Supplies', 'Stationery', 'Paper', 'Printers', 'Furniture', 'IT Equipment', 'Networking', 'Custom products'].map((product) => (
                <span className="tag" key={product}>
                  {product}
                </span>
              ))}
            </div>
          </div>
          <div className="widget">
            <p className="hero-kicker">Custom products</p>
            <h3 className="section-title">Natural language support</h3>
            <p className="section-subtitle">
              The AI can read a sentence like: I sell Epson toners, Dell laptops, and office chairs.
            </p>
            <textarea className="textarea" defaultValue="I sell Epson toners, Dell laptops and office chairs." />
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
