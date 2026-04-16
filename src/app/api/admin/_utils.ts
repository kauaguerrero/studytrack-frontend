import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { UserRole } from '@/types/roles';

type AdminClient = ReturnType<typeof createAdminClient>;
type TaskAccessRole = Extract<UserRole, 'admin' | 'dev'>;

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
    { data: blockEvents },
    { data: reopenEvents },
    { data: sprintLink },
  ] = await Promise.all([
    db.from('admin_task_progress').select('*').eq('task_id', taskId).maybeSingle(),
    db.from('admin_task_completion').select('*').eq('task_id', taskId).maybeSingle(),
    db
      .from('admin_task_history')
      .select('*, changer:profiles!admin_task_history_changed_by_fkey(full_name)')
      .eq('task_id', taskId)
      .order('changed_at', { ascending: true }),
    db
      .from('admin_task_block_events')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true }),
    db
      .from('admin_task_reopen_events')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true }),
    db
      .from('admin_sprint_tasks')
      .select('sprint:admin_sprints(id, goal, status, start_date, end_date)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    ...(task as Record<string, unknown>),
    progress: progress ?? null,
    completion: completion ?? null,
    history: history ?? [],
    block_events: blockEvents ?? [],
    reopen_events: reopenEvents ?? [],
    active_sprint: sprintLink?.sprint ?? null,
  };
}

async function resolveUserRole() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }),
    };
  }

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: UserRole | null }>();

  if (profileErr || !profile?.role) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 }),
    };
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
    role: profile.role,
    supabase,
    supabaseAdmin,
    token: session?.access_token ?? null,
  };
}

export async function requireAdmin() {
  const auth = await resolveUserRole();
  if (!auth.ok) return auth;
  if (auth.role !== 'admin') {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 }),
    };
  }
  return auth;
}

export async function requireTaskAccess(options?: { adminOnly?: boolean }) {
  const auth = await resolveUserRole();
  if (!auth.ok) return auth;

  if (options?.adminOnly) {
    if (auth.role !== 'admin') {
      return {
        ok: false as const,
        response: NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 }),
      };
    }
    return auth as typeof auth & { role: 'admin' };
  }

  if (auth.role !== 'admin' && auth.role !== 'dev') {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Acesso restrito ao workspace operacional de tasks' }, { status: 403 }),
    };
  }

  return auth as typeof auth & { role: TaskAccessRole };
}
