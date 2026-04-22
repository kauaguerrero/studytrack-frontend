import { createClient } from '@/lib/supabase/server';
import FounderDashboardClient from './FounderDashboardClient';

interface OrgStats {
  total_students: number;
  prev_active_today: number;
  prev_active_week: number;
  prev_active_month: number;
  prev_questions_today: number;
  prev_questions_week: number;
  prev_questions_month: number;
  prev_simulados_today: number;
  prev_simulados_week: number;
  prev_simulados_month: number;
  active_today: number;
  active_week: number;
  active_month: number;
  active_total: number;
  questions_today: number;
  questions_week: number;
  questions_month: number;
  questions_total: number;
  simulados_today: number;
  simulados_week: number;
  simulados_month: number;
  simulados_total: number;
  plan_distribution: Record<string, number>;
  associates_count?: number;
}

interface Student {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  plan_tier: string;
  plan_id?: string | null;
  plan_name?: string | null;
  plan_price_cents?: number | null;
  plan_duration_days?: number | null;
  plan_last_payment_at?: string | null;
  essay_credits_remaining?: number | null;
  essay_credits_limit?: number | null;
  essay_credits_period?: 'week' | 'month' | null;
  last_activity_date: string | null;
  questions_today: number;
  questions_week: number;
  questions_month: number;
  questions_total: number;
  simulados_today: number;
  simulados_week: number;
  simulados_month: number;
  simulados_total: number;
  accuracy_pct: number | null;
}

export default async function FounderDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const API = (process.env.API_URL || 'https://studytrack-backend.fly.dev').replace(/\/$/, '');

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  let initialStats: OrgStats | null = null;
  let initialEssaysCounts: { today: number; week: number; month: number; total: number } | null = null;
  let initialStudents: Student[] = [];
  let initialStudentsTotal = 0;

  if (session?.access_token) {
    const headers = { Authorization: `Bearer ${session.access_token}` };
    try {
      const [resStats, resEssaysCount, resStudents] = await Promise.all([
        fetch(`${API}/api/partners/${slug}/stats`, { headers, cache: 'no-store' }),
        fetch(`${API}/api/partners/${slug}/essays/count`, { headers, cache: 'no-store' }),
        fetch(`${API}/api/partners/${slug}/students?limit=100&page=1&sort=full_name&order=asc`, { headers, cache: 'no-store' }),
      ]);

      if (resStats.ok) initialStats = await resStats.json();
      if (resEssaysCount.ok) initialEssaysCounts = await resEssaysCount.json();
      if (resStudents.ok) {
        const payload = await resStudents.json();
        initialStudents = Array.isArray(payload?.students) ? payload.students : [];
        initialStudentsTotal = Number(payload?.total || 0);
      }
    } catch {
      // client will fetch as fallback
    }
  }

  return (
    <FounderDashboardClient
      slug={slug}
      initialStats={initialStats}
      initialStudents={initialStudents}
      initialStudentsTotal={initialStudentsTotal}
      initialEssaysCounts={initialEssaysCounts}
    />
  );
}
