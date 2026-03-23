'use client';
import { useState } from 'react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.arqzero.dev';

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('Failed to send code');
      setStep('code');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Call our server action / API route to verify and set cookies
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Invalid code');
      }
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-6 py-16">
      <a href="/" className="text-brand font-bold text-lg block mb-12">◆ ArqZero</a>

      <div className="text-text-dim text-sm mb-6">$ arqzero login</div>

      {step === 'email' ? (
        <form onSubmit={handleEmailSubmit}>
          <label className="block text-sm mb-2">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full bg-surface border border-border text-text px-4 py-3 text-sm font-mono focus:border-brand focus:outline-none mb-4"
          />
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-black font-bold py-3 text-sm hover:bg-brand-light transition-colors disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send verification code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleCodeSubmit}>
          <p className="text-text-dim text-sm mb-4">Code sent to {email}</p>
          <label className="block text-sm mb-2">Verification code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
            maxLength={6}
            required
            className="w-full bg-surface border border-border text-text px-4 py-3 text-sm font-mono text-center text-2xl tracking-[0.5em] focus:border-brand focus:outline-none mb-4"
          />
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-black font-bold py-3 text-sm hover:bg-brand-light transition-colors disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
          <button
            type="button"
            onClick={() => { setStep('email'); setCode(''); setError(''); }}
            className="w-full text-text-dim text-sm mt-3 hover:text-brand transition-colors"
          >
            ← Different email
          </button>
        </form>
      )}
    </main>
  );
}
