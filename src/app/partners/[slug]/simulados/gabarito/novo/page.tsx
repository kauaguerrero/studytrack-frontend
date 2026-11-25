'use client';

// Novo simulado por gabarito: a prova é aplicada fora da plataforma; aqui só
// o gabarito (letra, matéria, disciplina). O aluno marca A–E no app.

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { BrandButton, ElevatedCard, RevealGroup, RevealItem, SectionTitle } from '@/components/partners/founder-ui';
import { ClassVisibilityPicker } from '@/components/partners/ClassVisibilityPicker';
import { AnswerKeyEditor } from '@/components/partners/AnswerKeyEditor';
import { useOrgClasses, visibleClassIdsPayload } from '@/lib/org-classes';
import { answerKeyFetch, draftProblem, emptyItems, toPayload, type KeyItemDraft } from '@/lib/answer-key';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
const labelCls = 'mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300';

function toIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default function NovoSimuladoGabaritoPage() {
  return (
    <ModuleGuard permKey="simulados_enabled">
      <PartnerLayout><NovoInner /></PartnerLayout>
    </ModuleGuard>
  );
}

function NovoInner() {
  const { org } = useOrg();
  const slug = org.slug;
  const router = useRouter();
  const { classes } = useOrgClasses(slug, { enabled: !org.is_mock });
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [reveal, setReveal] = useState<'after_submit' | 'after_end'>('after_submit');
  const [visible, setVisible] = useState<string[]>([]);
  const [items, setItems] = useState<KeyItemDraft[]>(() => emptyItems(45));
  const [saving, setSaving] = useState(false);

  const problem = !title.trim() ? 'Dê um título ao simulado.' : !startsAt ? 'Escolha quando começa.' : draftProblem(items);

  const save = async () => {
    if (problem) { toast.error(problem); return; }
    setSaving(true);
    try {
      const r = await answerKeyFetch<{ scheduled_simulado: { id: string } }>(slug, '', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(), starts_at: toIso(startsAt), ends_at: toIso(endsAt), reveal,
          items: toPayload(items),
          ...(classes.length ? { visible_class_ids: visibleClassIdsPayload(visible) } : {}),
        }),
      });
      toast.success('Simulado criado. Os alunos já veem o cartão-resposta no horário de início.');
      router.push(`/partners/${slug}/simulados/gabarito/${r.scheduled_simulado.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar.');
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-full -mx-4 -mt-4 px-4 pt-4 pb-10 md:-mx-8 md:-mt-8 md:px-8 md:pt-8">
      <RevealGroup className="mx-auto max-w-4xl space-y-5">
        <RevealItem>
          <Link href={`/partners/${slug}/simulados`} className="mb-1.5 flex w-fit items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600">
            <ChevronLeft size={14} /> Simulados
          </Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">Simulado por gabarito</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Aplique a prova do seu jeito (papel, PDF, apostila). Aqui você cadastra só as respostas certas; o aluno marca as letras no app e vê a nota na hora.
          </p>
        </RevealItem>

        <RevealItem>
          <ElevatedCard className="space-y-4 p-4 sm:p-5">
            <div>
              <label className={labelCls} htmlFor="sim-title">Título</label>
              <input id="sim-title" className={inputCls} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Simulado ENEM — 1º dia" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="sim-start">Alunos podem enviar a partir de</label>
                <input id="sim-start" type="datetime-local" className={inputCls} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div>
                <label className={labelCls} htmlFor="sim-end">Até (opcional)</label>
                <input id="sim-end" type="datetime-local" className={inputCls} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
            </div>
            <div>
              <span className={labelCls}>Quando o aluno vê o gabarito</span>
              <div className="flex flex-wrap gap-2">
                {([['after_submit', 'Logo depois de enviar'], ['after_end', 'Só depois do prazo final']] as const).map(([v, l]) => (
                  <button key={v} type="button" aria-pressed={reveal === v} onClick={() => setReveal(v)}
                    disabled={v === 'after_end' && !endsAt}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${reveal === v ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {classes.length > 0 && <ClassVisibilityPicker classes={classes} value={visible} onChange={setVisible} />}
          </ElevatedCard>
        </RevealItem>

        <RevealItem>
          <SectionTitle kicker="Gabarito" title="Respostas certas" hex={org.brand_primary} />
          <ElevatedCard className="p-4 sm:p-5">
            <AnswerKeyEditor slug={slug} items={items} onChange={setItems} />
          </ElevatedCard>
        </RevealItem>

        <RevealItem className="flex flex-col items-end gap-1.5">
          {problem && <p className="text-xs text-slate-500">{problem}</p>}
          <BrandButton hex={org.brand_primary} onClick={() => void save()} disabled={saving || !!problem}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar simulado'}
          </BrandButton>
        </RevealItem>
      </RevealGroup>
    </div>
  );
}
