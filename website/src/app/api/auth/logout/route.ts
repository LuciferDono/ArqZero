import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete('arq_access');
  cookieStore.delete('arq_refresh');
  cookieStore.delete('arq_tier');
  return NextResponse.json({ ok: true });
}
