import { loadAuth, saveAuth, isAccessTokenExpired, isOfflineGraceExpired } from './store.js';
import { refreshAccessToken, fetchLicense } from './client.js';

export type Tier = 'free' | 'pro' | 'team';

export async function resolveAuthState(): Promise<{ tier: Tier; email: string | null }> {
  const auth = loadAuth();
  if (!auth) return { tier: 'free', email: null };

  // Access token still valid
  if (!isAccessTokenExpired(auth)) {
    // Background refresh once per 24h
    const oneDay = 24 * 60 * 60 * 1000;
    if (Date.now() - auth.lastValidated > oneDay) {
      refreshInBackground(auth);
    }
    return { tier: auth.tier, email: auth.email };
  }

  // Try refresh
  try {
    const result = await refreshAccessToken(auth.refreshToken);
    const expiresAt = Date.now() + result.expiresIn * 1000;
    let tier = (result.tier as Tier) ?? auth.tier;

    // Fetch fresh license
    try {
      const license = await fetchLicense(result.accessToken);
      tier = license.tier as Tier;
    } catch {}

    saveAuth({
      ...auth,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      tier,
      expiresAt,
      lastValidated: Date.now(),
    });
    return { tier, email: auth.email };
  } catch {
    // Refresh failed
  }

  // Offline grace: 7 days
  if (!isOfflineGraceExpired(auth)) {
    return { tier: auth.tier, email: auth.email };
  }

  // Grace expired
  return { tier: 'free', email: auth.email };
}

async function refreshInBackground(auth: ReturnType<typeof loadAuth>): Promise<void> {
  if (!auth) return;
  try {
    const result = await refreshAccessToken(auth.refreshToken);
    saveAuth({
      ...auth,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresAt: Date.now() + result.expiresIn * 1000,
      lastValidated: Date.now(),
    });
  } catch {}
}
