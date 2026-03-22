import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE = process.env.API_URL ?? 'https://api.arqzero.dev';

export async function POST(req: Request) {
  const { email, code } = await req.json();

  const res = await fetch(`${API_BASE}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ error: data.error ?? 'Verification failed' }, { status: res.status });
  }

  const { accessToken, refreshToken, tier } = await res.json();

  const cookieStore = await cookies();
  cookieStore.set('arq_access', accessToken, {
    httpOnly: true, secure: true, sameSite: 'lax', maxAge: 3600, path: '/',
  });
  cookieStore.set('arq_refresh', refreshToken, {
    httpOnly: true, secure: true, sameSite: 'lax', maxAge: 90 * 24 * 60 * 60, path: '/',
  });
  cookieStore.set('arq_tier', tier, {
    httpOnly: false, secure: true, sameSite: 'lax', maxAge: 90 * 24 * 60 * 60, path: '/',
  });

  return NextResponse.json({ ok: true });
}
