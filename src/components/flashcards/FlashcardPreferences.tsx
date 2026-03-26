"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, X, Loader2 } from "lucide-react";

interface Preferences {
  review_times: string[];
  easy_days: number;
  medium_days: number;
  hard_days: number;
  daily_limit: number;
  timezone: string;
  enabled: boolean;
}

interface Props {
  apiUrl: string;
  preferences: Preferences;
  onSaved: (prefs: Preferences) => void;
}

export default function FlashcardPreferences({ apiUrl, preferences, onSaved }: Props) {
  const [times, setTimes] = useState<string[]>(preferences.review_times);
  const [easyDays, setEasyDays] = useState(preferences.easy_days);
  const [mediumDays, setMediumDays] = useState(preferences.medium_days);
  const [hardDays, setHardDays] = useState(preferences.hard_days);
  const [dailyLimit, setDailyLimit] = useState(preferences.daily_limit ?? 6);
  const [enabled, setEnabled] = useState(preferences.enabled);
  const [newTime, setNewTime] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  function addTime() {
    if (!newTime) return;
    if (times.includes(newTime)) {
      toast.error("Horário já adicionado.");
      return;
    }
    if (times.length >= 5) {
      toast.error("Máximo de 5 horários.");
      return;
    }
    setTimes((prev) => [...prev, newTime].sort());
    setNewTime("");
  }

  function removeTime(t: string) {
    setTimes((prev) => prev.filter((x) => x !== t));
  }

  async function handleSave() {
    if (times.length === 0) {
      toast.error("Adicione pelo menos um horário de revisão.");
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      const res = await fetch(`${apiUrl}/api/student/flashcards/preferences`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          review_times: times,
          easy_days: easyDays,
          medium_days: mediumDays,
          hard_days: hardDays,
          daily_limit: dailyLimit,
          enabled,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao salvar preferências");

      toast.success("Preferências salvas!");
      onSaved(json.preferences);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      {/* Enable toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Revisões via WhatsApp</p>
          <p className="text-xs text-slate-500 mt-0.5">Receber flashcards para revisar pelo WhatsApp</p>
        </div>
        <button
          type="button"
          onClick={() => setEnabled((v) => !v)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Review times */}
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 block">
          Horários de envio
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {times.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800"
            >
              {t}
              <button
                type="button"
                onClick={() => removeTime(t)}
                className="hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {times.length === 0 && (
            <p className="text-xs text-slate-400">Nenhum horário configurado.</p>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 px-3 py-2 focus:outline-none focus:border-blue-400"
          />
          <button
            type="button"
            onClick={addTime}
            disabled={!newTime}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-3 py-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </div>
      </div>

      {/* Cards por dia */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">
          Flashcards por dia
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={6}
            step={1}
            value={dailyLimit}
            onChange={(e) => setDailyLimit(Number(e.target.value))}
            className="flex-1 accent-blue-600"
          />
          <span className="text-slate-800 dark:text-slate-100 font-bold w-6 text-center">
            {dailyLimit === 0 ? "—" : dailyLimit}
          </span>
        </div>
        <p className="text-xs text-slate-400">
          {dailyLimit === 0
            ? "Envio de flashcards desabilitado."
            : `Você receberá até ${dailyLimit} flashcard${dailyLimit > 1 ? "s" : ""} por dia pelo WhatsApp.`}
        </p>
      </div>

      {/* Days per difficulty */}
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 block">
          Dias até próxima revisão
        </label>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Fácil</label>
            <input
              type="number"
              min={1}
              max={60}
              value={easyDays}
              onChange={(e) => setEasyDays(Number(e.target.value))}
              className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 px-3 py-2 focus:outline-none focus:border-emerald-400 text-center"
            />
            <span className="text-xs text-slate-400 text-center">dias</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-amber-600 dark:text-amber-400">Médio</label>
            <input
              type="number"
              min={1}
              max={60}
              value={mediumDays}
              onChange={(e) => setMediumDays(Number(e.target.value))}
              className="rounded-lg border border-amber-200 dark:border-amber-800 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 px-3 py-2 focus:outline-none focus:border-amber-400 text-center"
            />
            <span className="text-xs text-slate-400 text-center">dias</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-red-600 dark:text-red-400">Difícil</label>
            <input
              type="number"
              min={1}
              max={60}
              value={hardDays}
              onChange={(e) => setHardDays(Number(e.target.value))}
              className="rounded-lg border border-red-200 dark:border-red-800 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 px-3 py-2 focus:outline-none focus:border-red-400 text-center"
            />
            <span className="text-xs text-slate-400 text-center">dias</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 transition-colors"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : "Salvar preferências"}
      </button>
    </div>
  );
}
