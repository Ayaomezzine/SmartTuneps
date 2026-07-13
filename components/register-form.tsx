'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { postJsonWithRetry } from '@/lib/client-request';

const defaultProducts = ['Office Supplies', 'Stationery', 'Paper', 'Printers', 'Furniture', 'IT Equipment', 'Networking'].join(', ');

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get('name') ?? ''),
      companyName: String(formData.get('companyName') ?? ''),
      businessSector: String(formData.get('businessSector') ?? ''),
      vatNumber: String(formData.get('vatNumber') ?? ''),
      address: String(formData.get('address') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      customProducts: String(formData.get('customProducts') ?? ''),
      products: String(formData.get('products') ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    };

    const response = await postJsonWithRetry('/api/auth/register', {
      method: 'POST',
      body: payload,
      retries: 1,
      timeoutMs: 15000
    });
    setLoading(false);

    if (!response.ok) {
      const errorPayload = response.data as { error?: { formErrors?: string[] } | string } | null;
      if (response.status === 0) {
        setError('Unable to reach the server. Please try again.');
        return;
      }

      setError(
        typeof errorPayload?.error === 'string'
          ? errorPayload.error
          : errorPayload?.error?.formErrors?.join(', ') ?? 'Unable to create account.'
      );
      return;
    }

    router.replace('/dashboard');
    router.refresh();
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label>
        Full name
        <input className="input" name="name" type="text" placeholder="Your full name" required />
      </label>
      <label>
        Company name
        <input className="input" name="companyName" type="text" placeholder="Your company name" required />
      </label>
      <label>
        Business sector
        <input className="input" name="businessSector" type="text" placeholder="Office Supplies and IT Equipment" required />
      </label>
      <label>
        VAT number
        <input className="input" name="vatNumber" type="text" placeholder="Optional" />
      </label>
      <label>
        Address
        <input className="input" name="address" type="text" placeholder="Business address" required />
      </label>
      <label>
        Phone
        <input className="input" name="phone" type="tel" placeholder="+216..." required />
      </label>
      <label>
        Email
        <input className="input" name="email" type="email" placeholder="you@company.com" required />
      </label>
      <label>
        Password
        <input className="input" name="password" type="password" placeholder="Create a strong password" required />
      </label>
      <label>
        Products you sell
        <input className="input" name="products" type="text" defaultValue={defaultProducts} />
      </label>
      <label>
        Custom products description
        <textarea className="textarea" name="customProducts" defaultValue="I sell Epson toners, Dell laptops and office chairs." />
      </label>
      {error ? <div className="assistant-answer">{error}</div> : null}
      <button className="button-strong" type="submit" disabled={loading}>
        {loading ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  );
}
