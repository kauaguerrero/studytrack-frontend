import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type ProfileRow = {
  role: string | null;
  organization_id: string | null;
};

type EssayRow = {
  id: string;
  student_id: string;
  status: 'pending' | 'corrected' | 'seen';
  submitted_at: string;
  corrected_at: string | null;
  total_score: number | null;
  text: string | null;
  theme?: string | null;
  essay_theme?: string | null;
  tema?: string | null;
  topic?: string | null;
  title?: string | null;
  [key: string]: unknown;
};

type StudentRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

function toBrtDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function startOfWeekBrtKey(): string {
  const todayKey = toBrtDateKey(new Date());
  const [y, m, d] = todayKey.split('-').map(Number);
  const utcDate = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  const weekDay = (utcDate.getUTCDay() + 6) % 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - weekDay);
  const yy = utcDate.getUTCFullYear();
  const mm = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utcDate.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

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
  const isAssociate = role === 'associate' || role === 'teacher';
  if (!isAdmin && !isFounder && !isAssociate) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if ((isFounder || isAssociate) && requester.organization_id !== org.id) {
    return NextResponse.json({ error: 'Acesso negado à organização.' }, { status: 403 });
  }

  const { data: essays, error: essaysError } = await admin
    .from('essays')
    .select('*')
    .eq('org_id', org.id)
    .order('submitted_at', { ascending: false })
    .limit(500);

  if (essaysError) {
    return NextResponse.json(
      {
        error: 'Não foi possível carregar redações.',
        details: process.env.NODE_ENV === 'development' ? essaysError.message : undefined,
      },
      { status: 500 },
    );
  }

  const list = (essays || []) as EssayRow[];
  const studentIds = Array.from(new Set(list.map((e) => e.student_id).filter(Boolean)));

  let studentsMap = new Map<string, StudentRow>();
  if (studentIds.length > 0) {
    const { data: students } = await admin
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', studentIds);
    studentsMap = new Map((students || []).map((s) => [s.id, s as StudentRow]));
  }

  const pendingItems = list
    .filter((e) => e.status === 'pending')
    .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());

  const allItems = list;

  const weekStart = startOfWeekBrtKey();
  const receivedWeek = list.filter((e) => toBrtDateKey(new Date(e.submitted_at)) >= weekStart).length;
  const pendingCount = list.filter((e) => e.status === 'pending').length;

  const scored = list.filter((e) => (e.status === 'corrected' || e.status === 'seen') && typeof e.total_score === 'number');
  const scores = scored.map((e) => Number(e.total_score || 0));
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const highestScore = scores.length ? Math.max(...scores) : null;
  const lowestScore = scores.length ? Math.min(...scores) : null;

  const byStudent = new Map<string, { sum: number; count: number; avatar_url: string | null; full_name: string | null; last_essay_at: string | null }>();
  scored.forEach((essay) => {
    const st = studentsMap.get(essay.student_id);
    const current = byStudent.get(essay.student_id);
    if (!current) {
      byStudent.set(essay.student_id, {
        sum: Number(essay.total_score || 0),
        count: 1,
        avatar_url: st?.avatar_url ?? null,
        full_name: st?.full_name ?? null,
        last_essay_at: essay.corrected_at || essay.submitted_at || null,
      });
      return;
    }
    current.sum += Number(essay.total_score || 0);
    current.count += 1;
    const prevTs = new Date(current.last_essay_at || 0).getTime();
    const nextTs = new Date(essay.corrected_at || essay.submitted_at || 0).getTime();
    if (nextTs > prevTs) current.last_essay_at = essay.corrected_at || essay.submitted_at || current.last_essay_at;
  });

  const ranking = Array.from(byStudent.entries())
    .map(([student_id, value]) => ({
      student_id,
      full_name: value.full_name,
      avatar_url: value.avatar_url,
      avg_score: value.count > 0 ? value.sum / value.count : 0,
      last_essay_at: value.last_essay_at,
    }))
    .sort((a, b) => b.avg_score - a.avg_score)
    .slice(0, 10);

  const hydrateEssay = (item: EssayRow) => {
    const student = studentsMap.get(item.student_id);
    return {
      ...item,
      text: item.text || '',
      student: {
        id: item.student_id,
        full_name: student?.full_name ?? null,
        email: student?.email ?? null,
        avatar_url: student?.avatar_url ?? null,
      },
      student_plan: null,
    };
  };

  return NextResponse.json({
    metrics: {
      received_week: receivedWeek,
      pending_count: pendingCount,
      avg_score: avgScore,
      highest_score: highestScore,
      lowest_score: lowestScore,
      ranking,
    },
    pending_items: pendingItems.map(hydrateEssay),
    all_items: allItems.map(hydrateEssay),
  });
}
