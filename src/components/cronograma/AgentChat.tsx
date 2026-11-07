'use client';

// Chat com o agente do cronograma. A IA só SUGERE: toda resposta vira uma
// prévia (cards destacados no quadro) que o aluno confirma ou descarta.
// Chips de sugestão rápida resolvem os pedidos comuns sem IA (não gastam a cota).
//
// Visual: sem card de fundo — só o "balão" de vidro (input estilo AI Prompt Input,
// 21st.dev/@wensity) e os chips com ícone (estilo Prompt Input with Actions, @ibelick).

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUp, Loader2, Sparkles, Check, X, Undo2, MoveRight, Plus, Minus, Clock, AlertTriangle,
  CalendarX2, Feather, Target, RotateCcw, GraduationCap,
} from 'lucide-react';
import {
  AREA_STYLE, addDays, formatDayMonth, formatMinutes, type Area, type EditableTime, type Proposal,
} from '@/lib/cronograma';

type ChipBody = { chip: string; payload?: Record<string, string> };

const AREAS: Area[] = ['matematica', 'natureza', 'humanas', 'linguagens'];
// Limites do ajuste manual de tempo na prévia (iguais aos do backend).
const STEP_MIN = 15;
const STEP_MAX = 720;

// Balão "flutuando": fundo branco limpo, sem brilho no topo, com sombra embaixo.
const GLASS =
  'relative rounded-[22px] border border-slate-200/70 bg-white ' +
  'shadow-[0_2px_4px_-2px_rgba(15,23,42,0.06),0_22px_40px_-20px_rgba(15,23,42,0.35)] ' +
  'dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_22px_40px_-20px_rgba(0,0,0,0.8)]';

export function AgentChat({
  today,
  proposal,
  busy,
  canUndo,
  onSend,
  onChip,
  onConfirm,
  onDiscard,
  onUndo,
  onAdjust,
}: {
  today: string;
  proposal: Proposal | null;
  busy: boolean;
  canUndo: boolean;
  onSend: (message: string) => void;
  onChip: (body: ChipBody) => void;
  onConfirm: () => void;
  onDiscard: () => void;
  onUndo: () => void;
  /** Muda o tempo de uma operação da prévia direto no backend (sem IA, sem cota). */
  onAdjust?: (index: number, minutes: number) => void;
}) {
  const [text, setText] = useState('');
  const [picker, setPicker] = useState<'more_subject' | 'review_mistakes' | 'exam_day' | null>(null);
  const [examDate, setExamDate] = useState(addDays(today, 3));

  const send = () => {
    const t = text.trim();
    if (!t || busy) return;
    onSend(t);
    setText('');
  };

  const changes = proposal
    ? proposal.diff.moved.length + proposal.diff.added.length + proposal.diff.removed.length
    : 0;
  const shown = proposal
    ? Math.min(8, proposal.diff.moved.length) + Math.min(5, proposal.diff.added.length) + Math.min(5, proposal.diff.removed.length)
    : 0;
  const locked = busy || !!proposal;
  // Pergunta de sim/não do agente: responde com botões, nunca digitando.
  const asking = proposal?.status === 'proposed' && !!proposal.question;
  // Aviso "passou da rotina": vale só para a prévia em que foi aberto.
  const [warnState, setWarnState] = useState<{ rid: string; index: number; minutes: number } | null>(null);
  const warn = warnState && proposal && warnState.rid === proposal.request_id ? warnState : null;
  const routineMax = proposal?.routine_max_minutes ?? 0;
  const editable = proposal?.status === 'proposed' && onAdjust ? proposal.editable ?? [] : [];

  const step = (e: EditableTime, delta: number) => {
    if (!proposal || !onAdjust || busy) return;
    const target = Math.max(STEP_MIN, Math.min(STEP_MAX, e.minutes + delta));
    if (target === e.minutes) return;
    // Não é proibido passar da rotina: só pergunta, uma vez, quando cruza o limite.
    if (routineMax > 0 && target > routineMax && e.minutes <= routineMax) {
      setWarnState({ rid: proposal.request_id, index: e.index, minutes: target });
      return;
    }
    onAdjust(e.index, target);
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm"
            style={{ background: 'linear-gradient(135deg, var(--brand-primary), color-mix(in srgb, var(--brand-primary) 55%, #a855f7))' }}>
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="font-display text-[15px] font-bold leading-tight text-slate-900 dark:text-white">Assistente do cronograma</p>
            <p className="text-[11.5px] text-slate-500 dark:text-white/50">Peça um ajuste. Nada muda sem você confirmar.</p>
          </div>
        </div>
        {canUndo && !proposal && (
          <button type="button" onClick={onUndo} disabled={busy}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white/70 px-2.5 py-1.5 text-[12px] font-semibold text-slate-600 backdrop-blur hover:bg-white disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white/65">
            <Undo2 className="h-3.5 w-3.5" /> Desfazer última
          </button>
        )}
      </div>

      {/* Um cartão só que estica até a altura do painel ao lado: conversa no meio,
          atalhos e campo de mensagem embaixo. */}
      <div className={`${GLASS} flex flex-1 flex-col gap-3 p-3.5`}>
      <div className="flex flex-1 flex-col">
      <AnimatePresence initial={false} mode="popLayout">
        {proposal ? (
          <motion.div key={proposal.request_id}
            initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }}
            className="rounded-2xl rounded-tl-md bg-slate-50 p-3.5 dark:bg-white/5" aria-live="polite">
            <p className="relative flex items-start gap-2 text-[13px] text-slate-800 dark:text-white/85">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--brand-primary)' }} />
              <span>{proposal.reply || (proposal.status === 'proposed' ? 'Preparei estas mudanças:' : 'Não consegui aplicar esse pedido.')}</span>
            </p>
            {proposal.status === 'proposed' && (
              <div className="relative">
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto pl-6 text-[12px] text-slate-700 dark:text-white/70">
                  {proposal.diff.moved.slice(0, 8).map((m, k) => (
                    <li key={`m-${m.id ?? k}`} className="flex items-center gap-1">
                      <span className="truncate">{m.topic}</span>
                      <span className="shrink-0 text-slate-500">{formatDayMonth(m.from!)} <MoveRight className="inline h-3 w-3" /> {formatDayMonth(m.to!)}</span>
                    </li>
                  ))}
                  {proposal.diff.added.slice(0, 5).map((a, k) => (
                    <li key={`a-${k}`} className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                      <Plus className="h-3 w-3" /><span className="truncate">{a.topic}</span><span className="shrink-0">({formatDayMonth(a.to!)})</span>
                    </li>
                  ))}
                  {proposal.diff.removed.slice(0, 5).map((r, k) => (
                    <li key={`r-${r.id ?? k}`} className="flex items-center gap-1 text-slate-500">
                      <Minus className="h-3 w-3" /><span className="truncate">{r.topic}</span><span className="shrink-0">sai de {formatDayMonth(r.from!)}</span>
                    </li>
                  ))}
                  {changes > shown && <li className="text-slate-500">e mais {changes - shown} {changes - shown === 1 ? 'ajuste' : 'ajustes'}…</li>}
                  {changes === 0 && <li className="text-slate-500">Ajuste nas configurações (capacidade/prioridade); o quadro se reorganiza ao confirmar.</li>}
                </ul>
                {proposal.warnings.map((w, k) => (
                  <p key={k} className="mt-1 pl-6 text-[11.5px] font-semibold text-amber-800 dark:text-amber-200">{w.message}</p>
                ))}
                {editable.length > 0 && (
                  <div className="mt-2.5 space-y-1.5">
                    {editable.map((e) => (
                      <div key={e.index} role="group" aria-label={`Tempo de ${e.label}`}
                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-2.5 py-1.5 dark:border-white/10 dark:bg-white/5">
                        <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] font-semibold text-slate-700 dark:text-white/75">
                          <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--brand-primary)' }} />
                          <span className="truncate first-letter:uppercase">{e.label}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1">
                          <button type="button" aria-label="Menos 15 minutos" onClick={() => step(e, -15)}
                            disabled={busy || !!warn || e.minutes <= STEP_MIN}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 active:scale-95 disabled:opacity-40 dark:border-white/10 dark:bg-white/10 dark:text-white/80">
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span aria-live="polite" className={`min-w-[3.25rem] text-center text-[13.5px] font-bold tabular-nums ${routineMax > 0 && e.minutes > routineMax ? 'text-amber-700 dark:text-amber-300' : 'text-slate-900 dark:text-white'}`}>
                            {formatMinutes(e.minutes)}
                          </span>
                          <button type="button" aria-label="Mais 15 minutos" onClick={() => step(e, 15)}
                            disabled={busy || !!warn || e.minutes >= STEP_MAX}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 active:scale-95 disabled:opacity-40 dark:border-white/10 dark:bg-white/10 dark:text-white/80">
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {warn ? (
                  <div role="alertdialog" aria-label="Carga acima da rotina"
                    className="mt-3 rounded-xl border border-amber-200 bg-amber-50/90 p-3 dark:border-amber-400/25 dark:bg-amber-400/10">
                    <p className="flex items-start gap-2 text-[13px] text-amber-900 dark:text-amber-100">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        <b>Opa!</b> {formatMinutes(warn.minutes)} passa do seu dia mais puxado da rotina ({formatMinutes(routineMax)}).
                        Dá pra seguir, só cuidado pra não pesar demais. Quer manter assim?
                      </span>
                    </p>
                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      <button type="button" disabled={busy}
                        onClick={() => { setWarnState(null); onAdjust?.(warn.index, warn.minutes); }}
                        className="rounded-xl bg-amber-500 py-2 text-[13px] font-bold text-white transition hover:bg-amber-600 active:scale-[0.98] disabled:opacity-50">
                        Manter {formatMinutes(warn.minutes)}
                      </button>
                      <button type="button" onClick={() => setWarnState(null)}
                        className="rounded-xl border border-amber-300 bg-white/80 py-2 text-[13px] font-semibold text-amber-900 transition hover:bg-white active:scale-[0.98] dark:border-amber-400/30 dark:bg-transparent dark:text-amber-100">
                        Deixar como estava
                      </button>
                    </div>
                  </div>
                ) : asking ? (
                  <div className="mt-3">
                    <p className="mb-2 text-center text-[14px] font-bold text-slate-900 dark:text-white">{proposal.question}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={onConfirm} disabled={busy}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-[14px] font-bold text-white shadow-[0_6px_16px_-6px_rgba(5,150,105,0.8)] transition hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Sim
                      </button>
                      <button type="button" onClick={onDiscard} disabled={busy}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2.5 text-[14px] font-bold text-white shadow-[0_6px_16px_-6px_rgba(220,38,38,0.8)] transition hover:bg-red-700 active:scale-[0.98] disabled:opacity-50">
                        <X className="h-4 w-4" /> Não
                      </button>
                    </div>
                  </div>
                ) : (
                <div className="mt-3 flex justify-end gap-2">
                  <button type="button" onClick={onDiscard} disabled={busy}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-slate-600 hover:bg-white/80 disabled:opacity-50 dark:text-white/60 dark:hover:bg-white/10">
                    <X className="h-3.5 w-3.5" /> Descartar
                  </button>
                  <button type="button" onClick={onConfirm} disabled={busy}
                    className="inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-[12.5px] font-bold text-white shadow-sm disabled:opacity-50"
                    style={{ background: 'var(--brand-primary)', boxShadow: '0 6px 16px -6px var(--brand-primary)' }}>
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Confirmar
                  </button>
                </div>
                )}
              </div>
            )}
            {proposal.status === 'failed' && (
              <div className="relative mt-2 flex justify-end">
                <button type="button" onClick={onDiscard} className="text-[12px] font-semibold text-slate-600 hover:underline dark:text-white/60">Fechar</button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.p key="hello" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex max-w-[34rem] items-start gap-2 rounded-2xl rounded-tl-md bg-slate-50 p-3.5 text-[13px] leading-relaxed text-slate-700 dark:bg-white/5 dark:text-white/75">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--brand-primary)' }} />
            <span>
              Me conta o que mudou na sua rotina que eu reorganizo o cronograma pra você.
              Mostro a prévia antes e só aplico se você confirmar. Se preferir, use um dos atalhos abaixo.
            </span>
          </motion.p>
        )}
      </AnimatePresence>
      </div>

      {!asking && (<>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
        <Chip icon={CalendarX2} disabled={locked} onClick={() => onChip({ chip: 'skip_tomorrow' })}>Não vou estudar amanhã</Chip>
        <Chip icon={Feather} disabled={locked} onClick={() => onChip({ chip: 'lighter_week' })}>Semana mais leve</Chip>
        <Chip icon={Target} disabled={locked} active={picker === 'more_subject'} onClick={() => setPicker(picker === 'more_subject' ? null : 'more_subject')}>Focar em uma área</Chip>
        <Chip icon={RotateCcw} disabled={locked} active={picker === 'review_mistakes'} onClick={() => setPicker(picker === 'review_mistakes' ? null : 'review_mistakes')}>Revisar uma área</Chip>
        <Chip icon={GraduationCap} disabled={locked} active={picker === 'exam_day'} onClick={() => {
          // Sugere a data a partir do "hoje" atual (o do backend chega depois da 1ª renderização).
          if (picker !== 'exam_day') setExamDate(addDays(today, 3));
          setPicker(picker === 'exam_day' ? null : 'exam_day');
        }}>Tenho prova na escola</Chip>
      </div>

      {(picker === 'more_subject' || picker === 'review_mistakes') && (
        <div className="flex flex-wrap gap-1.5">
          {AREAS.map((a) => (
            <button key={a} type="button"
              onClick={() => { onChip({ chip: picker, payload: { subject: a } }); setPicker(null); }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold ${AREA_STYLE[a].chip}`}>
              <span className="h-2 w-2 rounded-full" style={{ background: AREA_STYLE[a].dot }} />
              {AREA_STYLE[a].label}
            </button>
          ))}
        </div>
      )}
      {picker === 'exam_day' && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[12px] text-slate-600 dark:text-white/60" htmlFor="cronograma-exam-day">Dia da prova:</label>
          <input id="cronograma-exam-day" type="date" min={today} value={examDate} onChange={(e) => setExamDate(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white/80 px-2 py-1 text-[12.5px] text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white" />
          <button type="button" onClick={() => { onChip({ chip: 'exam_day', payload: { date: examDate } }); setPicker(null); }}
            className="rounded-full px-3 py-1.5 text-[12px] font-bold text-white" style={{ background: 'var(--brand-primary)' }}>
            Liberar o dia
          </button>
        </div>
      )}
      {/* Campo de mensagem: sempre no pé do cartão */}
      <div className="rounded-2xl border border-slate-200 bg-white p-1.5 transition focus-within:border-[color:color-mix(in_srgb,var(--brand-primary)_45%,transparent)] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand-primary)_12%,transparent)] dark:border-white/10 dark:bg-white/[0.03]">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 500))}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          rows={2}
          placeholder="Peça uma mudança, ex.: “quinta tenho consulta, tira tudo”"
          aria-label="Mensagem para o assistente do cronograma"
          className="relative block w-full resize-none bg-transparent px-3 py-2.5 pr-14 text-[13.5px] text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed dark:text-white dark:placeholder:text-white/35"
          disabled={locked}
        />
        <div className="relative flex items-center justify-between px-2 pb-1">
          <span className="text-[10.5px] text-slate-400 dark:text-white/35">{text.length > 400 ? `${text.length}/500` : 'Enter envia · Shift+Enter quebra linha'}</span>
          <button type="button" onClick={send} disabled={busy || !text.trim() || !!proposal} aria-label="Enviar"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-35"
            style={{ background: 'var(--brand-primary)', boxShadow: '0 6px 16px -6px var(--brand-primary)' }}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      </>)}
      </div>
    </div>
  );
}

function Chip({ children, onClick, disabled, active, icon: Icon }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean; icon: React.ElementType;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-semibold transition disabled:opacity-45 ${active
        ? 'border-transparent text-white shadow-sm'
        : 'border-slate-200 bg-white text-slate-700 hover:-translate-y-px hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10'}`}
      style={active ? { background: 'var(--brand-primary)' } : undefined}>
      <Icon className="h-3.5 w-3.5 opacity-70" />
      {children}
    </button>
  );
}
