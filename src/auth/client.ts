const API_BASE = process.env.ARQZERO_API_URL ?? 'https://api.arqzero.dev';

export async function requestLoginCode(email: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Login request failed: ${res.status}`);
  }
}

export async function verifyLoginCode(
  email: string,
  code: string,
  machineId?: string,
  deviceLabel?: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tier: string;
  user: { id: string; email: string; displayName: string | null };
}> {
  const res = await fetch(`${API_BASE}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, machineId, deviceLabel }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Verification failed: ${res.status}`);
  }
  return res.json();
}

export async function refreshAccessToken(refreshToken: string, machineId?: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tier: string;
}> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken, machineId }),
  });
  if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);
  return res.json();
}

export async function logout(refreshToken: string): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => {});
}

export async function fetchLicense(accessToken: string): Promise<{
  tier: string;
  status: string;
  periodEnd: string | null;
  dailyUsage: number;
  dailyCap: number | null;
}> {
  const res = await fetch(`${API_BASE}/license`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`License fetch failed: ${res.status}`);
  return res.json();
}

export async function syncUsage(
  accessToken: string,
  date: string,
  messageCount: number,
): Promise<{ totalMessageCount: number; cap: number | null; exceeded: boolean }> {
  const res = await fetch(`${API_BASE}/usage/sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ date, messageCount }),
  });
  if (!res.ok) throw new Error(`Usage sync failed: ${res.status}`);
  return res.json();
}

export async function getCheckoutUrl(accessToken: string, tier: 'pro' | 'team'): Promise<string> {
  const res = await fetch(`${API_BASE}/checkout/session`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tier }),
  });
  if (!res.ok) throw new Error(`Checkout failed: ${res.status}`);
  const data = await res.json();
  return data.url;
}
