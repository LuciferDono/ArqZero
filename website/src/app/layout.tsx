import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ArqZero — Terminal-Native AI Engineering Agent',
  description: 'The only coding agent that enforces engineering methodology. 42 structured capabilities, verification gates, any LLM. $12/mo.',
  keywords: ['AI coding agent', 'terminal', 'CLI', 'ArqZero', 'engineering methodology', 'TDD', 'code review', 'BYOK'],
  openGraph: {
    title: 'ArqZero',
    description: 'Terminal-native AI engineering agent with structured methodologies',
    url: 'https://arqzero.dev',
    siteName: 'ArqZero',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ArqZero',
    description: 'The only coding agent that enforces engineering methodology',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
        <script defer data-domain="arqzero.dev" src="https://plausible.io/js/script.js" />
      </head>
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
