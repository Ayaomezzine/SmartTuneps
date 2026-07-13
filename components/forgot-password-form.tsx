'use client';

import { useState } from 'react';

export function ForgotPasswordForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: String(formData.get('email') ?? '') })
    });

    const data = await response.json();
    setLoading(false);
    setStatus(data.message ?? 'If the email exists, a reset link has been queued.');
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label>
        Email address
        <input className="input" type="email" name="email" placeholder="you@company.com" required />
      </label>
      {status ? <div className="assistant-answer">{status}</div> : null}
      <button className="button-strong" type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send reset link'}
      </button>
    </form>
  );
}
