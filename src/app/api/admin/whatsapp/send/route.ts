import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { to, message, userId } = (await request.json().catch(() => ({}))) as { to?: string; message?: string; userId?: string };
  if (!to || !message || !message.trim()) {
    return NextResponse.json({ error: 'Parâmetros inválidos: { to, message }' }, { status: 400 });
  }

  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    return NextResponse.json({ error: 'Env WHATSAPP_TOKEN/WHATSAPP_PHONE_NUMBER_ID ausentes' }, { status: 500 });
  }

  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json({ error: 'Falha ao enviar via WhatsApp API', details: data }, { status: 502 });
  }

  // Auditoria: log de ação + avanço automático de stage
  try {
    let targetUserId = userId ?? null;
    if (!targetUserId) {
      const { data: p } = await auth.supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('whatsapp_phone', to)
        .maybeSingle();
      targetUserId = (p?.id as string | undefined) ?? null;
    }

    if (targetUserId) {
      await auth.supabaseAdmin.from('admin_actions_log').insert({
        user_id: targetUserId,
        admin_id: auth.user.id,
        action_type: 'message_sent',
        payload: { message },
      });

      const { data: existing } = await auth.supabaseAdmin
        .from('profiles')
        .select('conversion_stage')
        .eq('id', targetUserId)
        .maybeSingle();

      if ((existing?.conversion_stage as string | null) === 'nao_abordado' || !existing?.conversion_stage) {
        await auth.supabaseAdmin.from('profiles').update({ conversion_stage: 'abordado' }).eq('id', targetUserId);
      }
    }
  } catch {
    // fail-open: não quebra o envio se auditoria falhar
  }

  return NextResponse.json({ ok: true, data });
}

