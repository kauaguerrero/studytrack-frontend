import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { createAdminClient } from '@/lib/supabase/admin';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Cria manualmente uma conta (founder ou student) já vinculada a esta
// organização — usado pelo botão "Criar usuário" nos cards de parceiro do
// painel /portal/admin, para suporte/onboarding/testes sem depender do
// fluxo de convite.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id: orgId } = await params;
  const body = await request.json().catch(() => ({}));
  const role = body.role === 'founder' ? 'founder' : body.role === 'student' ? 'student' : null;
  const fullName = (body.full_name || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  if (!role) {
    return NextResponse.json({ error: 'role deve ser "founder" ou "student".' }, { status: 400 });
  }
  if (!fullName || !email || !password) {
    return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios.' }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'A senha deve ter no mínimo 8 caracteres.' }, { status: 400 });
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  const { data: org, error: orgError } = await db
    .from('organizations')
    .select('id, plan_tier')
    .eq('id', orgId)
    .single();
  if (orgError || !org) {
    return NextResponse.json({ error: 'Organização não encontrada.' }, { status: 404 });
  }

  const { data: existing } = await db.from('profiles').select('id').eq('email', email).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'Já existe uma conta com esse e-mail.' }, { status: 409 });
  }

  const { data: created, error: createError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });
  if (createError || !created?.user) {
    const message = String(createError?.message || '');
    if (message.toLowerCase().includes('already registered') || message.toLowerCase().includes('already exists')) {
      return NextResponse.json({ error: 'Já existe uma conta com esse e-mail.' }, { status: 409 });
    }
    return NextResponse.json({ error: message || 'Erro ao criar conta.' }, { status: 500 });
  }

  const userId = created.user.id;
  const planTier = role === 'founder' ? 'free' : (org.plan_tier === 'b2b_pro' ? 'b2b_pro' : 'b2b_student');

  const { data: profile, error: profileError } = await db
    .from('profiles')
    .upsert({
      id: userId,
      full_name: fullName,
      email,
      role,
      organization_id: orgId,
      plan_tier: planTier,
      subscription_status: 'active',
      public_profile: false,
      onboarding_completed: role === 'founder',
      joined_organization_at: new Date().toISOString(),
    })
    .select('id, full_name, email, role, organization_id')
    .single();

  if (profileError) {
    // Conta de auth já foi criada — não deixa órfã sem tentar reverter.
    await db.auth.admin.deleteUser(userId).catch(() => {});
    return NextResponse.json({ error: 'Erro ao vincular perfil. Tente novamente.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, user: profile }, { status: 201 });
}
