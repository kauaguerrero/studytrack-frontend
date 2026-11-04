import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (typeof body?.concursos_enabled !== 'boolean') {
    return NextResponse.json({ error: 'Configuração inválida.' }, { status: 400 });
  }
  try {
    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    const response = await fetch(`${api}/api/partners/${encodeURIComponent(slug)}/settings`, {
      method: 'PATCH',
      headers: { Authorization: authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ concursos_enabled: body.concursos_enabled }),
      cache: 'no-store',
    });
    const result = await response.json();
    if (response.ok) revalidateTag(`partner-org:${slug}`, { expire: 0 });
    return NextResponse.json(result, { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Não foi possível salvar a configuração.' }, { status: 503 });
  }
}
