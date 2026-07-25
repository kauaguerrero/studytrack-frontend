import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type ProfileRow = {
  id: string;
  role: string | null;
  organization_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  associate_permissions: { can_correct?: boolean } | null;
};

type EssayRow = {
  id: string;
  org_id: string;
  status: string | null;
  second_corrector_id: string | null;
  correction_lock_user_id: string | null;
  correction_lock_at: string | null;
};

type LockRpcArgs = {
  p_essay_id: string;
  p_org_id: string;
  p_user_id: string;
  p_stale_after: string;
};

type LockRpcRow = {
  acquired: boolean;
  locked_by: string | null;
  locked_at: string | null;
};

type LockRpcClient = {
  rpc: (
    fn: 'acquire_essay_correction_lock',
    args: LockRpcArgs,
  ) => PromiseLike<{ data: LockRpcRow[] | LockRpcRow | null; error: { message: string } | null }>;
};

function canCorrect(profile: ProfileRow): boolean {
  const role = String(profile.role || '').toLowerCase();
  if (role === 'admin' || role === 'founder') return true;
  if (role === 'associate') return profile.associate_permissions?.can_correct !== false;
  return false;
}

function sameOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return null;
  try {
    if (new URL(origin).host !== host) {
      return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 });
  }
  return null;
}

async function authorize(slug: string, essayId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { ok: false as const, response: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }) };
  }

  const admin = createAdminClient();
  const [{ data: org }, { data: profile }] = await Promise.all([
    admin.from('organizations').select('id').eq('slug', slug).maybeSingle<{ id: string }>(),
    admin
      .from('profiles')
      .select('id, role, organization_id, full_name, avatar_url, associate_permissions')
      .eq('id', user.id)
      .maybeSingle<ProfileRow>(),
  ]);

  if (!org?.id) return { ok: false as const, response: NextResponse.json({ error: 'Organização não encontrada.' }, { status: 404 }) };
  if (!profile) return { ok: false as const, response: NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 403 }) };
  if (profile.role !== 'admin' && profile.organization_id !== org.id) {
    return { ok: false as const, response: NextResponse.json({ error: 'Acesso negado à organização.' }, { status: 403 }) };
  }
  if (!canCorrect(profile)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Sem permissão para corrigir redações.' }, { status: 403 }) };
  }

  const { data: essay } = await admin
    .from('essays')
    .select('id, org_id, status, second_corrector_id, correction_lock_user_id, correction_lock_at')
    .eq('id', essayId)
    .eq('org_id', org.id)
    .maybeSingle<EssayRow>();

  if (!essay) return { ok: false as const, response: NextResponse.json({ error: 'Redação não encontrada.' }, { status: 404 }) };
  if (essay.status !== 'pending' && essay.status !== 'awaiting_second') {
    return { ok: false as const, response: NextResponse.json({ error: 'Redação não está aguardando correção.' }, { status: 400 }) };
  }
  if (essay.status === 'awaiting_second' && essay.second_corrector_id && essay.second_corrector_id !== profile.id) {
    return { ok: false as const, response: NextResponse.json({ error: 'Esta segunda correção está alocada para outro corretor.' }, { status: 403 }) };
  }

  return { ok: true as const, admin, orgId: org.id, profile, essay };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string; essayId: string }> },
) {
  const originError = sameOrigin(request);
  if (originError) return originError;

  const { slug, essayId } = await context.params;
  const auth = await authorize(slug, essayId);
  if (!auth.ok) return auth.response;

  const lockClient = auth.admin as unknown as LockRpcClient;
  const { data, error } = await lockClient.rpc('acquire_essay_correction_lock', {
    p_essay_id: essayId,
    p_org_id: auth.orgId,
    p_user_id: auth.profile.id,
    p_stale_after: '90 seconds',
  });

  if (error) {
    return NextResponse.json({ error: 'Não foi possível bloquear a redação para correção.' }, { status: 500 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (row?.acquired) {
    return NextResponse.json({
      ok: true,
      lock: {
        user_id: auth.profile.id,
        full_name: auth.profile.full_name,
        avatar_url: auth.profile.avatar_url,
        locked_at: row.locked_at,
      },
    });
  }

  let lockedBy: { id: string; full_name: string | null; avatar_url: string | null } | null = null;
  if (row?.locked_by) {
    const { data: locker } = await auth.admin
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', row.locked_by)
      .maybeSingle<{ id: string; full_name: string | null; avatar_url: string | null }>();
    lockedBy = locker || null;
  }

  return NextResponse.json(
    {
      error: `${lockedBy?.full_name || 'Outro corretor'} já está corrigindo esta redação.`,
      locked_by: lockedBy,
      locked_at: row?.locked_at || null,
    },
    { status: 409 },
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string; essayId: string }> },
) {
  const originError = sameOrigin(request);
  if (originError) return originError;

  const { slug, essayId } = await context.params;
  const auth = await authorize(slug, essayId);
  if (!auth.ok) return auth.response;

  await auth.admin
    .from('essays')
    .update({ correction_lock_user_id: null, correction_lock_at: null } as never)
    .eq('id', essayId)
    .eq('org_id', auth.orgId)
    .eq('correction_lock_user_id', auth.profile.id);

  return NextResponse.json({ ok: true });
}
