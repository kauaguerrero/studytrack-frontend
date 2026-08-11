import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

export const dynamic = 'force-dynamic';

// Últimos eventos do worker local, traduzidos em português — alimenta o
// terminal ao vivo do painel. Direto no Supabase, mesmo padrão do worker/route.ts.

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = auth.supabaseAdmin as any;
  const { data, error } = await db
    .from('prospeccao_worker_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(150);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: (data ?? []).reverse() });
}
