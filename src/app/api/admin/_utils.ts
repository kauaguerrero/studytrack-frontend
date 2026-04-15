import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

export async function recordHistory(
  supabaseAdmin: AdminClient,
  taskId: string,
  changedBy: string,
  field: string,
  oldValue: unknown,
  newValue: unknown
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any).from('admin_task_history').insert({
      task_id: taskId,
      changed_by: changedBy,
      field_changed: field,
      old_value: oldValue != null ? String(oldValue) : null,
      new_value: newValue != null ? String(newValue) : null,
    });
  } catch {
    // fire-and-forget — non-critical
  }
}

export async function getTaskDetail(supabaseAdmin: AdminClient, taskId: string) {
  const { data: task, error } = await supabaseAdmin
    .from('admin_tasks')
    .select(`
      *,
      assignee:profiles!admin_tasks_assignee_id_fkey(id, full_name, avatar_url),
      co_assignee:profiles!admin_tasks_co_assignee_id_fkey(id, full_name, avatar_url),
      creator:profiles!admin_tasks_created_by_fkey(id, full_name, avatar_url)
    `)
    .eq('id', taskId)
    .single();

  if (error || !task) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any;
  const [
    { data: progress },
    { data: completion },
    { data: history },
  ] = await Promise.all([
    db.from('admin_task_progress').select('*').eq('task_id', taskId).maybeSingle(),
    db.from('admin_task_completion').select('*').eq('task_id', taskId).maybeSingle(),
    db
      .from('admin_task_history')
      .select('*, changer:profiles!admin_task_history_changed_by_fkey(full_name)')
      .eq('task_id', taskId)
      .order('changed_at', { ascending: true }),
  ]);

  return {
    ...(task as Record<string, unknown>),
    progress: progress ?? null,
    completion: completion ?? null,
    history: history ?? [],
  };
}

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

  const { data: { session } } = await supabase.auth.getSession();

  return {
    ok: true as const,
    user,
    supabase,
    supabaseAdmin,
    token: session?.access_token ?? null,
  };
}

export async function requireAdminOrDev() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { ok: false as const, response: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) };
  }
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const role = profile?.role;
  if (profileErr || (role !== 'admin' && role !== 'dev')) {
    return { ok: false as const, response: NextResponse.json({ error: 'Acesso restrito' }, { status: 403 }) };
  }
  let supabaseAdmin: ReturnType<typeof createAdminClient>;
  try {
    supabaseAdmin = createAdminClient();
  } catch (e: any) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'Configuração do servidor inválida (Supabase Admin)', details: e?.message || String(e) },
        { status: 500 }
      ),
    };
  }
  const { data: { session } } = await supabase.auth.getSession();
  return {
    ok: true as const,
    user,
    supabase,
    supabaseAdmin,
    token: session?.access_token ?? null,
  };
}

