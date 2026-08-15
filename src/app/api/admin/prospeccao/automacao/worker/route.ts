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

  // "Parar"/logout precisa pausar de verdade: cancela tudo que já foi
  // enfileirado mas ainda não saiu. O dispatch (cron) já para de enfileirar
  // coisa nova assim que vê esse command (ver _worker_is_paused no backend),
  // mas isso aqui limpa o que já estava na fila — senão o worker local pode
  // continuar drenando esse backlog mesmo depois do comando de parada.
  if (command === 'stop' || command === 'logout') {
    const { data: pendingRows } = await db
      .from('prospeccao_outbound_queue')
      .select('id')
      .eq('status', 'pending');
    const pendingIds: string[] = (pendingRows ?? []).map((r: { id: string }) => r.id);

    if (pendingIds.length > 0) {
      await db
        .from('prospeccao_outbound_queue')
        .update({ status: 'failed', error_message: 'Cancelado — automação pausada pelo admin' })
        .in('id', pendingIds);

      // Se a mensagem cancelada era a abertura da conversa (initial_outbound_id
      // da sessão), desfaz o dispatch inteiro — senão o lead fica preso como
      // "contatado" com uma sessão que nunca recebeu mensagem nenhuma, e não
      // aparece mais pro scan automático (que só pega status_crm='novo').
      // Volta pra 'novo' e apaga a sessão pra ele poder ser puxado de novo
      // num próximo dispatch, quando a automação for reiniciada.
      const { data: openingSessions } = await db
        .from('prospeccao_whatsapp_sessions')
        .select('phone, lead_id')
        .in('initial_outbound_id', pendingIds);

      if (openingSessions && openingSessions.length > 0) {
        const phones = openingSessions.map((s: { phone: string }) => s.phone);
        const leadIds = openingSessions.map((s: { lead_id: string }) => s.lead_id);

        await db.from('prospeccao_whatsapp_sessions').delete().in('phone', phones);
        await db
          .from('leads')
          .update({ status_crm: 'novo' })
          .in('id', leadIds)
          .eq('status_crm', 'contatado');
      }
    }
  }

  const { data, error } = await db
    .from('prospeccao_worker_status')
    .update({ command })
    .eq('id', true)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ worker: data });
}
