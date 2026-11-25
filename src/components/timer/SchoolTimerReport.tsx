'use client';

// Coordenação: tempo de estudo (timer) por aluno e por matéria, com filtro de turma.

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Timer as TimerIcon } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { useOrgClasses } from '@/lib/org-classes';
import { formatDuration, timerFetch, type OrgTimerReport } from '@/lib/timer';

const sel = 'rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-white/10 dark:bg-white/5 dark:text-white';

export function SchoolTimerReport() {
  const { org } = useOrg();
  const slug = org.slug;
  const { classes } = useOrgClasses(slug);
  const [days, setDays] = useState(7);
  const [classId, setClassId] = useState('');
  const [report, setReport] = useState<OrgTimerReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setReport(null);
    setError(null);
    try {
      const qs = `?days=${days}${classId ? `&class_id=${classId}` : ''}`;
      setReport(await timerFetch<OrgTimerReport>(slug, `/timer-report${qs}`));
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao carregar.'); }
  }, [slug, days, classId]);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900 dark:text-white"><TimerIcon className="h-6 w-6" /> Tempo de estudo</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-white/55">Tempo que os alunos cronometraram no timer, por aluno e por matéria.</p>
        </div>
        <div className="flex gap-2">
          {classes.length > 0 && (
            <select aria-label="Turma" className={sel} value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Todas as turmas</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <select aria-label="Período" className={sel} value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>7 dias</option><option value={30}>30 dias</option><option value={90}>90 dias</option>
          </select>
        </div>
      </div>

      {error ? (
        <p className="mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>
      ) : !report ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[['Tempo total', formatDuration(report.total_seconds)],
              ['Alunos que usaram', `${report.active_students} de ${report.students.length}`],
              ['Média por aluno ativo', formatDuration(report.avg_seconds_active)]].map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs text-slate-500 dark:text-white/50">{k}</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">{v}</p>
              </div>
            ))}
          </div>
          {report.by_subject.length > 0 && (
            <p className="mt-4 text-xs text-slate-600 dark:text-white/65">
              Por matéria: {report.by_subject.map((s) => `${s.subject} ${formatDuration(s.seconds)}`).join(' · ')}
            </p>
          )}
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500 dark:text-white/50">
                <tr><th className="px-4 py-2 font-semibold">Aluno</th><th className="px-4 py-2 font-semibold">Tempo</th>
                  <th className="px-4 py-2 font-semibold">Sessões</th><th className="px-4 py-2 font-semibold">Matérias</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {report.students.map((s) => (
                  <tr key={s.user_id} className={s.seconds ? '' : 'text-slate-400 dark:text-white/40'}>
                    <td className="px-4 py-2 font-semibold">{s.name ?? 'Aluno'}</td>
                    <td className="px-4 py-2 tabular-nums">{formatDuration(s.seconds)}</td>
                    <td className="px-4 py-2 tabular-nums">{s.sessions}</td>
                    <td className="px-4 py-2 text-xs">{s.subjects.slice(0, 3).map((x) => `${x.subject} ${formatDuration(x.seconds)}`).join(' · ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
