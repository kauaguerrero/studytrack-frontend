import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const admin = createAdminClient();
  const db = admin as any;

  if (body.mode === 'create') {
    const { full_name, email, password } = body;
    if (!full_name || !email || !password) {
      return NextResponse.json(
        { error: 'full_name, email e password obrigatórios' },
        { status: 400 }
      );
    }

    // Cria usuário no Supabase Auth
    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: 'founder' },
    });

    if (authErr || !authUser?.user) {
      return NextResponse.json(
        { error: authErr?.message ?? 'Erro ao criar usuário' },
        { status: 500 }
      );
    }

    // Atualiza profile gerado pelo trigger
    const { error: profileErr } = await db
      .from('profiles')
      .update({
        full_name,
        role: 'founder',
        organization_id: id,
        joined_organization_at: new Date().toISOString(),
      })
      .eq('id', authUser.user.id);

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, founder_id: authUser.user.id, email }, { status: 201 });
  }

  if (body.mode === 'link') {
    const { profile_id } = body;
    if (!profile_id) {
      return NextResponse.json({ error: 'profile_id obrigatório' }, { status: 400 });
    }

    const { error } = await db
      .from('profiles')
      .update({
        role: 'founder',
        organization_id: id,
        joined_organization_at: new Date().toISOString(),
      })
      .eq('id', profile_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'mode inválido. Use "create" ou "link"' }, { status: 400 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const admin = createAdminClient();
  const db = admin as any;

  // Busca o founder atual da org
  const { data: founder } = await db
    .from('profiles')
    .select('id')
    .eq('organization_id', id)
    .eq('role', 'founder')
    .maybeSingle();

  if (!founder) {
    return NextResponse.json({ error: 'Nenhum founder vinculado' }, { status: 404 });
  }

  const { error } = await db
    .from('profiles')
    .update({ role: 'student', organization_id: null })
    .eq('id', founder.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
