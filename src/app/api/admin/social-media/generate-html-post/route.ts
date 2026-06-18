import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

// Submete job assíncrono e retorna job_id em < 3s
export const maxDuration = 15;

const BACKEND = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000').replace(/\/$/, '');

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  if (!auth.token) {
    return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  const payload = body as {
    prompt?:       string;
    format?:       string;
    slide_count?:  number;
    logo_urls?:    string[];
    partner_name?: string;
  };

  if (!payload.prompt?.trim()) {
    return NextResponse.json({ error: "Campo 'prompt' é obrigatório" }, { status: 400 });
  }

  try {
    const flaskRes = await fetch(
      `${BACKEND}/api/admin/social-media/generate-html-post`,
      {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${auth.token}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      },
    );

    const data = await flaskRes.json() as Record<string, unknown>;

    if (!flaskRes.ok) {
      return NextResponse.json(data, { status: flaskRes.status });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error('[generate-html-post] Flask call failed:', e);
    return NextResponse.json({ error: 'Falha ao comunicar com o servidor de geração.' }, { status: 502 });
  }
}
