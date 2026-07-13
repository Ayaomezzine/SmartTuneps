import Link from 'next/link';
import { AuthShell } from '@/components/auth-shell';
import { RegisterForm } from '@/components/register-form';

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your Smart TUNEPS account"
      subtitle="Set up your company profile, product categories, and alert preferences in minutes."
      footer={
        <>
          Already registered? <Link href="/login">Sign in</Link>.
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
