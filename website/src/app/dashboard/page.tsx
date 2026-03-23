'use client';

import Link from 'next/link';

export default function Dashboard() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      <nav className="flex items-center justify-between mb-12">
        <Link href="/" className="text-brand font-bold text-lg">◆ ArqZero</Link>
      </nav>

      <div className="text-text-dim text-sm mb-8">$ arqzero --dashboard</div>

      <div className="bg-surface border border-border p-8 text-center">
        <h2 className="text-xl font-bold mb-4">Dashboard</h2>
        <p className="text-text-dim mb-6">Account management and billing will be available after launch.</p>
        <p className="text-text-dim text-sm">For now, use the CLI directly:</p>
        <div className="bg-bg border border-border p-4 mt-4 inline-block">
          <code className="text-brand">npm i -g arqzero</code>
        </div>
      </div>
    </main>
  );
}
