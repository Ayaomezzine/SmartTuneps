'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface CompanyFormProps {
  initialValues: {
    companyName: string;
    businessSector: string;
    vatNumber: string;
    address: string;
    phone: string;
    email: string;
    productsJson: string;
    customProducts: string;
  };
}

export function CompanyForm({ initialValues }: CompanyFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const response = await fetch('/api/account/company', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        companyName: String(formData.get('companyName') ?? ''),
        businessSector: String(formData.get('businessSector') ?? ''),
        vatNumber: String(formData.get('vatNumber') ?? ''),
        address: String(formData.get('address') ?? ''),
        phone: String(formData.get('phone') ?? ''),
        email: String(formData.get('email') ?? ''),
        products: String(formData.get('products') ?? '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        customProducts: String(formData.get('customProducts') ?? '')
      })
    });

    if (response.ok) {
      setMessage('Profil entreprise enregistre.');
      router.refresh();
    } else {
      const data = await response.json();
      setMessage(data.error ?? 'Impossible de mettre a jour le profil entreprise.');
    }
  }

  return (
    <form className="profile-grid" onSubmit={handleSubmit}>
      <label className="field">
        <span>Nom de l entreprise</span>
        <input className="input" name="companyName" type="text" defaultValue={initialValues.companyName} required />
      </label>
      <label className="field">
        <span>Secteur d activite</span>
        <input className="input" name="businessSector" type="text" defaultValue={initialValues.businessSector} required />
      </label>
      <label className="field">
        <span>Matricule fiscal</span>
        <input className="input" name="vatNumber" type="text" defaultValue={initialValues.vatNumber} />
      </label>
      <label className="field">
        <span>Adresse</span>
        <input className="input" name="address" type="text" defaultValue={initialValues.address} required />
      </label>
      <label className="field">
        <span>Phone</span>
        <input className="input" name="phone" type="tel" defaultValue={initialValues.phone} required />
      </label>
      <label className="field">
        <span>Email</span>
        <input className="input" name="email" type="email" defaultValue={initialValues.email} required />
      </label>
      <label className="field">
        <span>Produits</span>
        <input className="input" name="products" type="text" defaultValue={initialValues.productsJson.replace(/^[\[]|[\]]$/g, '').replace(/"/g, '')} />
      </label>
      <label className="field">
        <span>Description des produits personnalises</span>
        <textarea className="textarea" name="customProducts" defaultValue={initialValues.customProducts} />
      </label>
      {message ? <div className="assistant-answer">{message}</div> : null}
      <button className="button-strong" type="submit">
        Enregistrer le profil entreprise
      </button>
    </form>
  );
}
