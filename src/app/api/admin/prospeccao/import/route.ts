import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

export const dynamic = 'force-dynamic';

const DEFAULT_KEYWORDS = [
  'cursinho',
  'vestibular',
  'redacao',
  'enem',
  'pre-vestibular',
  'prevestibular',
];

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const keywords: string[] = body.keywords ?? DEFAULT_KEYWORDS;

  if (!Array.isArray(keywords) || keywords.length === 0) {
    return NextResponse.json({ error: 'keywords inválidas' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = auth.supabaseAdmin as any;

  // 1. Cria o job no Supabase
  const { data: job, error: jobErr } = await db
    .from('prospeccao_import_jobs')
    .insert({
      keywords,
      keywords_total: keywords.length,
      status:         'pending',
      created_by:     auth.user.id,
    })
    .select()
    .single();

  if (jobErr) {
    return NextResponse.json({ error: jobErr.message }, { status: 500 });
  }

  const job_id: string = job.id;

  // 2. Dispara o Flask backend para iniciar o job (não aguarda conclusão)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000';
  const flaskRes = await fetch(`${apiUrl}/api/admin/prospeccao/import/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify({ job_id, keywords }),
  }).catch((e) => {
    // Falha ao contatar Flask — atualiza job como erro
    db.from('prospeccao_import_jobs')
      .update({ status: 'error', error: `Flask indisponível: ${String(e)}` })
      .eq('id', job_id)
      .then(() => null)
      .catch(() => null);
    return null;
  });

  if (!flaskRes?.ok) {
    const errBody = await flaskRes?.json().catch(() => ({}));
    await db
      .from('prospeccao_import_jobs')
      .update({
        status: 'error',
        error: (errBody as { error?: string })?.error ?? `Flask HTTP ${flaskRes?.status}`,
      })
      .eq('id', job_id);

    return NextResponse.json(
      { error: 'Falha ao iniciar importação no backend' },
      { status: 502 }
    );
  }

  return NextResponse.json({ job_id }, { status: 202 });
}
