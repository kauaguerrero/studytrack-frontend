import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

export const dynamic = 'force-dynamic';

// CRUD simples direto no Supabase (sem passar pelo Flask) — o worker local
// também lê/escreve essa mesma linha, ela é o barramento de controle entre os dois.

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = auth.supabaseAdmin as any;
  const { data, error } = await db
    .from('prospeccao_worker_status')
    .select('*')
    .eq('id', true)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ worker: data });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const command = body.command;
  if (command !== 'start' && command !== 'stop' && command !== 'logout') {
    return NextResponse.json({ error: "command deve ser 'start', 'stop' ou 'logout'" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = auth.supabaseAdmin as any;
  const { data, error } = await db
    .from('prospeccao_worker_status')
    .update({ command })
    .eq('id', true)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ worker: data });
}
