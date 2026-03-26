"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";

const ENEM_SUBJECTS = [
  "Matemática", "Português", "Redação",
  "História", "Geografia", "Filosofia", "Sociologia",
  "Física", "Química", "Biologia",
  "Inglês", "Espanhol", "Artes", "Educação Física",
];

interface Flashcard {
  id: string;
  front: string;
  back: string;
  subject: string | null;
  source: string;
  created_at: string;
}

interface Props {
  apiUrl: string;
  onCreated: (card: Flashcard) => void;
  onLimitReached: () => void;
  onClose: () => void;
}

export default function FlashcardCreator({ apiUrl, onCreated, onLimitReached, onClose }: Props) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSave() {
    if (!front.trim() || !back.trim()) {
      toast.error("Preencha a frente e o verso do card.");
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      const res = await fetch(`${apiUrl}/api/student/flashcards/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          front: front.trim(),
          back: back.trim(),
          subject: subject || null,
        }),
      });

      const json = await res.json();

      if (res.status === 403 && json.error === "limite_atingido") {
        onLimitReached();
        onClose();
        return;
      }

      if (!res.ok) throw new Error(json.error || "Erro ao criar flashcard");

      toast.success("Card criado! 🃏");
      onCreated(json.card);
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Novo Flashcard</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
              Frente do card <span className="text-red-400">*</span>
            </label>
            <textarea
              value={front}
              onChange={(e) => setFront(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="O que você quer lembrar? Ex: O que é fotossíntese?"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 px-3 py-2 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 resize-none"
            />
            <p className="text-right text-xs text-slate-400 mt-0.5">{front.length}/200</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
              Verso do card <span className="text-red-400">*</span>
            </label>
            <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="A resposta completa..."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 px-3 py-2 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 resize-none"
            />
            <p className="text-right text-xs text-slate-400 mt-0.5">{back.length}/500</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
              Matéria <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 px-3 py-2 focus:outline-none focus:border-blue-400"
            >
              <option value="">Selecionar matéria...</option>
              {ENEM_SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || !front.trim() || !back.trim()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 transition-colors"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : "Salvar flashcard"}
          </button>
        </div>
      </div>
    </div>
  );
}
