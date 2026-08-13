import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

export const dynamic = 'force-dynamic';

const FLASK_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000';

// Não usa o proxyToFlask padrão (../_proxy.ts) porque esse endpoint retorna
// um arquivo (markdown pra download), não JSON — precisa repassar o corpo e
// os headers de Content-Type/Content-Disposition em vez de fazer JSON parse.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start') ?? '';
  const end = searchParams.get('end') ?? '';

  const upstream = await fetch(
    `${FLASK_BASE}/api/admin/prospeccao/automacao/export-conversations?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
    { headers: { Authorization: `Bearer ${auth.token}` } }
  );

  if (!upstream.ok) {
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  }

  const blob = await upstream.blob();
  return new NextResponse(blob, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'text/markdown',
      'Content-Disposition': upstream.headers.get('Content-Disposition') ?? 'attachment; filename="conversas.md"',
    },
  });
}
