"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { BrainCircuit, Plus, Trash2, Loader2, RefreshCw, Lock, PartyPopper, CheckCircle2, BarChart2 } from "lucide-react";
import FlashcardCreator from "@/components/flashcards/FlashcardCreator";
import FlashcardReview from "@/components/flashcards/FlashcardReview";
import FlashcardPreferences from "@/components/flashcards/FlashcardPreferences";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:5000";

const FREE_LIMIT = 20;

interface Flashcard {
  id: string;
  front: string;
  back: string;
  subject: string | null;
  source: string;
  created_at: string;
}

interface DueCard {
  id: string;
  front: string;
  back: string;
  subject: string | null;
}

interface Preferences {
  review_times: string[];
  easy_days: number;
  medium_days: number;
  hard_days: number;
  daily_limit: number;
  timezone: string;
  enabled: boolean;
}

interface FlashcardStats {
  total_reviews: number;
  easy_count: number;
  medium_count: number;
  hard_count: number;
  next_review_at: string | null;
  last_reviewed_at: string | null;
}

type Tab = "cards" | "review" | "preferences";

export default function FlashcardsPage() {
  const [tab, setTab] = useState<Tab>("cards");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [dueCards, setDueCards] = useState<DueCard[]>([]);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loadingCards, setLoadingCards] = useState(true);
  const [loadingDue, setLoadingDue] = useState(true);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reviewDone, setReviewDone] = useState(false);
  const [stats, setStats] = useState<Record<string, FlashcardStats>>({});
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const supabase = createClient();

  const fetchCards = useCallback(async () => {
    setLoadingCards(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${API_URL}/api/student/flashcards/`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setCards(json.cards ?? []);
    } finally {
      setLoadingCards(false);
    }
  }, [supabase]);

  const fetchDue = useCallback(async () => {
    setLoadingDue(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${API_URL}/api/student/flashcards/due`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setDueCards(json.cards ?? []);
    } finally {
      setLoadingDue(false);
    }
  }, [supabase]);

  const fetchPreferences = useCallback(async () => {
    setLoadingPrefs(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${API_URL}/api/student/flashcards/preferences`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setPreferences(json.preferences);
    } finally {
      setLoadingPrefs(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchCards();
    fetchDue();
    fetchPreferences();
  }, [fetchCards, fetchDue, fetchPreferences]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");
      const res = await fetch(`${API_URL}/api/student/flashcards/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Erro ao deletar");
      }
      setCards((prev) => prev.filter((c) => c.id !== id));
      toast.success("Card removido.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setDeletingId(null);
    }
  }

  const fetchStats = useCallback(async (cardId: string) => {
    if (stats[cardId]) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(
        `${API_URL}/api/student/flashcards/${cardId}/stats`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      if (!res.ok) return;
      const json = await res.json();
      setStats((prev) => ({ ...prev, [cardId]: json.stats }));
    } catch {}
  }, [stats, supabase]);

  function handleReviewDone() {
    setReviewDone(true);
    fetchDue();
  }

  const handleCardReviewed = useCallback((cardId: string) => {
    setDueCards((prev) => prev.filter((c) => c.id !== cardId));
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: "cards", label: "Meus Cards" },
    { id: "review", label: `Revisar${dueCards.length > 0 ? ` (${dueCards.length})` : ""}` },
    { id: "preferences", label: "Preferências" },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30">
            <BrainCircuit className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Flashcards</h1>
            <p className="text-sm text-slate-500">Revisão espaçada para memorização eficiente</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (limitReached) {
              toast.error("Limite de flashcards atingido. Faça upgrade para criar mais.");
              return;
            }
            setShowCreator(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 transition-colors"
        >
          {limitReached ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          Novo card
        </button>
      </div>

      {/* Limit banner */}
      {limitReached && (
        <div className="mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center gap-3">
          <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              Limite de {FREE_LIMIT} cards atingido
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              Faça upgrade para o plano premium e crie cards ilimitados.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              if (t.id === "review") setReviewDone(false);
            }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Meus Cards */}
      {tab === "cards" && (
        <div>
          {loadingCards ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : cards.length === 0 ? (
            <div className="text-center py-16">
              <BrainCircuit className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Nenhum flashcard ainda.</p>
              <p className="text-slate-400 text-xs mt-1">Clique em &quot;Novo card&quot; para começar.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 text-right">{cards.length} {cards.length === 1 ? "card" : "cards"}</p>
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 transition-colors p-4"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {card.subject && (
                        <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full mb-1 inline-block">
                          {card.subject}
                        </span>
                      )}
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-2">{card.front}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{card.back}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const next = expandedCard === card.id ? null : card.id;
                          setExpandedCard(next);
                          if (next) fetchStats(card.id);
                        }}
                        title="Ver estatísticas"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <BarChart2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(card.id)}
                        disabled={deletingId === card.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                      >
                        {deletingId === card.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Painel de estatísticas */}
                  {expandedCard === card.id && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      {!stats[card.id] ? (
                        <div className="flex items-center gap-2 text-slate-400 text-xs">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Carregando estatísticas...
                        </div>
                      ) : stats[card.id].total_reviews === 0 ? (
                        <p className="text-xs text-slate-400 italic">Ainda não revisado.</p>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-3">
                            <span className="text-xs text-emerald-500 font-medium">
                              Fácil: {stats[card.id].easy_count}x
                            </span>
                            <span className="text-xs text-amber-500 font-medium">
                              Médio: {stats[card.id].medium_count}x
                            </span>
                            <span className="text-xs text-red-500 font-medium">
                              Difícil: {stats[card.id].hard_count}x
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            <span className="text-xs text-slate-400">
                              Total: {stats[card.id].total_reviews} revisão(ões)
                            </span>
                            {stats[card.id].next_review_at && (
                              <span className="text-xs text-slate-400">
                                Próxima:{" "}
                                <span className="text-slate-600 dark:text-slate-300">
                                  {new Date(stats[card.id].next_review_at!).toLocaleDateString("pt-BR")}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Revisar */}
      {tab === "review" && (
        <div>
          {loadingDue ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : reviewDone ? (
            <div className="text-center py-16">
              <PartyPopper className="w-12 h-12 text-blue-400 mx-auto mb-3" />
              <p className="text-slate-700 dark:text-slate-200 font-semibold">Revisão concluída!</p>
              <p className="text-slate-400 text-sm mt-1">Volte mais tarde para novos cards.</p>
              <button
                type="button"
                onClick={() => { setReviewDone(false); fetchDue(); }}
                className="mt-4 inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline"
              >
                <RefreshCw className="w-4 h-4" /> Verificar novamente
              </button>
            </div>
          ) : dueCards.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-slate-700 dark:text-slate-200 font-semibold">Nenhum card para revisar agora</p>
              <p className="text-slate-400 text-sm mt-1">
                {cards.length === 0
                  ? "Crie seus primeiros flashcards para começar."
                  : "Todos os cards estão em dia. Volte mais tarde."}
              </p>
            </div>
          ) : preferences ? (
            <FlashcardReview
              apiUrl={API_URL}
              cards={dueCards}
              preferences={preferences}
              onDone={handleReviewDone}
              onCardReviewed={handleCardReviewed}
            />
          ) : null}
        </div>
      )}

      {/* Tab: Preferências */}
      {tab === "preferences" && (
        <div>
          {loadingPrefs ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : preferences ? (
            <FlashcardPreferences
              apiUrl={API_URL}
              preferences={preferences}
              onSaved={(prefs) => {
                setPreferences(prefs);
                toast.success("Preferências atualizadas!");
              }}
            />
          ) : null}
        </div>
      )}

      {/* Creator modal */}
      {showCreator && (
        <FlashcardCreator
          apiUrl={API_URL}
          onCreated={(card) => {
            setCards((prev) => [card as Flashcard, ...prev]);
            if (cards.length + 1 >= FREE_LIMIT) setLimitReached(true);
          }}
          onLimitReached={() => setLimitReached(true)}
          onClose={() => setShowCreator(false)}
        />
      )}
    </div>
  );
}
