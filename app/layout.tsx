import type { Metadata } from 'next';
import { Manrope, Space_Grotesk } from 'next/font/google';
import './globals.css';

const themeInitScript = `
(() => {
  const STORAGE_KEY = 'smart-tuneps-theme';
  try {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    const theme = storedTheme === 'light' || storedTheme === 'dark'
      ? storedTheme
      : 'light';
    document.documentElement.dataset.theme = theme;
  } catch {
    document.documentElement.dataset.theme = 'light';
  }
})();
`;

const bodyFont = Manrope({
  subsets: ['latin'],
  variable: '--font-body'
});

const headingFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading'
});

export const metadata: Metadata = {
  title: 'TPS',
  description: 'Plateforme IA de veille et de matching pour les consultations TUNEPS.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${bodyFont.variable} ${headingFont.variable}`}>
        {children}
      </body>
    </html>
  );
}
