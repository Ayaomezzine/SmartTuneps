import Link from 'next/link';
import { AuthShell } from '@/components/auth-shell';
import { ForgotPasswordForm } from '@/components/forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Recovery"
      title="Reset your password"
      subtitle="We'll send a recovery link so you can get back into your dashboard quickly."
      footer={
        <>
          Remembered it? <Link href="/login">Return to sign in</Link>.
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
