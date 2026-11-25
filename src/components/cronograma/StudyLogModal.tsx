'use client';

// Registro manual de estudo (lista do professor, livro, aula gravada…).
// Fica no diário; não entra no nível nem nos erros (só questão respondida aqui conta).
// Com um card de estudo aberto, registrar também conclui o card.

import { useEffect, useState } from 'react';
import { Loader2, NotebookPen } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { addDays, formatDayMonth } from '@/lib/cronograma';
import { useStudentThemeRoot } from '@/hooks/useStudentThemeRoot';

export interface StudyLogTarget {
  itemId?: string;
  topic?: string;
  subject?: string | null;
}

export interface StudyLogPayload {
  item_id?: string;
  logged_on: string;
  subject?: string;
  minutes?: number;
  questions?: number;
  correct?: number;
  note?: string;
}

const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13.5px] text-slate-900 outline-none focus:border-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-white';
const label = 'mb-1 block text-[12px] font-semibold text-slate-600 dark:text-white/60';

function num(v: string): number | undefined {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function StudyLogModal({
  target, today, busy, onClose, onSave,
}: {
  target: StudyLogTarget | null;
  today: string;
  busy?: boolean;
  onClose: () => void;
  onSave: (p: StudyLogPayload) => void;
}) {
  const themeRoot = useStudentThemeRoot();
  const [day, setDay] = useState(today);
  const [subject, setSubject] = useState('');
  const [minutes, setMinutes] = useState('');
  const [questions, setQuestions] = useState('');
  const [correct, setCorrect] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!target) return;
    setDay(today); setSubject(target.subject ?? ''); setMinutes(''); setQuestions(''); setCorrect(''); setNote('');
  }, [target, today]);

  const q = num(questions);
  const c = num(correct);
  const m = num(minutes);
  const invalid = (q !== undefined && c !== undefined && c > q) || (!m && !q && !target?.itemId);
  const days = Array.from({ length: 8 }, (_, k) => addDays(today, -k));

  const save = () => {
    if (invalid) return;
    onSave({
      ...(target?.itemId ? { item_id: target.itemId } : {}),
      logged_on: day,
      ...(subject.trim() && !target?.itemId ? { subject: subject.trim() } : {}),
      ...(m !== undefined ? { minutes: m } : {}),
      ...(q !== undefined ? { questions: q } : {}),
      ...(c !== undefined ? { correct: c } : {}),
      ...(note.trim() ? { note: note.trim().slice(0, 500) } : {}),
    });
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md rounded-2xl dark:border-white/10 dark:bg-slate-900 dark:text-white" container={themeRoot}>
        {target && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display text-[18px] text-slate-900 dark:text-white">
                <NotebookPen className="h-5 w-5" style={{ color: 'var(--brand-ink)' }} /> Registrar estudo
              </DialogTitle>
              <DialogDescription className="text-[12.5px] text-slate-500 dark:text-white/60">
                {target.topic
                  ? <>Estudou <b>{target.topic}</b> fora da plataforma? Registrar conclui o card.</>
                  : 'Estudou fora da plataforma? Anote aqui para acompanhar seu tempo.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label} htmlFor="log-day">Dia</label>
                  <select id="log-day" className={input} value={day} onChange={(e) => setDay(e.target.value)}>
                    {days.map((d) => <option key={d} value={d}>{d === today ? 'Hoje' : formatDayMonth(d)}</option>)}
                  </select>
                </div>
                <div>
                  <label className={label} htmlFor="log-min">Minutos</label>
                  <input id="log-min" className={input} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="ex.: 45" />
                </div>
              </div>
              {!target.itemId && (
                <div>
                  <label className={label} htmlFor="log-subj">Matéria</label>
                  <input id="log-subj" className={input} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={80} placeholder="ex.: Matemática" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label} htmlFor="log-q">Questões feitas</label>
                  <input id="log-q" className={input} inputMode="numeric" value={questions} onChange={(e) => setQuestions(e.target.value)} />
                </div>
                <div>
                  <label className={label} htmlFor="log-c">Acertos</label>
                  <input id="log-c" className={input} inputMode="numeric" value={correct} onChange={(e) => setCorrect(e.target.value)} />
                </div>
              </div>
              <div>
                <label className={label} htmlFor="log-note">Observação</label>
                <textarea id="log-note" className={`${input} min-h-[64px]`} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="ex.: lista do professor, cap. 3 do livro" />
              </div>
              {q !== undefined && c !== undefined && c > q && (
                <p className="text-[12px] font-semibold text-rose-600">Os acertos não podem passar das questões feitas.</p>
              )}
              <p className="text-[11.5px] text-slate-500 dark:text-white/45">
                O registro vai para o seu diário. Ele não muda seu nível nem seus erros: para isso, responda questões aqui.
              </p>
            </div>
            <div className="flex justify-end">
              <button type="button" disabled={busy || invalid} onClick={save}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50"
                style={{ background: 'var(--brand-ink)' }}>
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Registrar
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
