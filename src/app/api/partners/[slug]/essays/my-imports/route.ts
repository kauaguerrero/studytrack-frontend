import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type ProfileRow = { role: string | null; organization_id: string | null };

type EssayRow = {
  id: string;
  theme: string | null;
  essay_type: string | null;
  status: string | null;
  total_score: number | null;
  submitted_at: string;
  imported_at: string | null;
  historical_date: string | null;
  historical_file_url: string | null;
  student: { id: string; full_name: string | null; email: string | null } | null;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

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

  const [profileRes, orgRes] = await Promise.all([
    adminClient.from('profiles').select('role, organization_id').eq('id', user.id).maybeSingle(),
    adminClient.from('organizations').select('id').eq('slug', slug).maybeSingle(),
  ]);
  const profile = profileRes.data as ProfileRow | null;
  const org = orgRes.data as { id: string } | null;

  if (!org?.id) {
    return NextResponse.json({ error: 'Organização não encontrada.' }, { status: 404 });
  }

  const role = profile?.role ?? '';
  if (role !== 'associate') {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (profile?.organization_id !== org.id) {
    return NextResponse.json({ error: 'Acesso negado à organização.' }, { status: 403 });
  }

  const { data, error } = await adminClient
    .from('essays')
    .select(`
      id, theme, essay_type, status, total_score, submitted_at,
      imported_at, historical_date, historical_file_url,
      student:profiles!essays_student_id_fkey(id, full_name, email)
    `)
    .eq('org_id', org.id)
    .eq('imported_by', user.id)
    .eq('is_historical', true)
    .order('imported_at', { ascending: false, nullsFirst: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: 'Não foi possível carregar importações.' }, { status: 500 });
  }

  return NextResponse.json({ essays: (data ?? []) as EssayRow[] });
}
