import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

async function getDashboardData(accessToken: string) {
  const API = process.env.API_URL ?? 'https://api.arqzero.dev';
  try {
    const [licenseRes, userRes] = await Promise.all([
      fetch(`${API}/license`, { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${accessToken}` } }),
    ]);
    const license = licenseRes.ok ? await licenseRes.json() : null;
    const user = userRes.ok ? await userRes.json() : null;
    return { license, user };
  } catch {
    return { license: null, user: null };
  }
}

export default async function Dashboard() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('arq_access')?.value;
  if (!accessToken) redirect('/login');

  const tier = cookieStore.get('arq_tier')?.value ?? 'free';
  const { license, user } = await getDashboardData(accessToken);

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      <nav className="flex items-center justify-between mb-12">
        <a href="/" className="text-brand font-bold text-lg">◆ ArqZero</a>
        <div className="flex gap-4 sm:gap-6 text-sm text-text-dim">
          <a href="/dashboard" className="text-brand py-1">dashboard</a>
          <form action="/api/auth/logout" method="POST" className="inline">
            <button type="submit" className="hover:text-red-500 transition-colors py-1">logout</button>
          </form>
        </div>
      </nav>

      <div className="text-text-dim text-sm mb-8">$ arqzero --dashboard</div>

      {/* User info */}
      <div className="bg-surface border border-border p-6 mb-6">
        <div className="text-text-dim text-xs mb-1">Account</div>
        <div className="font-bold">{user?.email ?? 'Unknown'}</div>
        {user?.displayName && <div className="text-text-dim text-sm">{user.displayName}</div>}
      </div>

      {/* Plan */}
      <div className="bg-surface border border-border p-6 mb-6">
        <div className="text-text-dim text-xs mb-1">Plan</div>
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg">{tier.charAt(0).toUpperCase() + tier.slice(1)}</span>
          {tier === 'free' && (
            <a href="/pricing" className="text-brand text-sm hover:underline">Upgrade →</a>
          )}
        </div>
        {license?.periodEnd && (
          <div className="text-text-dim text-sm mt-1">
            Renews: {new Date(license.periodEnd).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Usage */}
      <div className="bg-surface border border-border p-6 mb-6">
        <div className="text-text-dim text-xs mb-1">Usage today</div>
        <div className="font-bold">
          {license?.dailyUsage ?? 0}
          {license?.dailyCap ? <span className="text-text-dim font-normal"> / {license.dailyCap}</span> : <span className="text-text-dim font-normal"> (unlimited)</span>}
        </div>
      </div>

      {/* Billing */}
      {tier !== 'free' && (
        <div className="bg-surface border border-border p-6 mb-6">
          <div className="text-text-dim text-xs mb-3">Billing</div>
          <form action="/api/billing/portal" method="POST">
            <button type="submit" className="border border-border px-4 py-2 text-sm hover:border-brand hover:text-brand transition-colors">
              Manage billing →
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
