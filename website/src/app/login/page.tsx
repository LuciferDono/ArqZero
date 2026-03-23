'use client';

import Link from 'next/link';

export default function Login() {
  return (
    <main className="max-w-md mx-auto px-4 sm:px-6 py-16">
      <Link href="/" className="text-brand font-bold text-lg block mb-12">◆ ArqZero</Link>

      <div className="text-text-dim text-sm mb-6">$ arqzero login</div>

      <div className="bg-surface border border-border p-8 text-center">
        <h2 className="text-xl font-bold mb-4">Sign in to ArqZero</h2>
        <p className="text-text-dim mb-6">Authentication is handled in the terminal:</p>

        <div className="bg-bg border border-border p-4 text-left text-sm mb-6">
          <div className="text-text-dim">$ arqzero login</div>
          <div className="text-text-dim mt-2">Open this URL in your browser:</div>
          <div className="text-brand mt-1">https://arqzero.dev/auth/device?code=ABCD-EFGH</div>
          <div className="text-text-dim mt-2">Waiting for authorization...</div>
          <div className="text-success mt-1">Logged in as you@example.com (Pro)</div>
        </div>

        <p className="text-text-dim text-sm">Run <code className="text-brand">arqzero login</code> in your terminal to get started.</p>
      </div>
    </main>
  );
}
