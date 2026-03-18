import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const token = process.env.WHATSAPP_TOKEN;
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  if (!token || !wabaId) {
    return NextResponse.json({ error: 'Env WHATSAPP_TOKEN/WHATSAPP_BUSINESS_ACCOUNT_ID ausentes' }, { status: 500 });
  }

  const url = `https://graph.facebook.com/v18.0/${wabaId}/message_templates`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json({ error: 'Falha ao buscar templates', details: data }, { status: 502 });
  }

  return NextResponse.json({ ok: true, data });
}

