import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

type BodyParam = { type: 'text'; text: string };

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const supabaseAdmin = auth.supabaseAdmin as any;

  const {
    to,
    userId,
    template_name,
    variables,
  } = (await request.json().catch(() => ({}))) as {
    to?: string;
    userId?: string;
    template_name?: string;
    variables?: string[];
  };

  if (!to || !template_name) {
    return NextResponse.json({ error: 'Parâmetros inválidos: { to, template_name }' }, { status: 400 });
  }

  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    return NextResponse.json({ error: 'Env WHATSAPP_TOKEN/WHATSAPP_PHONE_NUMBER_ID ausentes' }, { status: 500 });
  }

  const parameters: BodyParam[] = (variables ?? []).map((v) => ({ type: 'text', text: String(v ?? '') }));

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
      type: 'template',
      template: {
        name: template_name,
        language: { code: 'pt_BR' },
        components: [
          {
            type: 'body',
            parameters,
          },
        ],
      },
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json({ error: 'Falha ao enviar template via WhatsApp API', details: data }, { status: 502 });
  }

  // Auditoria: log de ação + avanço automático de stage
  try {
    let targetUserId = userId ?? null;
    if (!targetUserId) {
      const { data: p } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('whatsapp_phone', to)
        .maybeSingle();
      targetUserId = (p?.id as string | undefined) ?? null;
    }

    if (targetUserId) {
      await supabaseAdmin.from('admin_actions_log').insert({
        user_id: targetUserId,
        admin_id: auth.user.id,
        action_type: 'template_sent',
        payload: { template_name, variables: variables ?? [] },
      });

      const { data: existing } = await supabaseAdmin
        .from('profiles')
        .select('conversion_stage')
        .eq('id', targetUserId)
        .maybeSingle();

      if ((existing?.conversion_stage as string | null) === 'nao_abordado' || !existing?.conversion_stage) {
        await supabaseAdmin.from('profiles').update({ conversion_stage: 'abordado' }).eq('id', targetUserId);
      }
    }
  } catch {
    // fail-open
  }

  return NextResponse.json({ ok: true, data });
}

