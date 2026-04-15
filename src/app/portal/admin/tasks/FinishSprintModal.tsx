'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { mutate } from 'swr';
import { toast } from 'sonner';
import { apiFinishSprint, apiGenerateSprintSummary, Sprint } from './hooks/useTasks';

interface Props {
  sprint: Sprint | null;
  open: boolean;
  onClose: () => void;
}

export default function FinishSprintModal({ sprint, open, onClose }: Props) {
  const [development, setDevelopment] = useState('');
  const [positives, setPositives] = useState('');
  const [negatives, setNegatives] = useState('');
  const [finalSummary, setFinalSummary] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open || !sprint) return;
    setDevelopment('');
    setPositives('');
    setNegatives('');
    setFinalSummary(sprint.report_final_summary_ai ?? '');
    setAiSummary(sprint.report_final_summary_ai ?? '');
  }, [open, sprint]);

  if (!sprint) return null;

  const isValid =
    development.trim() &&
    positives.trim() &&
    negatives.trim() &&
    finalSummary.trim();

  async function handleGenerateSummary() {
    if (!sprint) return;
    setGenerating(true);
    try {
      const result = await apiGenerateSprintSummary(sprint.id);
      setAiSummary(result.summary);
      setFinalSummary(result.summary);
      toast.success('Resumo gerado com IA');
    } catch (error: any) {
      toast.error(error.message ?? 'Erro ao gerar resumo com IA');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit() {
    if (!sprint) return;
    if (!isValid) return;
    setLoading(true);
    try {
      await apiFinishSprint(sprint.id, {
        development: development.trim(),
        positives: positives.trim(),
        negatives: negatives.trim(),
        final_summary: finalSummary.trim(),
        ai_summary: aiSummary.trim() || null,
      });
      mutate('/api/admin/sprints');
      mutate('/api/admin/sprints?history=true');
      mutate((key: unknown) => typeof key === 'string' && key.startsWith('/api/admin/tasks'));
      toast.success('Sprint finalizada com sucesso!');
      onClose();
    } catch (error: any) {
      toast.error(error.message ?? 'Erro ao finalizar sprint');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-w-3xl p-0 gap-0 overflow-hidden rounded-2xl">
        <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #10b981, #10b98140)' }} />

        <div className="px-6 pt-5 pb-4 border-b border-zinc-200 dark:border-zinc-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100">Finalizar sprint</DialogTitle>
              <p className="text-xs text-zinc-600">Tasks não concluídas voltarão automaticamente para o backlog.</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[72vh] overflow-y-auto">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4">
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">Objetivo da sprint</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{sprint.goal}</p>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2 block">Como foi o desenvolvimento</label>
            <textarea
              value={development}
              onChange={event => setDevelopment(event.target.value)}
              rows={4}
              placeholder="Descreva como a sprint aconteceu, ritmo, fluxo e execução."
              className="w-full bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 resize-none focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2 block">Pontos positivos</label>
              <textarea
                value={positives}
                onChange={event => setPositives(event.target.value)}
                rows={4}
                placeholder="O que funcionou bem nesta sprint?"
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 resize-none focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2 block">Pontos negativos</label>
              <textarea
                value={negatives}
                onChange={event => setNegatives(event.target.value)}
                rows={4}
                placeholder="O que atrapalhou ou ficou abaixo do esperado?"
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 resize-none focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Resumo geral</label>
              <button
                type="button"
                onClick={handleGenerateSummary}
                disabled={generating}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 disabled:opacity-50"
              >
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {generating ? 'Gerando...' : 'Gerar com IA'}
              </button>
            </div>
            <textarea
              value={finalSummary}
              onChange={event => setFinalSummary(event.target.value)}
              rows={6}
              placeholder="Resumo final da sprint. Você pode escrever manualmente ou usar a IA como rascunho."
              className="w-full bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 resize-none focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
            />
          </div>
        </div>

        <div className="px-6 pb-5 pt-4 flex items-center justify-end gap-2.5 border-t border-zinc-200 dark:border-zinc-800/60">
          <button
            onClick={onClose}
            className="text-sm font-medium px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: isValid ? '#10b981' : '#10b98166' }}
          >
            {loading ? 'Finalizando...' : 'Finalizar Sprint'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
