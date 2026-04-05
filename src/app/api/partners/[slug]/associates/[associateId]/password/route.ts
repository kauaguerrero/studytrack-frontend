import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { randomInt } from 'node:crypto';

const ASSOCIATE_DB_ROLE = 'associate';
const LEGACY_ASSOCIATE_ROLE = 'teacher';
const CSRF_HEADER = 'x-studytrack-csrf';

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

  // Fisher-Yates para não vazar padrão da seed
  for (let i = seed.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i + 1);
    const tmp = seed[i];
    seed[i] = seed[j];
    seed[j] = tmp;
  }
  return seed.join('');
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string; associateId: string }> },
) {
  const originError = ensureSameOrigin(request);
  if (originError) return originError;
  const csrfError = ensureCsrfHeader(request);
  if (csrfError) return csrfError;

  const { slug, associateId } = await context.params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  let adminClient: ReturnType<typeof createAdminClient>;
  try {
    adminClient = createAdminClient();
  } catch (err) {
    const details = err instanceof Error ? err.message : 'Supabase Admin não configurado.';
    return NextResponse.json({ error: details }, { status: 500 });
  }

  const [{ data: requester }, { data: org }] = await Promise.all([
    adminClient
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .maybeSingle<{ role: string | null; organization_id: string | null }>(),
    adminClient
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle<{ id: string }>(),
  ]);

  if (!org?.id) {
    return NextResponse.json({ error: 'Organização não encontrada.' }, { status: 404 });
  }

  const requesterRole = requester?.role ?? '';
  const isAdmin = requesterRole === 'admin';
  const isFounder = requesterRole === 'founder';
  if (!isAdmin && !isFounder) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (isFounder && requester?.organization_id !== org.id) {
    return NextResponse.json({ error: 'Acesso negado à organização.' }, { status: 403 });
  }

  const { data: associate } = await adminClient
    .from('profiles')
    .select('id, role, organization_id, full_name, email')
    .eq('id', associateId)
    .maybeSingle<{ id: string; role: string | null; organization_id: string | null; full_name: string | null; email: string | null }>();

  if (!associate) {
    return NextResponse.json({ error: 'Associado não encontrado.' }, { status: 404 });
  }
  if (![ASSOCIATE_DB_ROLE, LEGACY_ASSOCIATE_ROLE].includes(associate.role || '')) {
    return NextResponse.json({ error: 'O usuário selecionado não é associado.' }, { status: 400 });
  }
  if (associate.organization_id !== org.id) {
    return NextResponse.json({ error: 'Associado não pertence a esta organização.' }, { status: 400 });
  }

  const temporaryPassword = generateTemporaryPassword(12);
  const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(associateId, {
    password: temporaryPassword,
  });
  if (updateAuthError) {
    return NextResponse.json({ error: 'Não foi possível atualizar a senha.' }, { status: 500 });
  }

  const { error: updateProfileError } = await adminClient
    .from('profiles')
    .update(({ must_change_password: true, updated_at: new Date().toISOString() } as never))
    .eq('id', associateId);
  if (updateProfileError) {
    return NextResponse.json({ error: 'Senha definida, mas não foi possível marcar troca obrigatória.' }, { status: 500 });
  }

  return NextResponse.json(
    {
      ok: true,
      temporary_password: temporaryPassword,
      associate: {
        id: associate.id,
        full_name: associate.full_name,
        email: associate.email,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
