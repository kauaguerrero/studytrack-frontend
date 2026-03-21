import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { whatsappLogsOrFilterForUser } from '@/app/api/admin/reengagement/_whatsappLogsScope';

type ChatItem =
  | {
      kind: 'whatsapp_log';
      id: string;
      direction: 'inbound' | 'outbound' | null;
      text: string;
      created_at: string | null;
    }
  | {
      kind: 'admin_action';
      id: string;
      action_type: string | null;
      text: string;
      created_at: string | null;
      payload: any;
    };

type WhatsappLogRow = {
  id: string;
  direction: 'inbound' | 'outbound' | null;
  payload: any;
  created_at: string | null;
};

type AdminActionRow = {
  id: string;
  action_type: string | null;
  payload: any;
  created_at: string | null;
};

function extractText(payload: any): string {
  if (!payload || typeof payload !== 'object') return '';

  // Texto simples
  const textBody = payload?.text?.body;
  if (typeof textBody === 'string' && textBody.trim()) return textBody;

  // Caption de imagem
  const caption = payload?.image?.caption;
  if (typeof caption === 'string' && caption.trim()) return caption;

  // Template — extrai nome + componentes para debug
  if (payload?.template?.name) {
    const name = payload.template.name;
    const components = (payload?.template?.components as any[]) ?? [];
    const parts: string[] = [`[Template: ${name}]`];

    for (const comp of components) {
      const type = String(comp?.type ?? '').toUpperCase();
      const params = (comp?.parameters as any[]) ?? [];
      if (params.length > 0) {
        const values = params
          .map((p: any) => p?.text ?? p?.image?.link ?? p?.document?.link ?? '')
          .filter(Boolean)
          .join(' | ');
        if (values) parts.push(`${type}: ${values}`);
      }
    }

    return parts.join('\n');
  }

  // Áudio
  if (payload?.audio?.id) return '[Áudio]';

  // Documento
  if (payload?.document?.filename) return `[Documento: ${payload.document.filename}]`;
  if (payload?.document?.id) return '[Documento]';

  // Imagem sem caption
  if (payload?.image?.id || payload?.image?.link) return '[Imagem]';

  // Sticker
  if (payload?.sticker?.id) return '[Sticker]';

  // Localização
  if (payload?.location) {
    const { latitude, longitude, name: locName } = payload.location;
    return `[Localização: ${locName ?? `${latitude}, ${longitude}`}]`;
  }

  // Reação
  if (payload?.reaction?.emoji) return `[Reação: ${payload.reaction.emoji}]`;

  // Fallback: serializa o payload para debug
  try {
    return `[Payload desconhecido: ${JSON.stringify(payload).slice(0, 200)}]`;
  } catch {
    return '[Payload ilegível]';
  }
}

function formatAdminAction(actionType: string | null, payload: any): string {
  if (actionType === 'message_sent') return String(payload?.message ?? '').trim() || '[Mensagem enviada]';
  if (actionType === 'template_sent') return `Template enviado: ${String(payload?.template_name ?? payload?.template ?? '—')}`;
  if (actionType === 'stage_updated') return `Stage atualizado: ${String(payload?.old_stage ?? '—')} → ${String(payload?.new_stage ?? '—')}`;
  if (actionType === 'conversation_read') return 'Conversa visualizada';
  return 'Ação do admin';
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'Parâmetro userId é obrigatório' }, { status: 400 });

  const { data: profileRow } = await auth.supabaseAdmin
    .from('profiles')
    .select('whatsapp_phone')
    .eq('id', userId)
    .maybeSingle();

  const logsFilter = whatsappLogsOrFilterForUser(userId, (profileRow as { whatsapp_phone?: string | null } | null)?.whatsapp_phone);

  const [{ data: logsRes, error: e1 }, { data: actionsRes, error: e2 }] = await Promise.all([
    auth.supabaseAdmin
      .from('whatsapp_logs')
      .select('id, direction, payload, created_at')
      .or(logsFilter)
      .order('created_at', { ascending: true })
      .limit(5000),
    auth.supabaseAdmin
      .from('admin_actions_log')
      .select('id, action_type, payload, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(5000),
  ]);

  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  const items: ChatItem[] = [];

  const logs = (logsRes ?? []) as WhatsappLogRow[];
  for (const l of logs) {
    items.push({
      kind: 'whatsapp_log',
      id: String(l.id),
      direction: (l.direction as WhatsappLogRow['direction']) ?? null,
      text: extractText(l.payload),
      created_at: (l.created_at as string | null) ?? null,
    });
  }

  const actions = (actionsRes ?? []) as AdminActionRow[];
  for (const a of actions) {
    const payload = a.payload ?? {};
    items.push({
      kind: 'admin_action',
      id: String(a.id),
      action_type: (a.action_type as string | null) ?? null,
      text: formatAdminAction((a.action_type as string | null) ?? null, payload),
      created_at: (a.created_at as string | null) ?? null,
      payload,
    });
  }

  items.sort((x, y) => {
    const ax = x.created_at ? new Date(x.created_at).getTime() : 0;
    const ay = y.created_at ? new Date(y.created_at).getTime() : 0;
    return ax - ay;
  });

  return NextResponse.json({ ok: true, items });
}

