'use client';

// Simulado por gabarito — coordenação: resultados (nota de cada aluno e acerto
// por questão, com a letra mais marcada) e o gabarito. Antes do primeiro envio
// o gabarito é editável inteiro; depois, corrige/anula questão por questão e
// todas as notas são recalculadas.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, ChevronLeft, Layers, Loader2 } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { BrandButton, ElevatedCard, RevealGroup, RevealItem, SectionTitle, Segmented } from '@/components/partners/founder-ui';
import { AnswerKeyEditor } from '@/components/partners/AnswerKeyEditor';
import {
  OPTIONS, answerKeyFetch, draftProblem, toPayload,
  type ItemStat, type KeyItemDraft, type Option, type ResultsResponse,
} from '@/lib/answer-key';

const STATUS: Record<string, string> = { scheduled: 'Agendado', active: 'Aberto para envio', ended: 'Encerrado' };
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '');

export default function GabaritoDetailPage() {
  return (
    <ModuleGuard permKey="simulados_enabled">
      <PartnerLayout><DetailInner /></PartnerLayout>
    </ModuleGuard>
  );
}

function DetailInner() {
  const { org } = useOrg();
  const slug = org.slug;
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ResultsResponse | null>(null);
  const [tab, setTab] = useState<'resultados' | 'gabarito'>('resultados');

  const load = useCallback(async () => {
    try { setData(await answerKeyFetch<ResultsResponse>(slug, `/${id}`)); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao carregar.'); }
  }, [slug, id]);
  useEffect(() => { void load(); }, [load]);

  if (!data) return <div className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;
  const sim = data.simulado;
  const avg = data.students.length ? Math.round(data.students.reduce((a, s) => a + s.percentage, 0) / data.students.length) : null;

  return (
    <div className="min-h-full -mx-4 -mt-4 px-4 pt-4 pb-10 md:-mx-8 md:-mt-8 md:px-8 md:pt-8">
      <RevealGroup className="mx-auto max-w-5xl space-y-5">
        <RevealItem>
          <Link href={`/partners/${slug}/simulados`} className="mb-1.5 flex w-fit items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600">
            <ChevronLeft size={14} /> Simulados
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">{sim.title}</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {STATUS[sim.status]} · {data.items.length} questões · início {fmt(sim.starts_at)}{sim.ends_at ? ` · fim ${fmt(sim.ends_at)}` : ''}
                {' · '}{data.students.length} {data.students.length === 1 ? 'envio' : 'envios'}{avg !== null ? ` · média ${avg}%` : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
            {sim.config.purpose === 'nivelamento' && (
              <Link href={`/partners/${slug}/simulados/nivelamento/${sim.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                <Layers className="h-3.5 w-3.5" /> Matriz de nivelamento
              </Link>
            )}
            <Segmented<'resultados' | 'gabarito'>
              options={[{ value: 'resultados', label: 'Resultados' }, { value: 'gabarito', label: 'Gabarito' }]}
              value={tab} onChange={setTab} hex={org.brand_primary} />
            </div>
          </div>
        </RevealItem>
        {tab === 'resultados' ? <Results data={data} /> : <KeyTab slug={slug} id={id} data={data} hex={org.brand_primary} onSaved={load} />}
      </RevealGroup>
    </div>
  );
}

function Results({ data }: { data: ResultsResponse }) {
  // Questão em que a maioria marcou a mesma letra errada: provável gabarito errado.
  const suspicious = useMemo(() => data.items.filter((i) => {
    if (i.annulled || i.answered < 3 || !i.correct_option) return false;
    const top = (OPTIONS as readonly Option[]).reduce((a, o) => (i.options[o] > i.options[a] ? o : a), 'A' as Option);
    return top !== i.correct_option && i.options[top] / i.answered >= 0.5;
  }), [data.items]);

  return (
    <>
      {suspicious.length > 0 && (
        <RevealItem>
          <p className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Confira o gabarito das questões {suspicious.map((i) => i.number).join(', ')}: a maioria marcou a mesma outra letra.
          </p>
        </RevealItem>
      )}
      <RevealItem>
        <SectionTitle kicker="Alunos" title="Notas" />
        <ElevatedCard className="overflow-hidden">
          {data.students.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">Nenhum aluno enviou ainda.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.students.map((s) => (
                <li key={s.user_id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{s.full_name || s.email}</span>
                    <span className="block text-xs text-slate-500">
                      {Object.values(s.results_by_area).map((a) => `${a.label}: ${a.correct}/${a.total}`).join(' · ')}
                    </span>
                  </span>
                  <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">{s.score}/{s.total} · {s.percentage}%</span>
                </li>
              ))}
            </ul>
          )}
        </ElevatedCard>
      </RevealItem>
      <RevealItem>
        <SectionTitle kicker="Questões" title="Acerto por questão" />
        <ElevatedCard className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr><th className="px-3 py-2">Nº</th><th className="px-3 py-2">Matéria</th><th className="px-3 py-2">Certa</th>
                <th className="px-3 py-2">Acerto</th><th className="px-3 py-2">Marcações</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.items.map((i) => <ItemRow key={i.number} i={i} />)}
            </tbody>
          </table>
        </ElevatedCard>
      </RevealItem>
    </>
  );
}

function ItemRow({ i }: { i: ItemStat }) {
  return (
    <tr className={i.annulled ? 'opacity-50' : ''}>
      <td className="px-3 py-1.5 font-bold tabular-nums">{i.number}</td>
      <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300">{i.subject}{i.discipline ? ` · ${i.discipline}` : ''}</td>
      <td className="px-3 py-1.5 font-bold">{i.annulled ? 'anulada' : i.correct_option}</td>
      <td className="px-3 py-1.5 tabular-nums">{i.correct_pct === null ? '—' : `${i.correct_pct}%`}</td>
      <td className="px-3 py-1.5 text-xs tabular-nums text-slate-500">
        {OPTIONS.map((o) => <span key={o} className={`mr-2 ${o === i.correct_option ? 'font-bold text-emerald-600' : ''}`}>{o}:{i.options[o] ?? 0}</span>)}
        {i.blank ? <span>branco:{i.blank}</span> : null}
      </td>
    </tr>
  );
}

function KeyTab({ slug, id, data, hex, onSaved }: { slug: string; id: string; data: ResultsResponse; hex?: string; onSaved: () => Promise<void> }) {
  const locked = data.students.length > 0;
  const [items, setItems] = useState<KeyItemDraft[]>(() => data.items.map((i) => ({
    number: i.number, correct_option: i.correct_option, subject: i.subject, discipline: i.discipline ?? '', annulled: i.annulled,
  })));
  const [busy, setBusy] = useState<number | 'all' | null>(null);

  const saveAll = async () => {
    const p = draftProblem(items);
    if (p) { toast.error(p); return; }
    setBusy('all');
    try {
      await answerKeyFetch(slug, `/${id}/items`, { method: 'PUT', body: JSON.stringify({ items: toPayload(items) }) });
      toast.success('Gabarito salvo.');
      await onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar.'); } finally { setBusy(null); }
  };

  const patchItem = async (n: number, patch: { correct_option?: Option; annulled?: boolean }) => {
    if (!window.confirm(`Mudar a questão ${n}? As notas de ${data.students.length} aluno(s) serão recalculadas.`)) return;
    setBusy(n);
    try {
      await answerKeyFetch(slug, `/${id}/items/${n}`, { method: 'PATCH', body: JSON.stringify(patch) });
      toast.success('Questão atualizada e notas recalculadas.');
      await onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar.'); } finally { setBusy(null); }
  };

  if (!locked) {
    return (
      <RevealItem className="space-y-3">
        <ElevatedCard className="p-4 sm:p-5"><AnswerKeyEditor slug={slug} items={items} onChange={setItems} /></ElevatedCard>
        <div className="flex justify-end">
          <BrandButton hex={hex} onClick={() => void saveAll()} disabled={busy !== null}>
            {busy === 'all' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar gabarito'}
          </BrandButton>
        </div>
      </RevealItem>
    );
  }
  return (
    <RevealItem>
      <p className="mb-3 text-sm text-slate-500">Já há envios: corrija a letra ou anule uma questão. A nota de todos é recalculada na hora.</p>
      <ElevatedCard className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.items.map((i) => (
              <tr key={i.number} className={i.annulled ? 'opacity-60' : ''}>
                <td className="px-3 py-1.5 font-bold tabular-nums">{i.number}</td>
                <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300">{i.subject}</td>
                <td className="px-3 py-1.5">
                  <div className="flex gap-0.5">
                    {OPTIONS.map((o) => (
                      <button key={o} type="button" disabled={busy !== null || i.annulled || i.correct_option === o}
                        onClick={() => void patchItem(i.number, { correct_option: o })} aria-label={`Questão ${i.number}: resposta ${o}`}
                        className={`h-7 w-7 rounded-md text-xs font-bold ${i.correct_option === o ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{o}</button>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-1.5 text-right">
                  <button type="button" disabled={busy !== null || (i.annulled && !i.correct_option)}
                    onClick={() => void patchItem(i.number, { annulled: !i.annulled })}
                    className="text-xs font-semibold text-slate-500 hover:underline disabled:opacity-40">
                    {busy === i.number ? <Loader2 className="inline h-3 w-3 animate-spin" /> : i.annulled ? 'Desanular' : 'Anular'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ElevatedCard>
    </RevealItem>
  );
}
