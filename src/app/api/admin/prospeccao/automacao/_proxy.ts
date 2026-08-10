import { NextResponse } from 'next/server';

const FLASK_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000';

/**
 * Proxy pro backend Flask (/api/admin/prospeccao/automacao/*) — usado pelas
 * rotas que precisam de lógica de servidor (salvar grafo de fluxo, handoff
 * cruzando sessões/leads/nós). Rotas de CRUD simples (ex. worker/) falam
 * direto com o Supabase, sem passar por aqui.
 */
export async function proxyToFlask(
  path: string,
  token: string | null,
  init?: { method?: string; body?: unknown }
) {
  const upstream = await fetch(`${FLASK_BASE}/api/admin/prospeccao/automacao${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
