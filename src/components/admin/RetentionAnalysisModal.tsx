"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { SafeMarkdown } from "@/components/ui/SafeMarkdown";
import { Badge } from "@/components/ui/badge";
import { X, ArrowLeft, Loader2, FlaskConical, History, Clock, Users } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DauProfile {
  id: string;
}

interface HealthData {
  dau: number;
  dau_profiles?: DauProfile[];
}

interface RetentionAnalysis {
  id: string;
  segment: string;
  focus_areas: string[];
  extra_observation: string | null;
  profiles_count: number;
  analysis_text: string;
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  health: HealthData;
  apiUrl: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SEGMENTS = ["DAU", "MAU", "HOT", "WARM", "COLD", "TODOS"] as const;
type Segment = (typeof SEGMENTS)[number];

const FOCUS_OPTIONS = [
  "Engajamento",
  "Conversão",
  "Churn",
  "Onboarding",
  "WhatsApp",
  "Questões",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function segmentBadgeCls(seg: string): string {
  switch (seg.toUpperCase()) {
    case "DAU":   return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300";
    case "MAU":   return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300";
    case "HOT":   return "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300";
    case "WARM":  return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300";
    case "COLD":  return "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/40 dark:text-sky-300";
    case "TODOS": return "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300";
    default:      return "bg-zinc-700 text-zinc-200 border-zinc-600";
  }
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ─── Markdown components (zinc-950 dark modal) ───────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mdComponents: Record<string, React.ComponentType<any>> = {
  h1: ({ children }) => (
    <h2 className="text-lg font-bold text-white mt-5 mb-2">{children}</h2>
  ),
  h2: ({ children }) => (
    <h3 className="text-base font-bold text-zinc-200 mt-4 mb-1.5">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="text-sm font-bold text-zinc-300 mt-3 mb-1">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="text-zinc-300 text-sm leading-relaxed mb-2">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="text-zinc-100 font-semibold">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="text-zinc-400 italic">{children}</em>
  ),
  ul: ({ children }) => (
    <ul className="space-y-1 ml-4 mb-2 list-disc">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="space-y-1 ml-4 mb-2 list-decimal">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-zinc-300 text-sm">{children}</li>
  ),
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function AnalysisResultHeader({ analysis }: { analysis: RetentionAnalysis }) {
  return (
    <div className="space-y-2 pb-4 border-b border-zinc-800 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={`text-xs font-semibold ${segmentBadgeCls(analysis.segment)}`}>
          {analysis.segment}
        </Badge>
        <span className="flex items-center gap-1 text-xs text-zinc-500">
          <Clock className="w-3 h-3" /> {fmtDate(analysis.created_at)}
        </span>
        <span className="flex items-center gap-1 text-xs text-zinc-500">
          <Users className="w-3 h-3" /> {analysis.profiles_count} perfis
        </span>
      </div>

      {analysis.focus_areas.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {analysis.focus_areas.map((f) => (
            <span key={f} className="rounded-full bg-zinc-800 text-zinc-300 text-[10px] px-2 py-0.5 border border-zinc-700">
              {f}
            </span>
          ))}
        </div>
      )}

      {analysis.extra_observation && (
        <p className="text-xs text-zinc-500 italic border-l-2 border-zinc-700 pl-3">
          {analysis.extra_observation}
        </p>
      )}
    </div>
  );
}

function HistoryCard({
  item,
  onView,
}: {
  item: RetentionAnalysis;
  onView: (item: RetentionAnalysis) => void;
}) {
  const obsSnippet = item.extra_observation
    ? item.extra_observation.length > 60
      ? item.extra_observation.slice(0, 60) + "…"
      : item.extra_observation
    : null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-2 hover:border-zinc-600 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={`text-xs font-semibold ${segmentBadgeCls(item.segment)}`}>
              {item.segment}
            </Badge>
            <span className="text-xs text-zinc-500">{fmtDate(item.created_at)}</span>
          </div>

          {item.focus_areas.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.focus_areas.map((f) => (
                <span key={f} className="rounded-full bg-zinc-800 text-zinc-400 text-[10px] px-2 py-0.5 border border-zinc-700">
                  {f}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Users className="w-3 h-3" /> {item.profiles_count} perfis analisados
          </div>

          {obsSnippet && (
            <p className="text-xs text-zinc-500 italic">{obsSnippet}</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => onView(item)}
          className="shrink-0 text-xs font-medium text-emerald-400 hover:text-emerald-300 whitespace-nowrap transition-colors"
        >
          Ver análise →
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RetentionAnalysisModal({ open, onClose, health, apiUrl }: Props) {
  const [activeTab, setActiveTab] = useState<"nova" | "historico">("nova");
  const [segment, setSegment] = useState<Segment>("DAU");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [extraObservation, setExtraObservation] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewingAnalysis, setViewingAnalysis] = useState<RetentionAnalysis | null>(null);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyList, setHistoryList] = useState<RetentionAnalysis[]>([]);
  const [historyFetched, setHistoryFetched] = useState(false);

  const supabase = createClient();
  const profiles = health.dau_profiles ?? [];

  const loadHistory = useCallback(async () => {
    if (historyFetched) return;
    setHistoryLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${apiUrl}/api/admin/stats/dau-analysis/history`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.ok) setHistoryList(json.analyses ?? []);
      setHistoryFetched(true);
    } catch (e) {
      console.error("Erro ao carregar histórico:", e);
    } finally {
      setHistoryLoading(false);
    }
  }, [apiUrl, historyFetched, supabase]);

  function handleTabChange(tab: "nova" | "historico") {
    setActiveTab(tab);
    setViewingAnalysis(null);
    if (tab === "historico") loadHistory();
  }

  function toggleFocus(f: string) {
    setFocusAreas((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  }

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      const res = await fetch(`${apiUrl}/api/admin/stats/dau-analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          dau_profiles: profiles,
          segment,
          focus_areas: focusAreas,
          extra_observation: extraObservation.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro desconhecido");

      const freshAnalysis: RetentionAnalysis = {
        id: json.saved_id ?? "",
        segment,
        focus_areas: focusAreas,
        extra_observation: extraObservation.trim() || null,
        profiles_count: profiles.length,
        analysis_text: json.analysis,
        created_at: new Date().toISOString(),
      };

      setViewingAnalysis(freshAnalysis);
      // Invalida cache do histórico para próxima visita
      setHistoryFetched(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setViewingAnalysis(null);
      setError(null);
      setActiveTab("nova");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient bar */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-blue-500 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            {viewingAnalysis ? (
              <button
                type="button"
                onClick={() => setViewingAnalysis(null)}
                className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
            ) : (
              <h2 className="text-base font-semibold text-white">
                Análise de Retenção — Gemini
              </h2>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs (hidden when viewing a result) */}
        {!viewingAnalysis && (
          <div className="flex border-b border-zinc-800 shrink-0">
            {(["nova", "historico"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleTabChange(tab)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab
                    ? "border-emerald-400 text-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab === "nova" ? (
                  <><FlaskConical className="w-3.5 h-3.5" /> Nova análise</>
                ) : (
                  <><History className="w-3.5 h-3.5" /> Histórico</>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 py-5">

          {/* ── Result view ── */}
          {viewingAnalysis && (
            <div>
              <AnalysisResultHeader analysis={viewingAnalysis} />
              <div className="space-y-0.5">
                <SafeMarkdown components={mdComponents}>
                  {viewingAnalysis.analysis_text}
                </SafeMarkdown>
              </div>
            </div>
          )}

          {/* ── Nova análise tab ── */}
          {!viewingAnalysis && activeTab === "nova" && (
            <div className="space-y-5">
              {/* Segment */}
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase mb-2">Segmento</p>
                <div className="flex flex-wrap gap-2">
                  {SEGMENTS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSegment(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        segment === s
                          ? segmentBadgeCls(s) + " ring-1 ring-offset-1 ring-offset-zinc-950 ring-current"
                          : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Focus areas */}
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase mb-2">Focos de análise</p>
                <div className="flex flex-wrap gap-2">
                  {FOCUS_OPTIONS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => toggleFocus(f)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        focusAreas.includes(f)
                          ? "bg-emerald-900/40 text-emerald-300 border-emerald-600"
                          : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Extra observation */}
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase mb-2">Observação extra <span className="normal-case font-normal text-zinc-600">(opcional)</span></p>
                <textarea
                  value={extraObservation}
                  onChange={(e) => setExtraObservation(e.target.value)}
                  placeholder="Ex: Usuários de SP com streak maior que 3 dias…"
                  rows={3}
                  className="w-full rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm px-3 py-2 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
                />
              </div>

              {/* Info */}
              <p className="text-xs text-zinc-600">
                {profiles.length} perfis DAU serão enviados para análise.
              </p>

              {/* Error */}
              {error && <p className="text-xs text-red-400">{error}</p>}

              {/* Button */}
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={loading || profiles.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando perfis...</>
                  : <><FlaskConical className="w-4 h-4" /> Analisar com Gemini</>}
              </button>
            </div>
          )}

          {/* ── Histórico tab ── */}
          {!viewingAnalysis && activeTab === "historico" && (
            <div className="space-y-3">
              {historyLoading && (
                <div className="flex items-center gap-2 text-zinc-500 text-sm py-8 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" /> Carregando histórico…
                </div>
              )}

              {!historyLoading && historyList.length === 0 && (
                <p className="text-sm text-zinc-500 italic text-center py-8">
                  Nenhuma análise salva ainda.
                </p>
              )}

              {!historyLoading && historyList.map((item) => (
                <HistoryCard
                  key={item.id}
                  item={item}
                  onView={setViewingAnalysis}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
