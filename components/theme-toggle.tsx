'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'smart-tuneps-theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY) as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const nextTheme = storedTheme ?? (prefersDark ? 'dark' : 'light');
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    setMounted(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return (
    <button
      className="button-ghost"
      type="button"
      suppressHydrationWarning
      onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
    >
      {mounted ? (theme === 'dark' ? 'Mode clair' : 'Mode sombre') : 'Theme'}
    </button>
  );
}
