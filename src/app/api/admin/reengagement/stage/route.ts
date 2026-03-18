import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

const STAGES = new Set([
  'nao_abordado',
  'abordado',
  'oferta_feita',
  'oferta_especial',
  'convertido',
  'perdido',
]);

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const supabaseAdmin = auth.supabaseAdmin as any;

  const { userId, conversion_stage } = (await request.json().catch(() => ({}))) as { userId?: string; conversion_stage?: string };
  if (!userId || !conversion_stage || !STAGES.has(conversion_stage)) {
    return NextResponse.json({ error: 'Parâmetros inválidos: { userId, conversion_stage }' }, { status: 400 });
  }

  const { data: existing, error: e1 } = await supabaseAdmin
    .from('profiles')
    .select('conversion_stage')
    .eq('id', userId)
    .maybeSingle();

  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  const oldStage = (existing?.conversion_stage as string | null) ?? 'nao_abordado';

  const { error: e2 } = await supabaseAdmin
    .from('profiles')
    .update({ conversion_stage })
    .eq('id', userId);

  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  try {
    await supabaseAdmin.from('admin_actions_log').insert({
      user_id: userId,
      admin_id: auth.user.id,
      action_type: 'stage_updated',
      payload: { old_stage: oldStage, new_stage: conversion_stage },
    });
  } catch {
    // fail-open
  }

  return NextResponse.json({ ok: true, old_stage: oldStage, new_stage: conversion_stage });
}

