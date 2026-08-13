import { createClient } from '@/lib/supabase/server';
import { type EssayType } from '@/lib/essay-types';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import DesempenhoClient, {
  type AnalyticsResponse,
  type DashboardState,
  type EssayDetail,
  type EssayListItem,
} from './DesempenhoClient';
import { isDemoOrg, MOCK_STUDENT_DASHBOARD_STATE } from '../../../../../../studytrack-tutorial-mock';

export default async function DesempenhoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (isDemoOrg(slug)) {
    return (
      <ModuleGuard permKey="desempenho_enabled">
        <DesempenhoClient slug={slug} initialState={MOCK_STUDENT_DASHBOARD_STATE as unknown as DashboardState} />
      </ModuleGuard>
    );
  }

  const API = (process.env.API_URL || 'https://studytrack-backend.fly.dev').replace(/\/$/, '');

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  let initialState: DashboardState | null = null;

  if (session?.access_token) {
    const hdrs = { Authorization: `Bearer ${session.access_token}` };

    try {
      const [analyticsRes, essaysRes, summaryRes, rankingRes, simuladoRes] = await Promise.all([
        fetch(`${API}/api/student/analytics/dashboard`, { headers: hdrs, cache: 'no-store' }),
        fetch(`${API}/api/partners/${slug}/essays?status=all&essay_type=enem&page=1&limit=200`, { headers: hdrs, cache: 'no-store' }),
        fetch(`${API}/api/partner/gamification/summary`, { headers: hdrs, cache: 'no-store' }),
        fetch(`${API}/api/partner/gamification/ranking?limit=10`, { headers: hdrs, cache: 'no-store' }),
        fetch(`${API}/api/simulado/history?page=1&limit=12`, { headers: hdrs, cache: 'no-store' }),
      ]);

      const analytics: AnalyticsResponse = analyticsRes.ok
        ? await analyticsRes.json()
        : { overview: { total_questions: 0, accuracy_percentage: 0, current_streak: 0, total_xp: 0, total_simulados: 0 }, performance_by_subject: [], performance_by_topic: [], activity_history: [] };

      const essaysPayload = essaysRes.ok ? await essaysRes.json() : { items: [], credits: null };
      const summary = summaryRes.ok ? await summaryRes.json() : null;
      const ranking = rankingRes.ok ? await rankingRes.json() : null;
      const simuladoPayload = simuladoRes.ok ? await simuladoRes.json() : { sessions: [] };

      const essays: EssayListItem[] = (essaysPayload.items || []).map((item: {
        id: string;
        status: EssayListItem['status'];
        essay_type?: string | null;
        submitted_at: string;
        corrected_at: string | null;
        total_score: number | null;
        average_score?: number | null;
        theme?: string | null;
      }) => ({
        id: String(item.id),
        status: item.status,
        essay_type: String(item.essay_type || '').toLowerCase() === 'ufu'
          ? 'ufu'
          : String(item.essay_type || '').toLowerCase() === 'ueg'
            ? 'ueg'
            : 'enem',
        submitted_at: String(item.submitted_at),
        corrected_at: item.corrected_at ? String(item.corrected_at) : null,
        total_score: typeof item.total_score === 'number' ? item.total_score : null,
        average_score: typeof item.average_score === 'number' ? item.average_score : null,
        theme: typeof item.theme === 'string' ? item.theme : null,
      }));

      const correctedRecent = essays
        .filter((item) => {
          const score = item.status === 'second_corrected' && typeof item.average_score === 'number'
            ? item.average_score
            : item.total_score;
          return score != null && (item.status === 'corrected' || item.status === 'second_corrected' || item.status === 'seen');
        })
        .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());

      const detailResponses = await Promise.all(
        correctedRecent.map(async (essay) => {
          const r = await fetch(`${API}/api/partners/${slug}/essays/${essay.id}`, { headers: hdrs, cache: 'no-store' });
          if (!r.ok) return null;
          return r.json() as Promise<EssayDetail>;
        }),
      );

      const detailsById = new Map(
        detailResponses
          .filter((item): item is EssayDetail => Boolean(item))
          .map((item) => [item.id, item]),
      );

      const essaysWithNormalizedType = essays.map((essay) => {
        const detailType = String(detailsById.get(essay.id)?.essay_type || '').toLowerCase();
        const normalizedType: EssayType = detailType === 'ufu'
          ? 'ufu'
          : detailType === 'ueg'
            ? 'ueg'
            : essay.essay_type;
        return { ...essay, essay_type: normalizedType };
      });

      initialState = {
        analytics,
        essays: essaysWithNormalizedType,
        essayDetails: detailResponses
          .filter((item): item is EssayDetail => Boolean(item))
          .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()),
        summary,
        ranking,
        simuladoSessions: simuladoPayload.sessions || [],
        credits: essaysPayload.credits || null,
      };
    } catch {
      // fallback: client will fetch
    }
  }

  return (
    <ModuleGuard permKey="desempenho_enabled">
      <DesempenhoClient slug={slug} initialState={initialState} />
    </ModuleGuard>
  );
}
