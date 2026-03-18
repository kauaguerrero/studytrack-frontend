import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false as const, response: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) };
  }

  // Checa role via tabela profiles (RLS)
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileErr || profile?.role !== 'admin') {
    return { ok: false as const, response: NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 }) };
  }

  let supabaseAdmin: ReturnType<typeof createAdminClient>;
  try {
    supabaseAdmin = createAdminClient();
  } catch (e: any) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: 'Configuração do servidor inválida (Supabase Admin)',
          details: e?.message || String(e),
        },
        { status: 500 }
      ),
    };
  }

  return {
    ok: true as const,
    user,
    supabase,
    supabaseAdmin,
  };
}

