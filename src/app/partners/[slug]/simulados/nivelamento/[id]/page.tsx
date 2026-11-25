'use client';

// Nivelamento — matriz alunos × matérias com a faixa de cada um, contagem por
// faixa, filtro por turma e configuração das faixas / uso no cronograma.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { BrandButton, ElevatedCard, RevealGroup, RevealItem, SectionTitle } from '@/components/partners/founder-ui';
import { useOrgClasses } from '@/lib/org-classes';
import { levelingFetch, type LevelingBand, type LevelingMatrix, type LevelingSettings } from '@/lib/answer-key';

// Cor por posição da faixa (da mais baixa à mais alta).
const BAND_COLORS = ['bg-rose-100 text-rose-800', 'bg-amber-100 text-amber-800', 'bg-sky-100 text-sky-800',
  'bg-emerald-100 text-emerald-800', 'bg-violet-100 text-violet-800', 'bg-teal-100 text-teal-800',
  'bg-indigo-100 text-indigo-800', 'bg-lime-100 text-lime-800'];

export default function NivelamentoPage() {
  return (
    <ModuleGuard permKey="simulados_enabled">
      <PartnerLayout><Inner /></PartnerLayout>
    </ModuleGuard>
  );
}

function Inner() {
  const { org } = useOrg();
  const slug = org.slug;
  const { id } = useParams<{ id: string }>();
  const { classes } = useOrgClasses(slug, { enabled: !org.is_mock });
  const [classId, setClassId] = useState('');
  const [data, setData] = useState<LevelingMatrix | null>(null);
  const [settings, setSettings] = useState<LevelingSettings | null>(null);

  const load = useCallback(async () => {
    try {
      const q = classId ? `?class_id=${classId}` : '';
      const [m, s] = await Promise.all([
        levelingFetch<LevelingMatrix>(slug, `/${id}${q}`),
        levelingFetch<LevelingSettings>(slug, '/settings'),
      ]);
      setData(m);
      setSettings(s);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao carregar.'); }
  }, [slug, id, classId]);
  useEffect(() => { void load(); }, [load]);

  if (!data || !settings) return <div className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;
  const color = (band: string) => BAND_COLORS[Math.max(0, data.bands.findIndex((b) => b.label === band)) % BAND_COLORS.length];

  return (
    <div className="min-h-full -mx-4 -mt-4 px-4 pt-4 pb-10 md:-mx-8 md:-mt-8 md:px-8 md:pt-8">
      <RevealGroup className="mx-auto max-w-6xl space-y-5">
        <RevealItem>
          <Link href={data.simulado.modality === 'gabarito' ? `/partners/${slug}/simulados/gabarito/${id}` : `/partners/${slug}/simulados`}
            className="mb-1.5 flex w-fit items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600">
            <ChevronLeft size={14} /> {data.simulado.title}
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">Nivelamento</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{data.students.length} aluno(s) · {data.subjects.length} matéria(s)</p>
            </div>
            {classes.length > 0 && (
              <select aria-label="Turma" value={classId} onChange={(e) => setClassId(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                <option value="">Todas as turmas</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
        </RevealItem>

        {data.subjects.length > 0 && (
          <RevealItem>
            <SectionTitle kicker="Turma" title="Alunos por faixa" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.subjects.map((s) => (
                <ElevatedCard key={s} className="p-4">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{s}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {data.bands.map((b) => (
                      <span key={b.label} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${color(b.label)}`}>
                        {b.label}: {data.band_counts[s]?.[b.label] ?? 0}
                      </span>
                    ))}
                  </div>
                </ElevatedCard>
              ))}
            </div>
          </RevealItem>
        )}

        <RevealItem>
          <SectionTitle kicker="Alunos" title="Matriz" />
          <ElevatedCard className="overflow-x-auto">
            {data.students.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">Nenhum resultado ainda.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-500">
                  <tr><th className="sticky left-0 bg-white px-3 py-2 dark:bg-slate-900">Aluno</th>
                    {data.subjects.map((s) => <th key={s} className="whitespace-nowrap px-3 py-2">{s}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.students.map((st) => (
                    <tr key={st.user_id}>
                      <td className="sticky left-0 whitespace-nowrap bg-white px-3 py-2 font-semibold text-slate-900 dark:bg-slate-900 dark:text-white">{st.full_name || st.email}</td>
                      {data.subjects.map((s) => {
                        const r = st.subjects[s];
                        return (
                          <td key={s} className="px-3 py-2">
                            {r ? <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${color(r.band)}`}
                              title={`${r.correct}/${r.total}`}>{r.band} · {Math.round(r.percentage)}%</span> : <span className="text-slate-300">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ElevatedCard>
        </RevealItem>

        <RevealItem>
          <SettingsCard slug={slug} settings={settings} hex={org.brand_primary} onSaved={load} />
        </RevealItem>
      </RevealGroup>
    </div>
  );
}

function SettingsCard({ slug, settings, hex, onSaved }: { slug: string; settings: LevelingSettings; hex?: string; onSaved: () => Promise<void> }) {
  const [bands, setBands] = useState<LevelingBand[]>(settings.bands);
  const [useIt, setUseIt] = useState(settings.use_in_cronograma);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await levelingFetch(slug, '/settings', { method: 'PUT', body: JSON.stringify({ bands, use_in_cronograma: useIt }) });
      toast.success('Configuração salva.');
      await onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar.'); } finally { setSaving(false); }
  };

  return (
    <>
      <SectionTitle kicker="Escola" title="Faixas e cronograma" />
      <ElevatedCard className="space-y-4 p-4 sm:p-5">
        <p className="text-xs text-slate-500">As faixas valem para todos os nivelamentos da escola. Mudar aqui reetiqueta os resultados já existentes.</p>
        <ul className="space-y-2">
          {bands.map((b, k) => (
            <li key={k} className="flex items-center gap-2">
              <span className="text-xs text-slate-500">a partir de</span>
              <input aria-label={`Percentual mínimo da faixa ${k + 1}`} type="number" min={0} max={100} value={b.min_pct} disabled={k === 0}
                onChange={(e) => setBands(bands.map((x, i) => (i === k ? { ...x, min_pct: Number(e.target.value) } : x)))}
                className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-900" />
              <span className="text-xs text-slate-500">%</span>
              <input aria-label={`Nome da faixa ${k + 1}`} value={b.label} maxLength={40}
                onChange={(e) => setBands(bands.map((x, i) => (i === k ? { ...x, label: e.target.value } : x)))}
                className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900" />
              <button type="button" aria-label={`Remover faixa ${k + 1}`} disabled={k === 0} onClick={() => setBands(bands.filter((_, i) => i !== k))}
                className="rounded-lg p-1.5 text-slate-400 hover:text-red-500 disabled:invisible"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
        {bands.length < 8 && (
          <button type="button" onClick={() => setBands([...bands, { min_pct: Math.min(100, (bands[bands.length - 1]?.min_pct ?? 0) + 10), label: '' }])}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300"><Plus className="h-3.5 w-3.5" /> Faixa</button>
        )}
        <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input type="checkbox" className="mt-1" checked={useIt} onChange={(e) => setUseIt(e.target.checked)} />
          <span><b>Usar no cronograma</b>
            <span className="block text-xs text-slate-500">O resultado por matéria vira o ponto de partida do cronograma do aluno (no lugar da autoavaliação). As respostas reais continuam ajustando o plano.</span>
          </span>
        </label>
        <div className="flex justify-end">
          <BrandButton hex={hex} onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
          </BrandButton>
        </div>
      </ElevatedCard>
    </>
  );
}
