import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const admin = createAdminClient();
  const db = admin as any;

  const { data, error } = await db
    .from('organizations')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ organization: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const url = new URL(request.url);
  const confirmName = url.searchParams.get('confirm_name') ?? '';

  const admin = createAdminClient();
  const db = admin as any;

  const { data: org, error: orgError } = await db
    .from('organizations')
    .select('id, name')
    .eq('id', id)
    .single();
  if (orgError || !org) {
    return NextResponse.json({ error: 'Organização não encontrada.' }, { status: 404 });
  }

  // Exige que o nome exato da organização seja digitado — última barreira
  // antes de uma exclusão irreversível de todos os dados dela.
  if (confirmName.trim() !== org.name) {
    return NextResponse.json(
      { error: 'Nome de confirmação não confere com o nome da organização.' },
      { status: 400 }
    );
  }

  // Ids dos perfis (alunos/founder) da org — usados pra apagar as contas de
  // autenticação deles depois que os dados no banco forem removidos.
  const { data: orgProfiles } = await db
    .from('profiles')
    .select('id')
    .eq('organization_id', id);
  const profileIds: string[] = (orgProfiles ?? []).map((p: { id: string }) => p.id);

  // Apaga a organização e TODOS os dados vinculados (perfis, respostas,
  // redações, whatsapp, gamificação, planos, leads, etc.) via função no
  // banco — ver migration 20260710_admin_delete_organization.sql.
  const { error: rpcError } = await db.rpc('admin_delete_organization', {
    target_org_id: id,
  });
  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  // Remove as contas de autenticação dos alunos/founder — best-effort, não
  // bloqueia a resposta se alguma falhar (ex: perfil sem auth.user real).
  await Promise.allSettled(
    profileIds.map((profileId) => db.auth.admin.deleteUser(profileId))
  );

  return NextResponse.json({ ok: true, deleted_profiles: profileIds.length });
}
