import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  const { data: financialData } = body as { data: unknown };
  if (!financialData) {
    return NextResponse.json({ error: 'Campo data é obrigatório' }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_API_KEY não configurado' }, { status: 500 });
  }

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system:
      'Você é um analista financeiro de SaaS. Analise os dados e dê recomendações práticas em português, focando em redução de custos e crescimento de receita. Seja direto e objetivo, use markdown com headers e bullet points.',
    messages: [
      {
        role: 'user',
        content: `Dados financeiros do período:\n\n${JSON.stringify(financialData, null, 2)}`,
      },
    ],
  });

  const text = message.content.find((b) => b.type === 'text')?.text ?? '';
  return NextResponse.json({ analysis: text });
}
