import Link from 'next/link';
import type { ReactNode } from 'react';
import { ThemeToggle } from './theme-toggle';

interface AuthShellProps {
  title: string;
  subtitle: string;
  eyebrow: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthShell({ title, subtitle, eyebrow, children, footer }: AuthShellProps) {
  return (
    <div className="auth-shell">
      <section className="auth-visual">
        <div>
          <Link className="brand" href="/dashboard" aria-label="Smart TUNEPS home">
            <span className="brand-mark" />
            <span>
              <p className="brand-name">Smart TUNEPS</p>
              <p className="brand-copy">Intelligence achats par IA</p>
            </span>
          </Link>
          <div className="auth-visual-card reveal">
            <p className="hero-kicker">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
            <div className="hero-badges">
              <span className="pill">Francais + arabe</span>
              <span className="pill">Collecte quotidienne</span>
              <span className="pill">Moteur de score</span>
            </div>
          </div>
        </div>
        <div className="inline-row">
          <span className="muted">Detection premium des appels d&apos;offres publics.</span>
          <ThemeToggle />
        </div>
      </section>
      <section className="auth-card">
        <div className="section">
          <div>
            <p className="hero-kicker">Acces securise</p>
            <h2 className="section-title">{title}</h2>
            <p className="section-subtitle">{subtitle}</p>
          </div>
          {children}
          <p className="auth-footer">{footer}</p>
        </div>
      </section>
    </div>
  );
}
