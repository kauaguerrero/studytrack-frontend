import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

type WhatsAppLogRow = {
  id: string;
  direction: 'inbound' | 'outbound' | null;
  payload: any;
  created_at: string | null;
};

function extractText(payload: any): string {
  if (!payload || typeof payload !== 'object') return '';
  const t = payload?.text?.body;
  if (typeof t === 'string') return t;
  const caption = payload?.image?.caption;
  if (typeof caption === 'string') return caption;
  return '';
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { userId, messageId, userMessage } = (await request.json().catch(() => ({}))) as {
    userId?: string;
    messageId?: string;
    userMessage?: string;
  };

  if (!userId || !userMessage) {
    return NextResponse.json({ error: 'Parâmetros inválidos: { userId, userMessage }' }, { status: 400 });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json({ error: 'Env ANTHROPIC_API_KEY ausente' }, { status: 500 });
  }

  const { data: profile } = await auth.supabaseAdmin
    .from('profiles')
    .select('conversion_stage')
    .eq('id', userId)
    .maybeSingle();

  const conversionStage = (profile?.conversion_stage as string | null) ?? 'nao_abordado';

  const { data: logs } = await auth.supabaseAdmin
    .from('whatsapp_logs')
    .select('id, direction, payload, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  const ordered = [...((logs as WhatsAppLogRow[] | null) ?? [])].reverse();
  const historyLines = ordered
    .map((l) => {
      const text = extractText(l.payload);
      if (!text) return null;
      const who = l.direction === 'inbound' ? 'Usuario' : 'Bot';
      return `${who}: ${text}`;
    })
    .filter(Boolean)
    .join('\n');

  const systemPrompt = [
    'Você é um assistente de vendas da StudyTrack, plataforma de estudos',
    'para o ENEM que envia missões diárias personalizadas via WhatsApp.',
    '',
    'Contexto do produto:',
    '- Trial de 3 dias grátis sem cartão',
    '- Plano Básico: R$14,90/mês',
    '- Plano Pro: R$29,90/mês (simulados, tutor de exatas)',
    '- Plano Elite: R$49,90/mês (correção ilimitada de redações)',
    '- Diferencial: IA analisa lacunas e manda missão todo dia às 8h no WhatsApp',
    '- Fundadores aprovados em 1º e 3º lugar na estadual de MG sem cursinho',
    '- Aceita Pix',
    '',
    'Pipeline de conversão:',
    'nao_abordado → abordado → oferta_feita → oferta_especial (R$14,90 primeiro mês) → convertido',
    '',
    `Stage atual do usuário: ${conversionStage}`,
    '',
    'Seu objetivo é sugerir uma resposta humana, empática e direta que',
    'avance o usuário para o próximo stage da pipeline.',
    "Se o usuário demonstrar desconforto claro, sugira a mensagem 'semente':",
    "'Sem problema! Quando quiser continuar é só falar. Seu progresso fica salvo.'",
    'Nunca seja robótico. Nunca force a venda.',
    '',
    'Retorne APENAS a mensagem sugerida, sem explicação, sem aspas,',
    'sem prefixo. Máximo 3 frases.',
  ].join('\n');

  const userPrompt = [
    'Histórico da conversa (últimas 10 mensagens):',
    historyLines || '—',
    '',
    `Última mensagem do usuário: ${userMessage}`,
    `Stage atual: ${conversionStage}`,
    '',
    'Sugira a melhor resposta para avançar na conversão.',
  ].join('\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 180,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json({ error: 'Falha ao gerar sugestão', details: data }, { status: 502 });
  }

  const text = (data?.content?.[0]?.text as string | undefined) ?? '';
  const suggestion = String(text || '').trim();
  if (!suggestion) {
    return NextResponse.json({ error: 'Resposta vazia da IA', details: data }, { status: 502 });
  }

  return NextResponse.json({ ok: true, messageId: messageId ?? null, suggestion });
}

