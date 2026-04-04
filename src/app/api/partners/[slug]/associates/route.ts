import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ASSOCIATE_DB_ROLE = 'associate';
const LEGACY_ASSOCIATE_ROLE = 'teacher';

type RequesterRow = {
  role: string | null;
  organization_id: string | null;
};

async function authorize(slug: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { ok: false as const, response: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }) };
  }

  let adminClient: ReturnType<typeof createAdminClient>;
  try {
    adminClient = createAdminClient();
  } catch (err) {
    const details = err instanceof Error ? err.message : 'Supabase Admin não configurado.';
    return { ok: false as const, response: NextResponse.json({ error: details }, { status: 500 }) };
  }

  const [{ data: requester }, { data: org }] = await Promise.all([
    adminClient
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .maybeSingle<RequesterRow>(),
    adminClient
      .from('organizations')
      .select('id, slug')
      .eq('slug', slug)
      .maybeSingle<{ id: string; slug: string }>(),
  ]);

  if (!org?.id) {
    return { ok: false as const, response: NextResponse.json({ error: 'Organização não encontrada.' }, { status: 404 }) };
  }

  const role = requester?.role ?? '';
  const isAdmin = role === 'admin';
  const isFounder = role === 'founder';
  if (!isAdmin && !isFounder) {
    return { ok: false as const, response: NextResponse.json({ error: 'Acesso negado.' }, { status: 403 }) };
  }
  if (isFounder && requester?.organization_id !== org.id) {
    return { ok: false as const, response: NextResponse.json({ error: 'Acesso negado à organização.' }, { status: 403 }) };
  }

  return { ok: true as const, adminClient, orgId: org.id };
}

function generateTemporaryPassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const nums = '23456789';
  const symbols = '!@#$%&*?';
  const all = upper + lower + nums + symbols;

  const pick = (source: string) => source[Math.floor(Math.random() * source.length)];
  const seed = [pick(upper), pick(lower), pick(nums), pick(symbols)];
  while (seed.length < length) seed.push(pick(all));
  for (let i = seed.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = seed[i];
    seed[i] = seed[j];
    seed[j] = tmp;
  }
  return seed.join('');
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const auth = await authorize(slug);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.adminClient
    .from('profiles')
    .select('id, full_name, email, avatar_url, organization_id')
    .eq('organization_id', auth.orgId)
    .in('role', [ASSOCIATE_DB_ROLE, LEGACY_ASSOCIATE_ROLE])
    .order('full_name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Não foi possível listar associados.' }, { status: 500 });
  }

  const associates = (data || []).map((item) => ({
    id: item.id,
    full_name: item.full_name,
    email: item.email,
    avatar_url: item.avatar_url,
    active: item.organization_id === auth.orgId,
  }));

  return NextResponse.json({
    total: associates.length,
    associates,
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const auth = await authorize(slug);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({} as { full_name?: string; email?: string }));
  const fullName = String(body.full_name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();

  if (!fullName) {
    return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });
  }
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
  }

  const temporaryPassword = generateTemporaryPassword();

  const createRes = await auth.adminClient.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: ASSOCIATE_DB_ROLE,
      organization_id: auth.orgId,
    },
  });

  if (createRes.error || !createRes.data.user) {
    return NextResponse.json(
      { error: createRes.error?.message || 'Não foi possível criar associado.' },
      { status: 400 },
    );
  }

  const associateId = createRes.data.user.id;
  const baseProfilePayload = {
    full_name: fullName,
    email,
    role: ASSOCIATE_DB_ROLE,
    organization_id: auth.orgId,
    must_change_password: true,
    updated_at: new Date().toISOString(),
  };

  // 1) Tenta atualizar perfil existente (caso trigger já tenha criado).
  const { error: updateProfileError } = await auth.adminClient
    .from('profiles')
    .update(baseProfilePayload)
    .eq('id', associateId);

  if (updateProfileError) {
    await auth.adminClient.auth.admin.deleteUser(associateId);
    const raw = String(updateProfileError.message || '');
    if (raw.toLowerCase().includes('profiles_role_check')) {
      return NextResponse.json(
        { error: 'O banco ainda não aceita role "associate" em profiles.role. Atualize a constraint profiles_role_check no backend.' },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: `Falha ao atualizar perfil do associado: ${updateProfileError.message}` },
      { status: 500 },
    );
  }

  // 2) Se não existir perfil, cria explicitamente.
  const { data: profileExists, error: checkProfileError } = await auth.adminClient
    .from('profiles')
    .select('id')
    .eq('id', associateId)
    .maybeSingle<{ id: string }>();

  if (checkProfileError) {
    await auth.adminClient.auth.admin.deleteUser(associateId);
    return NextResponse.json(
      { error: `Falha ao validar perfil do associado: ${checkProfileError.message}` },
      { status: 500 },
    );
  }

  if (!profileExists?.id) {
    const { error: insertProfileError } = await auth.adminClient
      .from('profiles')
      .insert({
        id: associateId,
        ...baseProfilePayload,
      });

    if (insertProfileError) {
      await auth.adminClient.auth.admin.deleteUser(associateId);
      const raw = String(insertProfileError.message || '');
      if (raw.toLowerCase().includes('profiles_role_check')) {
        return NextResponse.json(
          { error: 'O banco ainda não aceita role "associate" em profiles.role. Atualize a constraint profiles_role_check no backend.' },
          { status: 500 },
        );
      }
      return NextResponse.json(
        { error: `Falha ao criar perfil do associado: ${insertProfileError.message}` },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    associate: {
      id: associateId,
      full_name: fullName,
      email,
      active: true,
    },
  });
}
