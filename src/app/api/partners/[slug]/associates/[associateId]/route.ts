import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ASSOCIATE_DB_ROLE = 'associate';
const CSRF_HEADER = 'x-studytrack-csrf';

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string; associateId: string }> },
) {
  const originError = ensureSameOrigin(request);
  if (originError) return originError;
  const csrfError = ensureCsrfHeader(request);
  if (csrfError) return csrfError;

  const { slug, associateId } = await context.params;
  const auth = await authorize(slug);
  if (!auth.ok) return auth.response;

  const profilesTable = auth.adminClient.from('profiles') as any;
  const { data: associate } = await profilesTable
    .select('id, role, organization_id')
    .eq('id', associateId)
    .maybeSingle() as { data: { id: string; role: string | null; organization_id: string | null } | null };

  if (!associate || associate.role !== ASSOCIATE_DB_ROLE || associate.organization_id !== auth.orgId) {
    return NextResponse.json({ error: 'Associado não encontrado nesta organização.' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({} as { active?: boolean; permissions?: { can_correct?: boolean; can_import?: boolean; can_view_students?: boolean } }));

  // Atualização de permissões
  if (body.permissions !== undefined) {
    const canCorrect = Boolean(body.permissions?.can_correct);
    const canImport = Boolean(body.permissions?.can_import);
    const canViewStudents = Boolean(body.permissions?.can_view_students);
    if (!canCorrect && !canImport && !canViewStudents) {
      return NextResponse.json({ error: 'O associate deve ter ao menos uma permissão ativa.' }, { status: 400 });
    }
    const { error } = await profilesTable
      .update({
        associate_permissions: { can_correct: canCorrect, can_import: canImport, can_view_students: canViewStudents },
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', associateId);
    if (error) {
      return NextResponse.json({ error: 'Não foi possível atualizar permissões.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // Ativar / desativar
  if (typeof body.active !== 'boolean') {
    return NextResponse.json({ error: 'Campo "active" ou "permissions" é obrigatório.' }, { status: 400 });
  }

  const { error } = await profilesTable
    .update({
      organization_id: body.active ? auth.orgId : null,
      role: associate.role || ASSOCIATE_DB_ROLE,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', associateId);

  if (error) {
    return NextResponse.json({ error: 'Não foi possível atualizar associado.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string; associateId: string }> },
) {
  const originError = ensureSameOrigin(request);
  if (originError) return originError;
  const csrfError = ensureCsrfHeader(request);
  if (csrfError) return csrfError;

  const { slug, associateId } = await context.params;
  const auth = await authorize(slug);
  if (!auth.ok) return auth.response;

  const profilesTable = auth.adminClient.from('profiles') as any;
  const { data: associate } = await profilesTable
    .select('id, role, organization_id')
    .eq('id', associateId)
    .maybeSingle() as { data: { id: string; role: string | null; organization_id: string | null } | null };

  if (!associate || associate.role !== ASSOCIATE_DB_ROLE || associate.organization_id !== auth.orgId) {
    return NextResponse.json({ error: 'Associado não encontrado nesta organização.' }, { status: 404 });
  }

  const { error } = await profilesTable
    .update({
      organization_id: null,
      role: associate.role || ASSOCIATE_DB_ROLE,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', associateId);

  if (error) {
    return NextResponse.json({ error: 'Não foi possível remover associado.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
