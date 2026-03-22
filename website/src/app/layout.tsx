import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ArqZero — Terminal-Native AI Engineering Agent',
  description: 'The only coding agent that enforces engineering methodology. 42 structured capabilities. Verification gates. Any LLM. $12/mo.',
  openGraph: {
    title: 'ArqZero',
    description: 'Terminal-native AI engineering agent with structured methodologies',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
