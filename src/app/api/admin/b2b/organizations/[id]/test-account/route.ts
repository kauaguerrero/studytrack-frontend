import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { createAdminClient } from '@/lib/supabase/admin';

function resolveDefaultStudentTier(orgPlanTier: string | null | undefined): 'b2b_student' | 'b2b_pro' {
  return orgPlanTier === 'b2b_pro' ? 'b2b_pro' : 'b2b_student';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id: orgId } = await params;
  const search = (new URL(request.url).searchParams.get('search') ?? '').trim();

  const admin = createAdminClient();
  const db = admin as any;

  let query = db
    .from('profiles')
    .select('id, full_name, email, avatar_url, plan_tier')
    .eq('organization_id', orgId)
    .eq('role', 'student')
    .order('full_name', { ascending: true })
    .limit(100);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const accounts = (data ?? []).map((row: any) => ({
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    avatar_url: row.avatar_url,
    plan_tier: row.plan_tier,
    is_test_account: row.plan_tier === 'b2b_test',
  }));

  const selected = accounts.find((a: any) => a.is_test_account);

  return NextResponse.json({
    accounts,
    selected_profile_id: selected?.id ?? null,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id: orgId } = await params;
  const body = await request.json();
  const profileId = typeof body?.profile_id === 'string' ? body.profile_id : '';

  if (!profileId) {
    return NextResponse.json({ error: 'profile_id obrigatório' }, { status: 400 });
  }

  const admin = createAdminClient();
  const db = admin as any;

  const { data: org, error: orgErr } = await db
    .from('organizations')
    .select('id, plan_tier')
    .eq('id', orgId)
    .single();

  if (orgErr || !org) {
    return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 });
  }

  const defaultTier = resolveDefaultStudentTier(org.plan_tier);

  const { data: candidate, error: candidateErr } = await db
    .from('profiles')
    .select('id')
    .eq('id', profileId)
    .eq('organization_id', orgId)
    .eq('role', 'student')
    .maybeSingle();

  if (candidateErr) return NextResponse.json({ error: candidateErr.message }, { status: 500 });
  if (!candidate) return NextResponse.json({ error: 'Aluno não encontrado nessa organização' }, { status: 404 });

  const { error: clearErr } = await db
    .from('profiles')
    .update({ plan_tier: defaultTier })
    .eq('organization_id', orgId)
    .eq('role', 'student')
    .eq('plan_tier', 'b2b_test');

  if (clearErr) return NextResponse.json({ error: clearErr.message }, { status: 500 });

  const { error: setErr } = await db
    .from('profiles')
    .update({ plan_tier: 'b2b_test' })
    .eq('id', profileId)
    .eq('organization_id', orgId)
    .eq('role', 'student');

  if (setErr) return NextResponse.json({ error: setErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, profile_id: profileId });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id: orgId } = await params;

  const admin = createAdminClient();
  const db = admin as any;

  const { data: org, error: orgErr } = await db
    .from('organizations')
    .select('id, plan_tier')
    .eq('id', orgId)
    .single();

  if (orgErr || !org) {
    return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 });
  }

  const defaultTier = resolveDefaultStudentTier(org.plan_tier);

  const { error } = await db
    .from('profiles')
    .update({ plan_tier: defaultTier })
    .eq('organization_id', orgId)
    .eq('role', 'student')
    .eq('plan_tier', 'b2b_test');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
