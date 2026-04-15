type AdminClient = any;

export type SprintStatus = 'active' | 'completed';

async function listSprintTasks(supabaseAdmin: AdminClient, sprintId: string) {
  const { data, error } = await supabaseAdmin
    .from('admin_sprint_tasks')
    .select(`
      id,
      sprint_id,
      task_id,
      created_at,
      task:admin_tasks(
        *,
        assignee:profiles!admin_tasks_assignee_id_fkey(id, full_name, avatar_url),
        co_assignee:profiles!admin_tasks_co_assignee_id_fkey(id, full_name, avatar_url)
      )
    `)
    .eq('sprint_id', sprintId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((row: any) => ({
    id: row.id,
    sprint_id: row.sprint_id,
    task_id: row.task_id,
    created_at: row.created_at,
    task: row.task,
  }));

  const taskIds = rows
    .map((row: any) => row.task_id)
    .filter((taskId: any) => typeof taskId === 'string');

  if (!taskIds.length) return rows;

  const { data: completions, error: completionError } = await supabaseAdmin
    .from('admin_task_completion')
    .select('*')
    .in('task_id', taskIds);

  if (completionError) throw new Error(completionError.message);

  const completionMap = new Map(
    (completions ?? []).map((completion: any) => [completion.task_id, completion])
  );

  return rows.map((row: any) => ({
    ...row,
    task: row.task
      ? {
          ...row.task,
          completion: completionMap.get(row.task_id) ?? null,
        }
      : row.task,
  }));
}

export async function getSprintDetail(supabaseAdmin: AdminClient, sprintId: string) {
  const { data: sprint, error } = await supabaseAdmin
    .from('admin_sprints')
    .select(`
      *,
      creator:profiles!admin_sprints_created_by_fkey(id, full_name, avatar_url)
    `)
    .eq('id', sprintId)
    .single();

  if (error || !sprint) return null;

  const tasks = await listSprintTasks(supabaseAdmin, sprintId);
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((item: any) => item.task?.status === 'done').length;

  return {
    ...sprint,
    tasks,
    total_tasks: totalTasks,
    completed_tasks: completedTasks,
    pending_tasks: totalTasks - completedTasks,
  };
}

export async function getActiveSprintDetail(supabaseAdmin: AdminClient) {
  const { data: activeSprint, error } = await supabaseAdmin
    .from('admin_sprints')
    .select('id')
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!activeSprint?.id) return null;
  return getSprintDetail(supabaseAdmin, activeSprint.id);
}
