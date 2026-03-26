"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  subject: string | null;
}

interface Preferences {
  easy_days: number;
  medium_days: number;
  hard_days: number;
}

interface Props {
  apiUrl: string;
  cards: Flashcard[];
  preferences: Preferences;
  onDone: () => void;
  onCardReviewed: (cardId: string) => void;
}

export default function FlashcardReview({ apiUrl, cards, preferences, onDone, onCardReviewed }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  // Captura o total inicial uma única vez — persiste enquanto o componente estiver montado
  const initialTotal = useRef(cards.length);
  const supabase = createClient();

  // Sempre mostra o primeiro card da lista; o pai remove cards[0] ao chamar onCardReviewed
  const card = cards[0];
  const progress = initialTotal.current > 0
    ? Math.round((reviewedCount / initialTotal.current) * 100)
    : 0;

  async function handleDifficulty(difficulty: "easy" | "medium" | "hard") {
    if (!card) return;

    const cardId = card.id;
    const isLast = cards.length === 1;

    // ── Update otimista ────────────────────────────────────────────────────────
    // Chama antes do POST para que o pai remova o card da lista imediatamente,
    // atualizando o contador na aba sem esperar a rede.
    if (isLast) {
      toast.success("Revisão concluída!");
      onDone();
    }
    onCardReviewed(cardId);
    setReviewedCount((prev) => prev + 1);
    setRevealed(false);

    // ── POST em background ─────────────────────────────────────────────────────
    // Falha não reverte o contador — a próxima sessão corrigirá automaticamente.
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      const res = await fetch(`${apiUrl}/api/student/flashcards/${cardId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ difficulty }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Erro ao registrar revisão");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar revisão");
    }
  }

  if (!card) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{reviewedCount + 1} / {initialTotal.current}</span>
        <span>{card.subject ?? "Sem matéria"}</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Card */}
      <div className="min-h-[220px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm flex flex-col">
        <div className="flex-1 p-6 flex flex-col justify-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Pergunta</p>
          <p className="text-slate-800 dark:text-slate-100 text-base leading-relaxed">{card.front}</p>
        </div>

        {revealed && (
          <>
            <div className="h-px bg-slate-100 dark:bg-slate-800" />
            <div className="flex-1 p-6 flex flex-col justify-center bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
              <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide mb-3">Resposta</p>
              <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{card.back}</p>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold py-3 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Revelar resposta
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => handleDifficulty("hard")}
            className="flex flex-col items-center gap-1 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 py-3 text-sm font-semibold transition-colors"
          >
            Difícil
            <span className="text-xs font-normal opacity-70">{preferences.hard_days} dias</span>
          </button>

          <button
            type="button"
            onClick={() => handleDifficulty("medium")}
            className="flex flex-col items-center gap-1 rounded-xl bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 py-3 text-sm font-semibold transition-colors"
          >
            Médio
            <span className="text-xs font-normal opacity-70">{preferences.medium_days} dias</span>
          </button>

          <button
            type="button"
            onClick={() => handleDifficulty("easy")}
            className="flex flex-col items-center gap-1 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 py-3 text-sm font-semibold transition-colors"
          >
            Fácil
            <span className="text-xs font-normal opacity-70">{preferences.easy_days} dias</span>
          </button>
        </div>
      )}
    </div>
  );
}
