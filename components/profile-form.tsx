'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface ProfileFormProps {
  initialValues: {
    name: string;
    email: string;
    phone: string;
    notificationPreferences: string;
  };
}

export function ProfileForm({ initialValues }: ProfileFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const response = await fetch('/api/account/profile', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: String(formData.get('name') ?? ''),
        email: String(formData.get('email') ?? ''),
        phone: String(formData.get('phone') ?? ''),
        notificationPreferences: String(formData.get('notificationPreferences') ?? '{}')
      })
    });

    if (response.ok) {
      setMessage('Profile updated successfully.');
      router.refresh();
    } else {
      const data = await response.json();
      setMessage(data.error ?? 'Unable to update profile.');
    }
  }

  return (
    <form className="profile-grid" onSubmit={handleSubmit}>
      <label className="field">
        <span>Full name</span>
        <input className="input" name="name" type="text" defaultValue={initialValues.name} required />
      </label>
      <label className="field">
        <span>Email</span>
        <input className="input" name="email" type="email" defaultValue={initialValues.email} required />
      </label>
      <label className="field">
        <span>Phone</span>
        <input className="input" name="phone" type="tel" defaultValue={initialValues.phone} />
      </label>
      <label className="field">
        <span>Notification preferences</span>
        <textarea className="textarea" name="notificationPreferences" defaultValue={initialValues.notificationPreferences} />
      </label>
      {message ? <div className="assistant-answer">{message}</div> : null}
      <button className="button-strong" type="submit">
        Save profile
      </button>
    </form>
  );
}
