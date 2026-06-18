import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

const BACKEND = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000').replace(/\/$/, '');

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  if (!auth.token) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });

  const { id } = await params;

  try {
    const flaskRes = await fetch(`${BACKEND}/api/admin/social-media/jobs/${id}`, {
      headers: { Authorization: `Bearer ${auth.token}` },
      signal:  AbortSignal.timeout(10_000),
    });
    const data = await flaskRes.json() as Record<string, unknown>;
    return NextResponse.json(data, { status: flaskRes.status });
  } catch (e) {
    console.error('[jobs/[id]] Flask call failed:', e);
    return NextResponse.json({ error: 'Falha ao consultar job.' }, { status: 502 });
  }
}
