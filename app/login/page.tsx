import Link from 'next/link';
import { AuthShell } from '@/components/auth-shell';
import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Authentification"
      title="Connexion a Smart TUNEPS"
      subtitle="Accedez a votre tableau de bord, vos favoris, vos notifications et votre assistant IA."
      footer={
        <>
          Pas encore de compte ? <Link href="/register">Creer un compte</Link>.
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
