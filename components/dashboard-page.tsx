import { AppShell } from './app-shell';
import { DashboardClient } from './dashboard-client';
import { defaultBusinessProfile, loadConsultations } from '@/lib/data';
import { getCurrentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';
import { getProductCatalog } from '@/lib/product-catalog';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const profile = user?.company
    ? {
      ...defaultBusinessProfile,
      companyName: user.company.companyName,
      businessSector: user.company.businessSector,
      vatNumber: user.company.vatNumber ?? undefined,
      address: user.company.address,
      phone: user.company.phone,
      email: user.company.email,
      products: user.company.productsJson ? JSON.parse(user.company.productsJson) : defaultBusinessProfile.products,
      customProducts: user.company.customProducts || defaultBusinessProfile.customProducts
    }
    : defaultBusinessProfile;

  const consultations = await loadConsultations(profile.customProducts);
  const now = new Date();
  const startTodayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const endTodayUtc = startTodayUtc + 24 * 60 * 60 * 1000;
  const hasTodayPublications = consultations.some((consultation) => {
    const publicationTs = new Date(consultation.publicationDate).getTime();
    return Number.isFinite(publicationTs) && publicationTs >= startTodayUtc && publicationTs < endTodayUtc;
  });
  const savedConsultationIds = user
    ? await prisma.savedConsultation.findMany({
      where: { userId: user.id },
      select: { consultationId: true, status: true }
    })
    : [];
  const productCatalog = await getProductCatalog();

  const savedIds = savedConsultationIds.filter((item) => item.status === 'saved').map((item) => item.consultationId);
  const ignoredIds = savedConsultationIds.filter((item) => item.status === 'ignored').map((item) => item.consultationId);

  return (
    <AppShell
      activeHref="/dashboard"
      title="Tableau de bord"
      subtitle={hasTodayPublications
        ? "Suivez les consultations TUNEPS actives et pertinentes publiees aujourd'hui et hier."
        : 'Suivez les consultations TUNEPS actives et pertinentes des 2 derniers jours.'}
    >
      <DashboardClient
        consultations={consultations}
        profile={profile}
        savedIds={savedIds}
        ignoredIds={ignoredIds}
        productCatalog={productCatalog}
        renderedAt={Date.now()}
        hasTodayPublications={hasTodayPublications}
      />
    </AppShell>
  );
}
