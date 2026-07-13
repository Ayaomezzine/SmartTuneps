import Link from 'next/link';
import { AuthShell } from '@/components/auth-shell';
import { RegisterForm } from '@/components/register-form';

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="Commencer"
      title="Creer votre compte Smart TUNEPS"
      subtitle="Configurez votre profil entreprise, vos categories de produits et vos alertes en quelques minutes."
      footer={
        <>
          Deja inscrit ? <Link href="/login">Se connecter</Link>.
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
