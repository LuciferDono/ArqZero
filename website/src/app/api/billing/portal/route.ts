import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('arq_access')?.value;
  if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const API = process.env.API_URL ?? 'https://api.arqzero.dev';
  const res = await fetch(`${API}/checkout/portal`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (!res.ok) return NextResponse.json({ error: 'Failed' }, { status: res.status });
  const { url } = await res.json();
  return NextResponse.redirect(url);
}
