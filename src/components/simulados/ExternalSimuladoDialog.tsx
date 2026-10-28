'use client';

/**
 * Formulário de criar/editar um simulado externo (só a nota): nome, datas dos
 * dois dias, acertos por área, nota da redação e observações.
 */

import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { todayBrtDateKey } from '@/lib/brt-date';
import {
  EXTERNAL_AREAS, ENEM_QUESTIONS_PER_AREA, type ExternalArea, type ExternalSimulado,
} from '@/lib/external-simulados';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = criar um novo. */
  simulado: ExternalSimulado | null;
  accessToken: string | null;
  brandText: string;
  onSaved: (simulado: ExternalSimulado) => void;
  onDeleted: (id: string) => void;
}

type AreaFields = Record<ExternalArea, { correct: string; total: string }>;

interface FormState {
  title: string;
  day1: string;
  day2: string;
  noSecondDay: boolean;
  isEnemStandard: boolean;
  areas: AreaFields;
  essay: string;
  notes: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm outline-none transition-all ' +
  'placeholder:font-medium placeholder:text-slate-400 hover:border-slate-300 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:disabled:bg-slate-800/50';

const labelClass = 'mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300';

// Campos de acertos/total: sem as setinhas do navegador (roubam espaço) e
// número centralizado — no modo "fora do padrão" são dois campos por área.
const scoreInputClass =
  `${inputClass} px-2 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`;

function toFormState(sim: ExternalSimulado | null): FormState {
  const areas = Object.fromEntries(
    EXTERNAL_AREAS.map(({ key }) => [
      key,
      {
        correct: sim?.[`${key}_correct`]?.toString() ?? '',
        total: sim?.[`${key}_total`]?.toString() ?? '',
      },
    ]),
  ) as AreaFields;
  return {
    title: sim?.title && sim.title !== 'Sem título' ? sim.title : '',
    day1: sim?.day1_date ?? todayBrtDateKey(),
    day2: sim?.day2_date ?? '',
    noSecondDay: sim ? !sim.day2_date : false,
    isEnemStandard: sim?.is_enem_standard ?? true,
    areas,
    essay: sim?.essay_score?.toString() ?? '',
    notes: sim?.notes ?? '',
  };
}

export function ExternalSimuladoDialog({
  open, onOpenChange, simulado, accessToken, brandText, onSaved, onDeleted,
}: Props) {
  // O pai remonta o diálogo (key) a cada abertura, então o estado inicial
  // sempre reflete o simulado sendo editado.
  const [form, setForm] = useState<FormState>(() => toFormState(simulado));
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const today = todayBrtDateKey();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setArea = (area: ExternalArea, field: 'correct' | 'total', value: string) =>
    setForm((f) => ({ ...f, areas: { ...f.areas, [area]: { ...f.areas[area], [field]: value } } }));

  const totalCorrect = EXTERNAL_AREAS.reduce((sum, { key }) => {
    const n = parseInt(form.areas[key].correct, 10);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  const authFetch = (path: string, init: RequestInit) =>
    fetch(`${API_URL}/api/simulado/external${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || saving) return;

    const body: Record<string, unknown> = {
      title: form.title.trim(),
      day1_date: form.day1,
      day2_date: form.noSecondDay ? null : form.day2 || null,
      is_enem_standard: form.isEnemStandard,
      essay_score: form.essay || null,
      notes: form.notes,
    };
    for (const { key } of EXTERNAL_AREAS) {
      body[`${key}_correct`] = form.areas[key].correct || null;
      body[`${key}_total`] = form.isEnemStandard ? null : form.areas[key].total || null;
    }

    setSaving(true);
    try {
      const res = await authFetch(simulado ? `/${simulado.id}` : '', {
        method: simulado ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Não foi possível salvar o simulado.');
        return;
      }
      toast.success(simulado ? 'Simulado atualizado.' : 'Simulado adicionado.');
      onSaved(data.simulado as ExternalSimulado);
      onOpenChange(false);
    } catch {
      toast.error('Não foi possível salvar o simulado.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!simulado || !accessToken || saving) return;
    setSaving(true);
    try {
      const res = await authFetch(`/${simulado.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Não foi possível excluir o simulado.');
        return;
      }
      toast.success('Simulado excluído.');
      onDeleted(simulado.id);
      onOpenChange(false);
    } catch {
      toast.error('Não foi possível excluir o simulado.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto dark:border-slate-800 dark:bg-slate-950">
        <DialogHeader>
          <DialogTitle className="dark:text-slate-100">
            {simulado ? 'Editar simulado externo' : 'Novo simulado externo'}
          </DialogTitle>
          <DialogDescription className="dark:text-slate-400">
            Registre a nota de um simulado feito fora da plataforma para acompanhar sua evolução.
            Deixe em branco as áreas que você não fez.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nome + redação */}
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <div>
              <label htmlFor="ext-title" className={labelClass}>Simulado</label>
              <input
                id="ext-title"
                className={inputClass}
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Ex.: Simulado SAS 3, ENEM 2023..."
                maxLength={120}
              />
            </div>
            <div>
              <label htmlFor="ext-essay" className={labelClass}>Nota da redação</label>
              <input
                id="ext-essay"
                type="number"
                inputMode="numeric"
                min={0}
                max={1000}
                step={1}
                className={inputClass}
                value={form.essay}
                onChange={(e) => set('essay', e.target.value)}
                placeholder="0 a 1000"
              />
            </div>
          </div>

          {/* Datas */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="ext-day1" className={labelClass}>Dia 1</label>
              <input
                id="ext-day1"
                type="date"
                required
                max={today}
                className={inputClass}
                value={form.day1}
                onChange={(e) => set('day1', e.target.value)}
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label htmlFor="ext-day2" className="text-xs font-bold text-slate-600 dark:text-slate-300">Dia 2</label>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={form.noSecondDay}
                    onChange={(e) => set('noSecondDay', e.target.checked)}
                    className="h-3.5 w-3.5 rounded accent-[var(--brand-primary)]"
                  />
                  Não há segundo dia
                </label>
              </div>
              <input
                id="ext-day2"
                type="date"
                min={form.day1 || undefined}
                max={today}
                disabled={form.noSecondDay}
                className={inputClass}
                value={form.noSecondDay ? '' : form.day2}
                onChange={(e) => set('day2', e.target.value)}
              />
            </div>
          </div>

          {/* Acertos */}
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Acertos</h3>
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <Switch
                  checked={!form.isEnemStandard}
                  onCheckedChange={(checked) => set('isEnemStandard', !checked)}
                  className={!form.isEnemStandard ? 'bg-[var(--brand-primary)]' : 'dark:bg-slate-700'}
                  aria-label="Fora do padrão ENEM"
                />
                Fora do padrão ENEM
              </label>
            </div>

            <div className={`grid grid-cols-2 gap-3 ${form.isEnemStandard ? 'sm:grid-cols-5' : 'sm:grid-cols-4'}`}>
              {EXTERNAL_AREAS.map(({ key, label }) => {
                const max = form.isEnemStandard
                  ? ENEM_QUESTIONS_PER_AREA
                  : parseInt(form.areas[key].total, 10) || undefined;
                return (
                  <div key={key}>
                    <label htmlFor={`ext-${key}`} className={labelClass}>{label}</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        id={`ext-${key}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={max}
                        step={1}
                        className={scoreInputClass}
                        value={form.areas[key].correct}
                        onChange={(e) => setArea(key, 'correct', e.target.value)}
                        placeholder="—"
                      />
                      {form.isEnemStandard ? (
                        <span className="shrink-0 text-xs font-semibold text-slate-400">/45</span>
                      ) : (
                        <>
                          <span className="shrink-0 text-xs font-semibold text-slate-400">/</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={200}
                            step={1}
                            aria-label={`Total de questões de ${label}`}
                            className={scoreInputClass}
                            value={form.areas[key].total}
                            onChange={(e) => setArea(key, 'total', e.target.value)}
                            placeholder="total"
                          />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className={form.isEnemStandard ? 'col-span-2 sm:col-span-1' : 'col-span-2 sm:col-span-4'}>
                <span className={labelClass}>Total de acertos</span>
                <div className="flex h-[42px] items-center justify-center rounded-xl bg-slate-100 text-base font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {totalCorrect}
                </div>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label htmlFor="ext-notes" className={labelClass}>Observações</label>
            <textarea
              id="ext-notes"
              rows={3}
              maxLength={2000}
              className={`${inputClass} resize-y`}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Como foi a prova, o que revisar, condições (cansaço, tempo)..."
            />
          </div>

          {/* Ações */}
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {simulado && (
                confirmDelete ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Excluir este simulado?
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={saving}
                      className="rounded-lg bg-red-600 px-2.5 py-1.5 font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      Excluir
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-lg px-2.5 py-1.5 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    <Trash2 size={14} /> Excluir
                  </button>
                )
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 sm:flex-none"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !accessToken}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50 sm:flex-none"
                style={{ background: 'var(--brand-primary)', color: brandText }}
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {simulado ? 'Salvar alterações' : 'Adicionar simulado'}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
