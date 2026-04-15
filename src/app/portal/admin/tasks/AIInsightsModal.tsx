'use client';

import { useState } from 'react';
import { mutate } from 'swr';
import { toast } from 'sonner';
import {
  Sparkles,
  ArrowUpRight,
  X,
  RefreshCw,
  Zap,
  FileText,
  Flag,
  AlignLeft,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  useAISuggestions,
  apiGenerateSuggestions,
  apiPromoteSuggestion,
  apiDismissSuggestion,
  AISuggestion,
} from './hooks/useTasks';

const PRIORITY_CONFIG = {
  critical: { label: 'Crítico', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.30)' },
  high: { label: 'Alta', color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)' },
  medium: { label: 'Média', color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  low: { label: 'Baixa', color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)' },
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AIInsightsModal({ open, onClose }: Props) {
  const { suggestions, isLoading, reload } = useAISuggestions();
  const [generating, setGenerating] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<AISuggestion | null>(null);
  const [actionIds, setActionIds] = useState<Set<string>>(new Set());

  async function handleGenerate() {
    setGenerating(true);
    try {
      await apiGenerateSuggestions();
      toast.success('Análise iniciada. As sugestões aparecerão em breve.');
      setTimeout(() => {
        reload();
        setGenerating(false);
      }, 5000);
    } catch {
      toast.error('Erro ao iniciar geração');
      setGenerating(false);
    }
  }

  async function handlePromote(suggestion: AISuggestion) {
    setActionIds(prev => new Set(prev).add(suggestion.id));
    try {
      await apiPromoteSuggestion(suggestion.id);
      toast.success(`Task criada: ${suggestion.suggestion_title}`);
      mutate('/api/admin/tasks');
      reload();
      setSelectedSuggestion(null);
    } catch (error: any) {
      toast.error(error.message ?? 'Erro ao promover');
    } finally {
      setActionIds(prev => {
        const next = new Set(prev);
        next.delete(suggestion.id);
        return next;
      });
    }
  }

  async function handleDismiss(suggestion: AISuggestion) {
    setActionIds(prev => new Set(prev).add(suggestion.id));
    try {
      await apiDismissSuggestion(suggestion.id);
      reload();
      if (selectedSuggestion?.id === suggestion.id) setSelectedSuggestion(null);
    } catch (error: any) {
      toast.error(error.message ?? 'Erro ao descartar');
    } finally {
      setActionIds(prev => {
        const next = new Set(prev);
        next.delete(suggestion.id);
        return next;
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-w-6xl p-0 gap-0 overflow-hidden rounded-3xl">
        <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #a855f7, #a855f740)' }} />
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-fuchsia-500/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-fuchsia-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-zinc-100">Insights da IA</DialogTitle>
              <p className="text-xs text-zinc-500">Sugestões de tasks geradas a partir do contexto do produto.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-400 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Analisando...' : 'Atualizar insights'}
          </button>
        </div>

        <div className="grid grid-cols-[360px_1fr] min-h-[70vh]">
          <div className="border-r border-zinc-200 dark:border-zinc-800/60 p-4 overflow-y-auto space-y-3">
            {isLoading && (
              <div className="space-y-3 py-2">
                {[1, 2, 3].map(item => (
                  <div key={item} className="rounded-2xl p-4 animate-pulse bg-zinc-100 dark:bg-zinc-900">
                    <div className="h-3 rounded bg-zinc-200 dark:bg-zinc-800 mb-2 w-3/4" />
                    <div className="h-2 rounded bg-zinc-200 dark:bg-zinc-800 mb-1 w-full" />
                    <div className="h-2 rounded bg-zinc-200 dark:bg-zinc-800 w-2/3" />
                  </div>
                ))}
              </div>
            )}

            {!isLoading && suggestions.length === 0 && (
              <div className="h-full min-h-[320px] rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 flex flex-col items-center justify-center px-6 text-center">
                <div className="w-14 h-14 rounded-3xl bg-fuchsia-500/10 flex items-center justify-center mb-4">
                  <Zap className="w-5 h-5 text-fuchsia-400" />
                </div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Nenhum insight pendente</p>
                <p className="text-xs text-zinc-500 mb-4">Gere uma nova análise quando quiser levantar oportunidades de produto.</p>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="text-xs font-bold px-3.5 py-2 rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-400 disabled:opacity-50"
                >
                  {generating ? 'Analisando...' : 'Gerar agora'}
                </button>
              </div>
            )}

            {suggestions.map(suggestion => {
              const priority = PRIORITY_CONFIG[suggestion.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.medium;
              const selected = selectedSuggestion?.id === suggestion.id;
              const busy = actionIds.has(suggestion.id);
              return (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => setSelectedSuggestion(selected ? null : suggestion)}
                  className="w-full text-left rounded-2xl px-4 py-4 transition-all"
                  style={{
                    background: selected ? 'rgba(168,85,247,0.10)' : 'transparent',
                    border: selected ? '1px solid rgba(168,85,247,0.25)' : '1px solid rgba(113,113,122,0.14)',
                  }}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug flex-1">
                      {suggestion.suggestion_title}
                    </p>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{ background: priority.bg, color: priority.color, border: `1px solid ${priority.border}` }}
                    >
                      {priority.label}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 line-clamp-3 leading-relaxed">{suggestion.suggestion_scope}</p>
                  <div className="flex items-center gap-2 pt-3" onClick={event => event.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handlePromote(suggestion)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 text-[11px] font-bold rounded-lg px-2.5 py-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 disabled:opacity-50"
                    >
                      <ArrowUpRight className="w-3 h-3" />
                      Criar task
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismiss(suggestion)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
                    >
                      <X className="w-3 h-3" />
                      Ignorar
                    </button>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-6 overflow-y-auto">
            {selectedSuggestion ? (
              <div className="max-w-3xl">
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20">
                    Detalhe do insight
                  </span>
                  <span className="text-xs text-zinc-500">Revise antes de promover para task.</span>
                </div>

                {(() => {
                  const priority = PRIORITY_CONFIG[selectedSuggestion.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.medium;
                  return (
                    <span
                      className="inline-flex text-[10px] font-bold px-2 py-1 rounded-md mb-4"
                      style={{ background: priority.bg, color: priority.color, border: `1px solid ${priority.border}` }}
                    >
                      {priority.label}
                    </span>
                  );
                })()}

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Título</span>
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                    {selectedSuggestion.suggestion_title}
                  </h3>
                </div>

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <AlignLeft className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Escopo</span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                    {selectedSuggestion.suggestion_scope}
                  </p>
                </div>

                {selectedSuggestion.source_context && (
                  <div className="mb-8 rounded-2xl border border-fuchsia-500/15 bg-fuchsia-500/[0.04] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Contexto da IA</span>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                      {selectedSuggestion.source_context}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePromote(selectedSuggestion)}
                    disabled={actionIds.has(selectedSuggestion.id)}
                    className="inline-flex items-center gap-2 text-sm font-bold rounded-xl px-4 py-2.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 disabled:opacity-50"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Criar task a partir do insight
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismiss(selectedSuggestion)}
                    disabled={actionIds.has(selectedSuggestion.id)}
                    className="inline-flex items-center gap-2 text-sm px-4 py-2.5 text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    Ignorar insight
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[420px] flex items-center justify-center">
                <div className="max-w-md text-center">
                  <div className="w-16 h-16 rounded-3xl bg-fuchsia-500/10 flex items-center justify-center mx-auto mb-4">
                    <Flag className="w-6 h-6 text-fuchsia-400" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Selecione um insight</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    A coluna da esquerda mostra as sugestões da IA. Abra uma delas para analisar contexto, escopo e decidir se vale virar task.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
