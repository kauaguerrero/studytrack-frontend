import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { randomInt } from 'node:crypto';

const ASSOCIATE_DB_ROLE = 'associate';
const CSRF_HEADER = 'x-studytrack-csrf';

type RequesterRow = {
  role: string | null;
  organization_id: string | null;
};

type AssociatePermissions = {
  can_correct?: boolean;
  can_import?: boolean;
  can_view_students?: boolean;
};

type AssociateListRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  organization_id: string | null;
  associate_permissions: AssociatePermissions | null;
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

  const profilesTable = adminClient.from('profiles') as any;
  const organizationsTable = adminClient.from('organizations') as any;

  const [{ data: requester }, { data: org }] = await Promise.all([
    profilesTable
      .select('role, organization_id')
      .eq('id', user.id)
      .maybeSingle(),
    organizationsTable
      .select('id, slug')
      .eq('slug', slug)
      .maybeSingle(),
  ]) as [{ data: RequesterRow | null }, { data: { id: string; slug: string } | null }];

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

function ensureSameOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return null;
  try {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 });
  }
  return null;
}

function ensureCsrfHeader(request: Request): NextResponse | null {
  if (request.headers.get(CSRF_HEADER) !== '1') {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 403 });
  }
  return null;
}

function generateTemporaryPassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const nums = '23456789';
  const symbols = '!@#$%&*?';
  const all = upper + lower + nums + symbols;

  const pick = (source: string) => source[randomInt(0, source.length)];
  const seed = [pick(upper), pick(lower), pick(nums), pick(symbols)];
  while (seed.length < length) seed.push(pick(all));
  for (let i = seed.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i + 1);
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

  const profilesTable = auth.adminClient.from('profiles') as any;
  const { data, error } = await profilesTable
    .select('id, full_name, email, avatar_url, organization_id, associate_permissions')
    .eq('organization_id', auth.orgId)
    .eq('role', ASSOCIATE_DB_ROLE)
    .order('full_name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Não foi possível listar associados.' }, { status: 500 });
  }

  const associates = ((data || []) as AssociateListRow[]).map((item) => {
    const rawPerms = item.associate_permissions || {};
    return {
      id: item.id,
      full_name: item.full_name,
      email: item.email,
      avatar_url: item.avatar_url,
      active: item.organization_id === auth.orgId,
      associate_permissions: {
        can_correct: rawPerms.can_correct !== false,  // default true (legado)
        can_import: rawPerms.can_import === true,     // default false
        can_view_students: rawPerms.can_view_students === true, // default false
      },
    };
  });

  return NextResponse.json({
    total: associates.length,
    associates,
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const originError = ensureSameOrigin(request);
  if (originError) return originError;
  const csrfError = ensureCsrfHeader(request);
  if (csrfError) return csrfError;

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
    associate_permissions: { can_correct: true, can_import: false, can_view_students: false },
    must_change_password: true,
    updated_at: new Date().toISOString(),
  };

  // 1) Tenta atualizar perfil existente (caso trigger já tenha criado).
  const profilesTable = auth.adminClient.from('profiles') as any;
  const { error: updateProfileError } = await profilesTable
    .update(baseProfilePayload)
    .eq('id', associateId);

  if (updateProfileError) {
    console.error('[Partners associates] updateProfileError', updateProfileError);
    await auth.adminClient.auth.admin.deleteUser(associateId);
    const raw = String(updateProfileError.message || '');
    if (raw.toLowerCase().includes('profiles_role_check')) {
      return NextResponse.json(
        { error: 'O banco ainda não aceita role "associate" em profiles.role. Atualize a constraint profiles_role_check no backend.' },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: 'Falha ao atualizar perfil do associado.' },
      { status: 500 },
    );
  }

  // 2) Se não existir perfil, cria explicitamente.
  const { data: profileExists, error: checkProfileError } = await profilesTable
    .select('id')
    .eq('id', associateId)
    .maybeSingle() as { data: { id: string } | null; error: { message?: string } | null };

  if (checkProfileError) {
    console.error('[Partners associates] checkProfileError', checkProfileError);
    await auth.adminClient.auth.admin.deleteUser(associateId);
    return NextResponse.json(
      { error: 'Falha ao validar perfil do associado.' },
      { status: 500 },
    );
  }

  if (!profileExists?.id) {
    const { error: insertProfileError } = await profilesTable
      .insert({
        id: associateId,
        ...baseProfilePayload,
      } as never);

    if (insertProfileError) {
      console.error('[Partners associates] insertProfileError', insertProfileError);
      await auth.adminClient.auth.admin.deleteUser(associateId);
      const raw = String(insertProfileError.message || '');
      if (raw.toLowerCase().includes('profiles_role_check')) {
        return NextResponse.json(
          { error: 'O banco ainda não aceita role "associate" em profiles.role. Atualize a constraint profiles_role_check no backend.' },
          { status: 500 },
        );
      }
      return NextResponse.json(
        { error: 'Falha ao criar perfil do associado.' },
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
