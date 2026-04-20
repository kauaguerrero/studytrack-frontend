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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const admin = createAdminClient();
  const db = admin as any;

  // Bloqueia delete se houver perfis ou escolas vinculadas
  const [{ count: profileCount }, { count: schoolCount }] = await Promise.all([
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('organization_id', id),
    db.from('schools').select('id', { count: 'exact', head: true }).eq('organization_id', id),
  ]);

  const blockers: string[] = [];
  if (profileCount && profileCount > 0) blockers.push(`${profileCount} perfil(is)`);
  if (schoolCount && schoolCount > 0) blockers.push(`${schoolCount} escola(s)`);

  if (blockers.length > 0) {
    return NextResponse.json(
      { error: `Não é possível excluir: ${blockers.join(' e ')} vinculado(s).` },
      { status: 409 }
    );
  }

  const { error } = await db.from('organizations').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
