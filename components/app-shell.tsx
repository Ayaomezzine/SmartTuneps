import Link from 'next/link';
import type { ReactNode } from 'react';
import { primaryNavigation } from '@/lib/navigation';
import { LogoutButton } from './logout-button';
import { ThemeToggle } from './theme-toggle';

interface AppShellProps {
  activeHref: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AppShell({ activeHref, title, subtitle, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/dashboard">
          <span className="brand-mark" />
          <span>
            <p className="brand-name">Smart TUNEPS</p>
            <p className="brand-copy">Plateforme de veille des achats publics</p>
          </span>
        </Link>

        <nav aria-label="Navigation principale">
          <ul className="nav-list">
            {primaryNavigation.map((item) => (
              <li key={item.href}>
                <Link className={`nav-link ${activeHref === item.href ? 'active' : ''}`} href={item.href}>
                  <span>{item.label}</span>
                  <span className="muted">+</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-foot">
          <h3>Agent IA quotidien</h3>
          <p>
            Explore TUNEPS chaque jour, lit les details et PDF, calcule les correspondances catalogue
            puis notifie automatiquement les utilisateurs concernes.
          </p>
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          <div className="topbar-copy">
            <p className="topbar-kicker">Surveillance TUNEPS</p>
            <h1 className="topbar-title">{title}</h1>
            <p className="topbar-subtitle">{subtitle}</p>
          </div>
          <div className="topbar-actions">
            <LogoutButton />
            <ThemeToggle />
          </div>
        </header>
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
