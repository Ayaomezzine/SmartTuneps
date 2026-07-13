'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { postJsonWithRetry } from '@/lib/client-request';

const defaultProducts = ['Office Supplies', 'Stationery', 'Paper', 'Printers', 'Furniture', 'IT Equipment', 'Networking'].join(', ');

function readRegisterError(value: unknown) {
  if (!value || typeof value !== 'object') return null;

  const errorValue = (value as { error?: unknown }).error;
  if (typeof errorValue === 'string') return errorValue;

  if (errorValue && typeof errorValue === 'object') {
    const formErrors = (errorValue as { formErrors?: unknown }).formErrors;
    if (Array.isArray(formErrors)) {
      return formErrors.filter((item): item is string => typeof item === 'string').join(', ');
    }
  }

  return null;
}

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
      if (response.status === 0) {
        setError('Unable to reach the server. Please try again.');
        return;
      }

      setError(readRegisterError(response.data) ?? 'Unable to create account.');
      return;
    }

    router.replace('/dashboard');
    router.refresh();
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label>
        Nom complet
        <input className="input" name="name" type="text" placeholder="Votre nom complet" required />
      </label>
      <label>
        Nom de l&apos;entreprise
        <input className="input" name="companyName" type="text" placeholder="Nom de votre entreprise" required />
      </label>
      <label>
        Secteur d&apos;activite
        <input className="input" name="businessSector" type="text" placeholder="Fournitures de bureau et equipements informatiques" required />
      </label>
      <label>
        Numero de TVA
        <input className="input" name="vatNumber" type="text" placeholder="Facultatif" />
      </label>
      <label>
        Adresse
        <input className="input" name="address" type="text" placeholder="Adresse de l&apos;entreprise" required />
      </label>
      <label>
        Telephone
        <input className="input" name="phone" type="tel" placeholder="+216..." required />
      </label>
      <label>
        E-mail
        <input className="input" name="email" type="email" placeholder="vous@entreprise.com" required />
      </label>
      <label>
        Mot de passe
        <input className="input" name="password" type="password" placeholder="Créez un mot de passe fort" required />
      </label>
      <label>
        Produits que vous vendez
        <input className="input" name="products" type="text" defaultValue={defaultProducts} />
      </label>
      <label>
        Description des produits
        <textarea className="textarea" name="customProducts" defaultValue="Je vends des toners Epson, des ordinateurs portables Dell et des chaises de bureau." />
      </label>
      {error ? <div className="assistant-answer">{error}</div> : null}
      <button className="button-strong" type="submit" disabled={loading}>
        {loading ? 'Creation du compte...' : 'Creer le compte'}
      </button>
    </form>
  );
}
