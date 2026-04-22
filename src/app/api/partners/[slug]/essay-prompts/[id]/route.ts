import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const admin = createAdminClient();
  const [{ data: org }, { data: profile }] = await Promise.all([
    (admin as any).from('organizations').select('id').eq('slug', slug).maybeSingle(),
    (admin as any).from('profiles').select('role, organization_id').eq('id', user.id).maybeSingle(),
  ]);

  if (!org) return NextResponse.json({ error: 'Org não encontrada' }, { status: 404 });

  const role = profile?.role ?? '';
  const isAdmin = role === 'admin';
  const isFounder = role === 'founder' && profile?.organization_id === org.id;
  if (!isAdmin && !isFounder) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await request.json();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.title !== undefined) update.title = String(body.title).trim();
  if (body.description !== undefined) update.description = body.description?.trim() || null;
  if (body.support_items !== undefined) update.support_items = Array.isArray(body.support_items) ? body.support_items : [];
  if (body.is_active !== undefined) update.is_active = Boolean(body.is_active);

  const { data, error } = await (admin as any)
    .from('essay_prompts')
    .update(update)
    .eq('id', id)
    .eq('org_id', org.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prompt: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const admin = createAdminClient();
  const [{ data: org }, { data: profile }] = await Promise.all([
    (admin as any).from('organizations').select('id').eq('slug', slug).maybeSingle(),
    (admin as any).from('profiles').select('role, organization_id').eq('id', user.id).maybeSingle(),
  ]);

  if (!org) return NextResponse.json({ error: 'Org não encontrada' }, { status: 404 });

  const role = profile?.role ?? '';
  const isAdmin = role === 'admin';
  const isFounder = role === 'founder' && profile?.organization_id === org.id;
  if (!isAdmin && !isFounder) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });

  const { count } = await (admin as any)
    .from('essay_prompt_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('prompt_id', id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Não é possível excluir: ${count} redação(ões) vinculada(s). Desative o tema em vez de excluir.` },
      { status: 409 },
    );
  }

  await (admin as any).from('essay_prompts').delete().eq('id', id).eq('org_id', org.id);
  return NextResponse.json({ ok: true });
}
