import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type ProfileRow = {
  role: string | null;
  organization_id: string | null;
};

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string; essayId: string }> },
) {
  const originError = ensureSameOrigin(request);
  if (originError) return originError;

  const { slug, essayId } = await context.params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const admin = createAdminClient();
  const [{ data: org }, { data: requester }] = await Promise.all([
    admin.from('organizations').select('id').eq('slug', slug).maybeSingle<{ id: string }>(),
    admin.from('profiles').select('role, organization_id').eq('id', user.id).maybeSingle<ProfileRow>(),
  ]);

  if (!org?.id) return NextResponse.json({ error: 'Organização não encontrada.' }, { status: 404 });
  if (!requester) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 403 });

  const role = String(requester.role || '').toLowerCase();
  const isAdmin = role === 'admin';
  const isFounder = role === 'founder';
  if (!isAdmin && !isFounder) {
    return NextResponse.json({ error: 'Apenas founder/admin podem arquivar redações.' }, { status: 403 });
  }
  if (!isAdmin && requester.organization_id !== org.id) {
    return NextResponse.json({ error: 'Acesso negado à organização.' }, { status: 403 });
  }

  const { data: essay } = await admin
    .from('essays')
    .select('id, status')
    .eq('id', essayId)
    .eq('org_id', org.id)
    .maybeSingle<{ id: string; status: string | null }>();
  if (!essay) return NextResponse.json({ error: 'Redação não encontrada.' }, { status: 404 });
  if (essay.status === 'pending') {
    return NextResponse.json({ error: 'Somente redações corrigidas podem ser arquivadas.' }, { status: 400 });
  }

  const { error } = await admin
    .from('essays')
    .update({ status: 'seen', seen_at: new Date().toISOString() })
    .eq('id', essayId)
    .eq('org_id', org.id);

  if (error) {
    return NextResponse.json(
      {
        error: 'Falha ao arquivar redação.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
