'use client';

import { useState, useRef } from 'react';
import { useTheme } from 'next-themes';
import { mutate } from 'swr';
import { toast } from 'sonner';
import { Sparkles, ArrowUpRight, X, RefreshCw, Zap, ChevronLeft, ChevronRight, FileText, Flag, AlignLeft } from 'lucide-react';
import { useAISuggestions, apiGenerateSuggestions, apiPromoteSuggestion, apiDismissSuggestion, AISuggestion } from './hooks/useTasks';

const PRIORITY_CONFIG = {
  critical: { label: 'Crítico', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.30)' },
  high:     { label: 'Alta',    color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)' },
  medium:   { label: 'Média',   color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  low:      { label: 'Baixa',   color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)' },
};

const PANEL_ACCENT = '#a855f7';

interface Props {
  userId: string;
}

export default function AISuggestionsPanel({ userId: _userId }: Props) {
  const { suggestions, isLoading, reload } = useAISuggestions();
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<AISuggestion | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';
  const [actionIds, setActionIds] = useState<Set<string>>(new Set());
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleMouseEnter() {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    setExpanded(true);
  }

  function handleMouseLeave() {
    leaveTimerRef.current = setTimeout(() => {
      setExpanded(false);
      setSelectedSuggestion(null);
    }, 300);
  }

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
      setSelectedSuggestion(null);
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
      if (selectedSuggestion?.id === s.id) setSelectedSuggestion(null);
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao descartar');
    } finally {
      setActionIds(prev => { const n = new Set(prev); n.delete(s.id); return n; });
    }
  }

  const borderStyle = isDark ? '1.5px solid rgba(255,255,255,0.06)' : '1.5px solid rgba(0,0,0,0.1)';
  const bgStyle = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';

  // Collapsed tab
  if (!expanded) {
    return (
      <div
        onMouseEnter={handleMouseEnter}
        className="flex-shrink-0 flex flex-col items-center rounded-2xl cursor-pointer transition-all duration-200 hover:opacity-80"
        style={{ width: 40, background: bgStyle, border: borderStyle }}
      >
        <div className="h-[3px] w-full rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${PANEL_ACCENT}, ${PANEL_ACCENT}40)` }} />
        <div className="flex flex-col items-center gap-3 py-4 flex-1">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${PANEL_ACCENT}22` }}>
            <Sparkles className="w-3.5 h-3.5" style={{ color: PANEL_ACCENT }} />
          </div>
          {suggestions.length > 0 && (
            <span
              className="text-[9px] font-bold px-1 py-0.5 rounded-full w-5 h-5 flex items-center justify-center"
              style={{ background: `${PANEL_ACCENT}25`, color: PANEL_ACCENT }}
            >
              {suggestions.length}
            </span>
          )}
          <ChevronLeft className="w-3.5 h-3.5 mt-auto mb-2" style={{ color: PANEL_ACCENT, opacity: 0.5 }} />
        </div>
      </div>
    );
  }

  // Expanded panel
  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="flex-shrink-0 flex flex-col overflow-hidden rounded-2xl transition-all duration-200"
      style={{ width: selectedSuggestion ? 480 : 272, background: bgStyle, border: borderStyle }}
    >
      {/* Accent bar */}
      <div className="h-[3px] flex-shrink-0 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${PANEL_ACCENT}, ${PANEL_ACCENT}40)` }} />

      <div className="flex flex-1 overflow-hidden">
        {/* Suggestions list */}
        <div className="flex flex-col overflow-hidden" style={{ width: 272, flexShrink: 0 }}>
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
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${PANEL_ACCENT}25`, color: PANEL_ACCENT }}>
                  {suggestions.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleGenerate}
                disabled={generating}
                title="Gerar novas sugestões"
                className="p-1.5 rounded-lg transition-all hover:bg-white/5 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-zinc-500 hover:text-purple-400 transition-colors ${generating ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => { setExpanded(false); setSelectedSuggestion(null); }}
                className="p-1.5 rounded-lg transition-all hover:bg-white/5 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300 transition-colors" />
              </button>
            </div>
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
              const pc = PRIORITY_CONFIG[s.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.medium;
              const busy = actionIds.has(s.id);
              const isSelected = selectedSuggestion?.id === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSuggestion(isSelected ? null : s)}
                  className="rounded-xl p-3 space-y-2.5 transition-all cursor-pointer"
                  style={{
                    background: isSelected
                      ? isDark ? 'rgba(168,85,247,0.12)' : 'rgba(168,85,247,0.08)'
                      : isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)',
                    border: isSelected
                      ? `1px solid ${PANEL_ACCENT}50`
                      : isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.1)',
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
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-600 line-clamp-2 leading-relaxed">
                    {s.suggestion_scope}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1" onClick={e => e.stopPropagation()}>
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

        {/* Suggestion detail panel */}
        {selectedSuggestion && (
          <div
            className="flex flex-col overflow-hidden flex-1"
            style={{ borderLeft: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)' }}
          >
            {/* Detail header */}
            <div className="flex items-center justify-between px-4 py-3.5 flex-shrink-0" style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.08)' }}>
              <span className="text-xs font-bold text-zinc-400">Detalhe da Sugestão</span>
              <button onClick={() => setSelectedSuggestion(null)} className="p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                <X className="w-3.5 h-3.5 text-zinc-500" />
              </button>
            </div>

            {/* Detail content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Priority badge */}
              {(() => {
                const pc = PRIORITY_CONFIG[selectedSuggestion.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.medium;
                return (
                  <div className="flex items-center gap-2">
                    <Flag className="w-3.5 h-3.5" style={{ color: PANEL_ACCENT }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Prioridade</span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                      style={{ background: pc.bg, color: pc.color, border: `1px solid ${pc.border}` }}
                    >
                      {pc.label}
                    </span>
                  </div>
                );
              })()}

              {/* Title */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FileText className="w-3 h-3 text-zinc-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Título</span>
                </div>
                <p className="text-sm font-semibold text-zinc-200 leading-snug">{selectedSuggestion.suggestion_title}</p>
              </div>

              {/* Scope */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlignLeft className="w-3 h-3 text-zinc-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Escopo</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">{selectedSuggestion.suggestion_scope}</p>
              </div>

              {/* Source context */}
              {selectedSuggestion.source_context && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="w-3 h-3" style={{ color: PANEL_ACCENT }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Contexto da IA</span>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed italic">{selectedSuggestion.source_context}</p>
                </div>
              )}
            </div>

            {/* Detail actions */}
            <div className="px-4 pb-4 flex gap-2 flex-shrink-0">
              <button
                onClick={() => handlePromote(selectedSuggestion)}
                disabled={actionIds.has(selectedSuggestion.id)}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl px-3 py-2 transition-all disabled:opacity-40 cursor-pointer"
                style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}
              >
                <ArrowUpRight className="w-3.5 h-3.5" /> Criar Task
              </button>
              <button
                onClick={() => handleDismiss(selectedSuggestion)}
                disabled={actionIds.has(selectedSuggestion.id)}
                className="flex items-center justify-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 disabled:opacity-40 transition-colors cursor-pointer px-3 py-2 rounded-xl hover:bg-white/5"
              >
                <X className="w-3.5 h-3.5" /> Ignorar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
