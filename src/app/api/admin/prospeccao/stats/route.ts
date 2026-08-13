import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = auth.supabaseAdmin as any;

  // Busca todos os leads (apenas colunas necessárias para evitar overfetch)
  const { data: leads, error } = await db
    .from('leads')
    .select('status_crm, uf, telefone1, telefone2, email');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows: {
    status_crm: string;
    uf: string | null;
    telefone1: string | null;
    telefone2: string | null;
    email: string | null;
  }[] = leads ?? [];

  const total = rows.length;
  let com_contato = 0;
  let em_andamento = 0;
  let conversoes = 0;

  const by_status: Record<string, number> = {};
  const by_uf: Record<string, number> = {};

  const STATUS_EM_ANDAMENTO = new Set([
    'contatado', 'respondeu', 'handoff', 'esperando_contato_gestor', 'call_agendado', 'interesse', 'enviar_proposta', 'proposta_enviada',
  ]);

  for (const row of rows) {
    const s = row.status_crm;
    by_status[s] = (by_status[s] ?? 0) + 1;

    if (row.uf) {
      by_uf[row.uf] = (by_uf[row.uf] ?? 0) + 1;
    }

    if (row.telefone1 || row.telefone2 || row.email) {
      com_contato++;
    }

    if (STATUS_EM_ANDAMENTO.has(s)) {
      em_andamento++;
    }

    if (s === 'fechado') {
      conversoes++;
    }
  }

  // Denominador = leads que já saíram de "novo" (foram contatados em diante,
  // até fechado/perdido) — evita que a base toda (incl. leads nunca abordados)
  // dilua a taxa de conversão.
  const novos = by_status['novo'] ?? 0;
  const abordados = total - novos;
  const conversion_rate =
    abordados > 0 ? Math.round((conversoes / abordados) * 1000) / 10 : 0;

  return NextResponse.json({
    total,
    com_contato,
    em_andamento,
    conversoes,
    by_status,
    by_uf,
    conversion_rate,
  });
}
