import Link from 'next/link';
import { AuthShell } from '@/components/auth-shell';
import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Authentication"
      title="Sign in to Smart TUNEPS"
      subtitle="Access your procurement dashboard, favorites, notifications, and AI assistant."
      footer={
        <>
          No account yet? <Link href="/register">Create one</Link>.
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
