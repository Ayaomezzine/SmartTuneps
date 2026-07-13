'use client';

import { useState } from 'react';

export function AdminActions() {
  const [pdfUrl, setPdfUrl] = useState('');
  const [catalogFile, setCatalogFile] = useState<File | null>(null);
  const [message, setMessage] = useState('Lancez les traitements quotidiens et mettez a jour le catalogue produit.');

  async function runDailyAutomation() {
    const response = await fetch('/api/jobs/daily/run', { method: 'POST' });
    const data = await response.json();
    setMessage(response.ok ? `Automatisation quotidienne terminee: ${data.crawler?.consultations ?? 0} consultations actives, ${data.notifications?.notificationsCreated ?? 0} notifications.` : data.error ?? 'Echec automatisation.');
  }

  async function runCrawler() {
    const response = await fetch('/api/jobs/crawler/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ maxPages: 10, pageSize: 100 })
    });
    const data = await response.json();
    setMessage(response.ok ? `Crawler termine: ${data.consultations ?? 0} consultations actives sur ${data.pages ?? 0} pages.` : data.error ?? 'Echec crawler.');
  }

  async function runNotifications() {
    const response = await fetch('/api/jobs/notifications/run', { method: 'POST' });
    const data = await response.json();
    setMessage(response.ok ? `Notifications creees: ${data.notificationsCreated ?? 0}.` : data.error ?? 'Echec notifications.');
  }

  async function uploadCatalog() {
    if (!catalogFile) {
      setMessage('Selectionnez un fichier CSV/XLSX avant envoi.');
      return;
    }

    const formData = new FormData();
    formData.append('file', catalogFile);

    const response = await fetch('/api/catalog/upload', {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    setMessage(response.ok ? `Catalogue mis a jour: ${data.productCount ?? 0} produits indexes.` : data.error ?? 'Echec upload catalogue.');
  }

  async function extractPdf() {
    if (!pdfUrl) {
      setMessage('Add a PDF URL first.');
      return;
    }
    const response = await fetch('/api/jobs/pdf/extract', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: pdfUrl })
    });
    const data = await response.json();
    setMessage(response.ok ? `PDF extrait: ${data.textLength ?? 0} caracteres.` : data.error ?? 'Echec extraction PDF.');
  }

  return (
    <div className="widget">
      <p className="hero-kicker">Actions operationnelles</p>
      <h3 className="section-title">Traitements automatiques</h3>
      <div className="actions-row">
        <button className="button-strong" type="button" onClick={runDailyAutomation}>
          Lancer automatisation quotidienne
        </button>
      </div>
      <div className="actions-row" style={{ marginTop: 8 }}>
        <button className="button-strong" type="button" onClick={runCrawler}>
          Lancer crawler
        </button>
        <button className="button" type="button" onClick={runNotifications}>
          Lancer notifications
        </button>
      </div>
      <label className="field" style={{ marginTop: 12 }}>
        <span>Televerser un catalogue produit (CSV/XLSX)</span>
        <input className="input" type="file" accept=".csv,.xlsx,.xls" onChange={(event) => setCatalogFile(event.target.files?.[0] ?? null)} />
      </label>
      <div className="actions-row">
        <button className="button" type="button" onClick={uploadCatalog}>
          Importer le catalogue
        </button>
      </div>
      <label className="field" style={{ marginTop: 12 }}>
        <span>URL PDF pour extraction</span>
        <input className="input" type="url" value={pdfUrl} onChange={(event) => setPdfUrl(event.target.value)} placeholder="https://...pdf" />
      </label>
      <div className="actions-row">
        <button className="button-ghost" type="button" onClick={extractPdf}>
          Extraire texte PDF
        </button>
      </div>
      <div className="assistant-answer">{message}</div>
    </div>
  );
}
