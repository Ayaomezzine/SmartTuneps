import { AppShell } from './app-shell';
import { DashboardClient } from './dashboard-client';
import { defaultBusinessProfile, loadConsultations } from '@/lib/data';
import { getCurrentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';
import { getProductCatalog } from '@/lib/product-catalog';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user?.company) {
    redirect('/login');
  }

  const profile = {
    ...defaultBusinessProfile,
    companyName: user.company.companyName,
    businessSector: user.company.businessSector,
    vatNumber: user.company.vatNumber ?? undefined,
    address: user.company.address,
    phone: user.company.phone,
    email: user.company.email,
    products: user.company.productsJson ? JSON.parse(user.company.productsJson) : defaultBusinessProfile.products,
    customProducts: user.company.customProducts || defaultBusinessProfile.customProducts
  };

  const consultations = await loadConsultations(profile.customProducts);
  const savedConsultationIds = await prisma.savedConsultation.findMany({
    where: { userId: user.id },
    select: { consultationId: true, status: true }
  });
  const productCatalog = await getProductCatalog();

  const savedIds = savedConsultationIds.filter((item) => item.status === 'saved').map((item) => item.consultationId);
  const ignoredIds = savedConsultationIds.filter((item) => item.status === 'ignored').map((item) => item.consultationId);

  return (
    <AppShell
      activeHref="/dashboard"
      title="Tableau de bord"
      subtitle="Suivez les consultations TUNEPS actives et pertinentes publiees aujourd'hui et hier."
    >
      <DashboardClient consultations={consultations} profile={profile} savedIds={savedIds} ignoredIds={ignoredIds} productCatalog={productCatalog} renderedAt={Date.now()} />
    </AppShell>
  );
}
