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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string; associateId: string }> },
) {
  const { slug, associateId } = await context.params;
  const auth = await authorize(slug);
  if (!auth.ok) return auth.response;

  const { data: associate } = await auth.adminClient
    .from('profiles')
    .select('id, role, organization_id')
    .eq('id', associateId)
    .maybeSingle<{ id: string; role: string | null; organization_id: string | null }>();

  if (!associate || ![ASSOCIATE_DB_ROLE, LEGACY_ASSOCIATE_ROLE].includes(associate.role || '') || associate.organization_id !== auth.orgId) {
    return NextResponse.json({ error: 'Associado não encontrado nesta organização.' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({} as { active?: boolean }));
  if (typeof body.active !== 'boolean') {
    return NextResponse.json({ error: 'Campo "active" inválido.' }, { status: 400 });
  }

  const { error } = await auth.adminClient
    .from('profiles')
    .update({
      organization_id: body.active ? auth.orgId : null,
      role: associate.role || ASSOCIATE_DB_ROLE,
      updated_at: new Date().toISOString(),
    })
    .eq('id', associateId);

  if (error) {
    return NextResponse.json({ error: 'Não foi possível atualizar associado.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ slug: string; associateId: string }> },
) {
  const { slug, associateId } = await context.params;
  const auth = await authorize(slug);
  if (!auth.ok) return auth.response;

  const { data: associate } = await auth.adminClient
    .from('profiles')
    .select('id, role, organization_id')
    .eq('id', associateId)
    .maybeSingle<{ id: string; role: string | null; organization_id: string | null }>();

  if (!associate || ![ASSOCIATE_DB_ROLE, LEGACY_ASSOCIATE_ROLE].includes(associate.role || '') || associate.organization_id !== auth.orgId) {
    return NextResponse.json({ error: 'Associado não encontrado nesta organização.' }, { status: 404 });
  }

  const { error } = await auth.adminClient
    .from('profiles')
    .update({
      organization_id: null,
      role: associate.role || ASSOCIATE_DB_ROLE,
      updated_at: new Date().toISOString(),
    })
    .eq('id', associateId);

  if (error) {
    return NextResponse.json({ error: 'Não foi possível remover associado.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
