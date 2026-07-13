import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { ConsultationDetail } from '@/components/consultation-detail';
import { defaultBusinessProfile, loadConsultationById, loadConsultations } from '@/lib/data';
import { getCurrentUser } from '@/lib/current-user';
import type { Consultation } from '@/lib/types';

interface ConsultationPageProps {
  params: Promise<{ id: string }>;
}

export default async function ConsultationPage({ params }: ConsultationPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  const profileText = user?.company?.customProducts || defaultBusinessProfile.customProducts;
  const consultation = await loadConsultationById(id, profileText);

  if (!consultation) {
    notFound();
  }

  const related = (await loadConsultations(profileText)).filter((item: Consultation) => item.id !== id && item.category === consultation.category);

  return (
    <AppShell
      activeHref="/dashboard"
      title="Details consultation"
      subtitle="Synthese IA, produits correspondants et documents officiels." 
    >
      <ConsultationDetail consultation={consultation} related={related} />
    </AppShell>
  );
}
