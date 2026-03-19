'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { mutate } from 'swr';
import { toast } from 'sonner';
import { Sparkles, ArrowUpRight, X, RefreshCw, Zap } from 'lucide-react';
import { useAISuggestions, apiGenerateSuggestions, apiPromoteSuggestion, apiDismissSuggestion, AISuggestion } from './hooks/useTasks';

const PRIORITY_CONFIG = {
  high: {
    label: 'Alta',
    color: '#f87171',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.25)',
  },
  medium: {
    label: 'Média',
    color: '#fbbf24',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.25)',
  },
  low: {
    label: 'Baixa',
    color: '#34d399',
    bg: 'rgba(52,211,153,0.12)',
    border: 'rgba(52,211,153,0.25)',
  },
};

const PANEL_ACCENT = '#a855f7';

interface Props {
  userId: string;
}

export default function AISuggestionsPanel({ userId: _userId }: Props) {
  const { suggestions, isLoading, reload } = useAISuggestions();
  const [generating, setGenerating] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';
  const [actionIds, setActionIds] = useState<Set<string>>(new Set());

  async function handleGenerate() {
    setGenerating(true);
    try {
      await apiGenerateSuggestions();
      toast.success('Análise iniciada! As sugestões aparecerão em breve.');
      setTimeout(() => { reload(); setGenerating(false); }, 5000);
    } catch {
      toast.error('Erro ao iniciar geração');
      setGenerating(false);
    }
  }

  async function handlePromote(s: AISuggestion) {
    setActionIds(prev => new Set(prev).add(s.id));
    try {
      await apiPromoteSuggestion(s.id);
      toast.success(`Task criada: ${s.suggestion_title}`);
      mutate('/api/admin/tasks');
      reload();
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao promover');
    } finally {
      setActionIds(prev => { const n = new Set(prev); n.delete(s.id); return n; });
    }
  }

  async function handleDismiss(s: AISuggestion) {
    setActionIds(prev => new Set(prev).add(s.id));
    try {
      await apiDismissSuggestion(s.id);
      reload();
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao descartar');
    } finally {
      setActionIds(prev => { const n = new Set(prev); n.delete(s.id); return n; });
    }
  }

  return (
    <div
      className="w-68 flex-shrink-0 flex flex-col overflow-hidden rounded-2xl"
      style={{
        minWidth: 256,
        maxWidth: 272,
        background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
        border: isDark ? '1.5px solid rgba(255,255,255,0.06)' : '1.5px solid rgba(0,0,0,0.1)',
      }}
    >
      {/* Accent bar */}
      <div className="h-[3px] flex-shrink-0 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${PANEL_ACCENT}, ${PANEL_ACCENT}40)` }} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 flex-shrink-0" style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.08)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${PANEL_ACCENT}22` }}>
            <Sparkles className="w-3.5 h-3.5" style={{ color: PANEL_ACCENT }} />
          </div>
          <span className="text-xs font-bold tracking-wide" style={{ color: PANEL_ACCENT }}>
            IA Insights
          </span>
          {suggestions.length > 0 && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: `${PANEL_ACCENT}25`, color: PANEL_ACCENT }}
            >
              {suggestions.length}
            </span>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          title="Gerar novas sugestões"
          className="p-1.5 rounded-lg transition-all hover:bg-white/5 disabled:opacity-50 cursor-pointer"
          aria-label="Gerar sugestões"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-zinc-500 hover:text-purple-400 transition-colors ${generating ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {isLoading && (
          <div className="space-y-2.5 py-2">
            {[1, 2].map(i => (
              <div key={i} className="rounded-xl p-3 animate-pulse" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
                <div className="h-3 rounded bg-zinc-200 dark:bg-zinc-800 mb-2 w-3/4" />
                <div className="h-2 rounded bg-zinc-200 dark:bg-zinc-800 mb-1 w-full" />
                <div className="h-2 rounded bg-zinc-200 dark:bg-zinc-800 w-2/3" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && suggestions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${PANEL_ACCENT}18` }}>
              <Zap className="w-5 h-5" style={{ color: PANEL_ACCENT, opacity: 0.6 }} />
            </div>
            <div className="text-center">
              <p className="text-xs text-zinc-500 mb-1">Nenhuma sugestão pendente</p>
              <p className="text-[10px] text-zinc-700">A IA analisará o contexto do projeto</p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
              style={{ background: `${PANEL_ACCENT}20`, color: PANEL_ACCENT, border: `1px solid ${PANEL_ACCENT}30` }}
            >
              {generating ? 'Analisando...' : 'Gerar agora'}
            </button>
          </div>
        )}

        {suggestions.map(s => {
          const pc = PRIORITY_CONFIG[s.priority] ?? PRIORITY_CONFIG.medium;
          const busy = actionIds.has(s.id);
          return (
            <div
              key={s.id}
              className="rounded-xl p-3 space-y-2.5 transition-all"
              style={{
                background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)',
                border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.1)',
              }}
            >
              {/* Title + priority */}
              <div className="flex items-start gap-2">
                <p className="text-[12px] font-semibold text-zinc-800 dark:text-zinc-200 leading-snug flex-1 line-clamp-2">
                  {s.suggestion_title}
                </p>
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 mt-0.5"
                  style={{ background: pc.bg, color: pc.color, border: `1px solid ${pc.border}` }}
                >
                  {pc.label}
                </span>
              </div>

              {/* Scope preview */}
              <p className="text-[11px] text-zinc-500 dark:text-zinc-600 line-clamp-3 leading-relaxed">
                {s.suggestion_scope}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handlePromote(s)}
                  disabled={busy}
                  className="flex items-center gap-1 text-[11px] font-bold rounded-lg px-2 py-1 transition-all disabled:opacity-40 cursor-pointer"
                  style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}
                >
                  <ArrowUpRight className="w-3 h-3" /> Criar Task
                </button>
                <button
                  onClick={() => handleDismiss(s)}
                  disabled={busy}
                  className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-400 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" /> Ignorar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
