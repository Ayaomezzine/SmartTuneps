'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { postJsonWithRetry } from '@/lib/client-request';

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? '')
    };

    const result = await postJsonWithRetry('/api/auth/login', { method: 'POST', body: payload, retries: 1, timeoutMs: 15000 });
    setLoading(false);

    if (!result.ok) {
      setError(result.status === 0 ? 'Unable to reach the server. Please try again.' : result.data?.error ?? 'Unable to sign in.');
      return;
    }

    router.replace('/dashboard');
    router.refresh();
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label>
        Email
        <input className="input" name="email" type="email" placeholder="you@company.com" required />
      </label>
      <label>
        Password
        <input className="input" name="password" type="password" placeholder="Enter your password" required />
      </label>
      {error ? <div className="assistant-answer">{error}</div> : null}
      <div className="auth-actions">
        <a className="button-ghost" href="/forgot-password">
          Forgot password
        </a>
        <button className="button-strong" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </div>
    </form>
  );
}
