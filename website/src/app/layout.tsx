import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ArqZero — Terminal-Native AI Engineering Agent',
  description: 'The only coding agent that follows structured engineering methodologies. Bring your own AI. $12/mo.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
