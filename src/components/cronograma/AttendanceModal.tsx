'use client';

// Aula da turma (card roxo): "Vou faltar" (aula futura) ou "Faltei" (aula passada).
// - Vou faltar + vou estudar no horário → o tempo da aula entra no dia, com a matéria dela primeiro.
// - Faltei sem estudar → o backend marca uma reposição da matéria nos próximos dias.
// Desfazer = "Vou à aula" / "Fui à aula".

import { useEffect, useState } from 'react';
import { ExternalLink, GraduationCap, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDayMonth, formatMinutes, hhmm, type ClassOccurrence } from '@/lib/cronograma';
import { useStudentThemeRoot } from '@/hooks/useStudentThemeRoot';

export interface AttendancePayload {
  occurrence_key: string;
  status: 'vai_faltar' | 'faltou' | 'presente';
  will_study?: boolean;
  studied_instead?: boolean;
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`flex-1 rounded-xl border px-3 py-2 text-[13px] font-bold transition ${active
        ? 'border-violet-500 bg-violet-50 text-violet-800 dark:border-violet-400 dark:bg-violet-500/15 dark:text-violet-200'
        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/75'}`}>
      {children}
    </button>
  );
}

export function AttendanceModal({
  occ, today, busy, onClose, onSave,
}: {
  occ: ClassOccurrence | null;
  today: string;
  busy?: boolean;
  onClose: () => void;
  onSave: (p: AttendancePayload) => void;
}) {
  const themeRoot = useStudentThemeRoot();
  const past = !!occ && occ.date < today;
  const isToday = !!occ && occ.date === today;
  const a = occ?.attendance ?? null;
  // Aula de hoje pode ser marcada dos dois jeitos: antes ("vou faltar") ou depois ("faltei").
  const [mode, setMode] = useState<'vai_faltar' | 'faltou'>('vai_faltar');
  const [study, setStudy] = useState<boolean | null>(null);

  useEffect(() => {
    if (!occ) return;
    setMode(a?.status ?? (past ? 'faltou' : 'vai_faltar'));
    setStudy(a ? (a.status === 'faltou' ? a.studied_instead : a.will_study) : null);
  }, [occ, a, past]);

  const when = occ?.starts_at ? `${hhmm(occ.starts_at)}–${hhmm(occ.ends_at)}` : '';
  const save = () => {
    if (!occ || study === null) return;
    onSave(mode === 'vai_faltar'
      ? { occurrence_key: occ.key, status: 'vai_faltar', will_study: study }
      : { occurrence_key: occ.key, status: 'faltou', studied_instead: study });
  };

  return (
    <Dialog open={!!occ} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md rounded-2xl dark:border-white/10 dark:bg-slate-900 dark:text-white" container={themeRoot}>
        {occ && (
          <>
            <DialogHeader>
              <span className="mb-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                <GraduationCap className="h-3 w-3" /> Aula · {formatDayMonth(occ.date)}{when ? ` · ${when}` : ''}
              </span>
              <DialogTitle className="font-display text-[19px] text-slate-900 dark:text-white">{occ.title || occ.subject}</DialogTitle>
              <DialogDescription className="text-[12.5px] text-slate-500 dark:text-white/60">
                {occ.subject} · {formatMinutes(occ.minutes)}. A aula não ocupa o seu tempo de estudo.
              </DialogDescription>
            </DialogHeader>

            {occ.plurall_url && (
              <a href={occ.plurall_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-[12.5px] font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/10">
                <ExternalLink className="h-3.5 w-3.5" /> Material no Plurall
              </a>
            )}

            {isToday && (
              <div className="flex gap-2">
                <Choice active={mode === 'vai_faltar'} onClick={() => { setMode('vai_faltar'); setStudy(null); }}>Vou faltar</Choice>
                <Choice active={mode === 'faltou'} onClick={() => { setMode('faltou'); setStudy(null); }}>Já faltei</Choice>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[13px] font-semibold text-slate-700 dark:text-white/80">
                {mode === 'vai_faltar' ? 'Vai estudar no horário da aula?' : 'Você estudou no horário da aula?'}
              </p>
              <div className="flex gap-2">
                <Choice active={study === true} onClick={() => setStudy(true)}>Sim</Choice>
                <Choice active={study === false} onClick={() => setStudy(false)}>Não</Choice>
              </div>
              <p className="text-[12px] text-slate-500 dark:text-white/50">
                {mode === 'vai_faltar'
                  ? study === true
                    ? `O cronograma ganha ${formatMinutes(occ.minutes)} nesse dia, começando por ${occ.subject}.`
                    : study === false ? 'O dia fica como está; a matéria da aula sai da frente da fila.' : ''
                  : study === false
                    ? `Vamos marcar uma reposição de ${occ.subject} nos próximos dias.`
                    : study === true ? 'Boa! Nada muda no cronograma.' : ''}
              </p>
            </div>

            <div className="mt-1 flex items-center justify-between gap-2">
              {a ? (
                <button type="button" disabled={busy} onClick={() => onSave({ occurrence_key: occ.key, status: 'presente' })}
                  className="rounded-full px-3 py-2 text-[12.5px] font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-white/55 dark:hover:bg-white/10">
                  {past ? 'Na verdade, fui à aula' : 'Vou à aula'}
                </button>
              ) : <span />}
              <button type="button" disabled={busy || study === null} onClick={save}
                className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-2 text-[13px] font-bold text-white hover:bg-violet-700 disabled:opacity-50">
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {mode === 'vai_faltar' ? 'Confirmar falta' : 'Registrar falta'}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
