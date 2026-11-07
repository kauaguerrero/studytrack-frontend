'use client';

// Chat com o agente do cronograma. A IA só SUGERE: toda resposta vira uma
// prévia (cards destacados no quadro) que o aluno confirma ou descarta.
// Chips de sugestão rápida resolvem os pedidos comuns sem IA (não gastam a cota).
//
// Visual: um cartão com a conversa (mensagens do aluno à direita, do agente à
// esquerda), os atalhos numa linha e o campo de mensagem no pé.

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
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
    say(t);
    onSend(t);
    setText('');
  };

  const changes = proposal
    ? proposal.diff.moved.length + proposal.diff.added.length + proposal.diff.removed.length
    : 0;
  const shown = proposal
    ? Math.min(8, proposal.diff.moved.length) + Math.min(5, proposal.diff.added.length) + Math.min(5, proposal.diff.removed.length)
    : 0;
  // Só uma prévia de verdade fica "aberta". Pedido que falhou vira mensagem comum na conversa.
  const open = proposal?.status === 'proposed' ? proposal : null;
  const locked = busy || !!open;
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

  // ── Conversa ────────────────────────────────────────────────────────────────
  // O histórico fica só na tela (não vai para o backend). Quando a prévia fecha,
  // a resposta do agente vira uma mensagem fixa com o que o aluno fez com ela.
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [lastAction, setLastAction] = useState<'confirm' | 'discard' | null>(null);
  const [greetAt] = useState(() => new Date());
  // Começa sem o pedido que falhou para ele entrar na conversa já na primeira renderização.
  const [seen, setSeen] = useState<{ p: Proposal | null; at: Date }>(() => ({ p: proposal?.status === 'proposed' ? proposal : null, at: new Date() }));
  if (seen.p !== proposal) {
    // Resposta barrada antes da IA vem sem request_id: cada uma conta como nova.
    const isNew = proposal?.request_id !== seen.p?.request_id || (!!proposal && proposal.request_id == null);
    if (seen.p && isNew && seen.p.status === 'proposed') {
      const closed = seen;
      const note = lastAction === 'confirm' ? 'Você confirmou' : 'Você descartou';
      setHistory((h) => [...h, { id: h.length, role: 'agent', text: replyOf(closed.p!), note, at: closed.at }]);
      setLastAction(null);
    }
    // Pedido que falhou não tem o que confirmar: entra direto na conversa, sem botão.
    if (proposal && isNew && proposal.status !== 'proposed') {
      const failed = proposal;
      setHistory((h) => [...h, { id: h.length, role: 'agent', text: replyOf(failed), at: new Date() }]);
    }
    // Ajustar o tempo devolve a mesma prévia: mantém o horário em que ela chegou.
    setSeen({ p: proposal, at: isNew ? new Date() : seen.at });
  }
  const say = (t: string) => setHistory((h) => [...h, { id: h.length, role: 'user', text: t, at: new Date() }]);
  const chip = (label: string, body: ChipBody) => { say(label); onChip(body); };
  const confirmNow = () => { setLastAction('confirm'); onConfirm(); };
  const discardNow = () => { setLastAction('discard'); onDiscard(); };
  const thinking = busy && !open && history[history.length - 1]?.role === 'user';

  // Mensagem nova: rola a conversa até o fim.
  const threadRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history.length, proposal, thinking]);

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
        {canUndo && !open && (
          <button type="button" onClick={onUndo} disabled={busy}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white/70 px-2.5 py-1.5 text-[12px] font-semibold text-slate-600 backdrop-blur hover:bg-white disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white/65">
            <Undo2 className="h-3.5 w-3.5" /> Desfazer última
          </button>
        )}
      </div>

      {/* Um cartão só: a conversa ocupa o meio (rola por dentro), ações e campo ficam no pé. */}
      <div className={`${GLASS} flex flex-1 flex-col gap-3 p-3.5`}>
        <div className="relative min-h-[150px] flex-1">
          <div ref={threadRef} role="log" aria-label="Conversa com o assistente"
            className="cronograma-day-scroll max-h-[340px] space-y-2.5 overflow-y-auto overscroll-contain pr-1 lg:absolute lg:inset-0 lg:max-h-none">
            <AgentBubble at={greetAt}>
              Me conta o que mudou na sua rotina que eu reorganizo o cronograma. Você vê a prévia antes de confirmar.
            </AgentBubble>
            {history.map((m) => (m.role === 'user'
              ? <UserBubble key={m.id} at={m.at}>{m.text}</UserBubble>
              : (
                <AgentBubble key={m.id} at={m.at}>
                  {m.text}
                  {m.note && (
                    <span className={`mt-1 flex items-center gap-1 text-[11px] font-bold ${m.note === 'Você confirmou' ? 'text-emerald-600' : 'text-slate-500 dark:text-white/50'}`}>
                      {m.note === 'Você confirmou' ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} {m.note}
                    </span>
                  )}
                </AgentBubble>
              )))}

            {/* Resposta aberta do agente: texto + o que muda (as ações ficam no pé do cartão). */}
            {open && (
              <motion.div key={open.request_id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-end gap-1.5" aria-live="polite">
                <BotDot />
                <div className="min-w-0 max-w-[84%] rounded-2xl rounded-bl-md bg-slate-50 px-3.5 py-2.5 dark:bg-white/5">
                  <p className="text-[13px] text-slate-800 dark:text-white/85">
                    {open.reply || 'Preparei estas mudanças:'}
                  </p>
                  {(
                    <>
                      <ul className="mt-1.5 max-h-40 space-y-1 overflow-y-auto text-[12px] text-slate-700 dark:text-white/70">
                        {open.diff.moved.slice(0, 8).map((m, k) => (
                          <li key={`m-${m.id ?? k}`} className="flex items-center gap-1">
                            <span className="truncate">{m.topic}</span>
                            <span className="shrink-0 text-slate-500">{formatDayMonth(m.from!)} <MoveRight className="inline h-3 w-3" /> {formatDayMonth(m.to!)}</span>
                          </li>
                        ))}
                        {open.diff.added.slice(0, 5).map((a, k) => (
                          <li key={`a-${k}`} className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                            <Plus className="h-3 w-3" /><span className="truncate">{a.topic}</span><span className="shrink-0">({formatDayMonth(a.to!)})</span>
                          </li>
                        ))}
                        {open.diff.removed.slice(0, 5).map((r, k) => (
                          <li key={`r-${r.id ?? k}`} className="flex items-center gap-1 text-slate-500">
                            <Minus className="h-3 w-3" /><span className="truncate">{r.topic}</span><span className="shrink-0">sai de {formatDayMonth(r.from!)}</span>
                          </li>
                        ))}
                        {changes > shown && <li className="text-slate-500">e mais {changes - shown} {changes - shown === 1 ? 'ajuste' : 'ajustes'}…</li>}
                        {changes === 0 && <li className="text-slate-500">Ajuste nas configurações (capacidade/prioridade); o quadro se reorganiza ao confirmar.</li>}
                      </ul>
                      {open.warnings.map((w, k) => (
                        <p key={k} className="mt-1 text-[11.5px] font-semibold text-amber-800 dark:text-amber-200">{w.message}</p>
                      ))}
                    </>
                  )}
                </div>
                <Time at={seen.at} />
              </motion.div>
            )}

            {thinking && (
              <div className="flex items-end gap-1.5" aria-label="O assistente está pensando">
                <BotDot />
                <span className="flex gap-1 rounded-2xl rounded-bl-md bg-slate-50 px-3.5 py-3 dark:bg-white/5">
                  {[0, 1, 2].map((k) => (
                    <motion.span key={k} className="h-1.5 w-1.5 rounded-full bg-slate-400"
                      animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: k * 0.15 }} />
                  ))}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Ações da prévia aberta: tempos editáveis, aviso de carga, Sim/Não ou Confirmar. */}
        {proposal?.status === 'proposed' && (
          <div className="space-y-2">
            {editable.length > 0 && (
              <div className="space-y-1.5">
                {editable.map((e) => (
                  <div key={e.index} role="group" aria-label={`Tempo de ${e.label}`}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-2.5 py-1.5 dark:border-white/10 dark:bg-white/5">
                    <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] font-semibold text-slate-700 dark:text-white/75">
                      <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--brand-ink)' }} />
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
                className="rounded-xl border border-amber-200 bg-amber-50/90 p-3 dark:border-amber-400/25 dark:bg-amber-400/10">
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
              <div>
                <p className="mb-2 text-center text-[14px] font-bold text-slate-900 dark:text-white">{proposal.question}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={confirmNow} disabled={busy}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-[14px] font-bold text-white shadow-[0_6px_16px_-6px_rgba(5,150,105,0.8)] transition hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Sim
                  </button>
                  <button type="button" onClick={discardNow} disabled={busy}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2.5 text-[14px] font-bold text-white shadow-[0_6px_16px_-6px_rgba(220,38,38,0.8)] transition hover:bg-red-700 active:scale-[0.98] disabled:opacity-50">
                    <X className="h-4 w-4" /> Não
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end gap-2">
                <button type="button" onClick={discardNow} disabled={busy}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-white/60 dark:hover:bg-white/10">
                  <X className="h-3.5 w-3.5" /> Descartar
                </button>
                <button type="button" onClick={confirmNow} disabled={busy}
                  className="inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-[12.5px] font-bold text-white shadow-sm disabled:opacity-50"
                  style={{ background: 'var(--brand-primary)', boxShadow: '0 6px 16px -6px var(--brand-primary)' }}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Confirmar
                </button>
              </div>
            )}
          </div>
        )}

        {!asking && (<>
          {!open && (
            <div className="-mx-1 flex flex-nowrap gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]">
              <Chip icon={CalendarX2} disabled={locked} onClick={() => chip('Folga amanhã', { chip: 'skip_tomorrow' })}>Folga amanhã</Chip>
              <Chip icon={Feather} disabled={locked} onClick={() => chip('Semana leve', { chip: 'lighter_week' })}>Semana leve</Chip>
              <Chip icon={Target} disabled={locked} active={picker === 'more_subject'} onClick={() => setPicker(picker === 'more_subject' ? null : 'more_subject')}>Focar numa área</Chip>
              <Chip icon={RotateCcw} disabled={locked} active={picker === 'review_mistakes'} onClick={() => setPicker(picker === 'review_mistakes' ? null : 'review_mistakes')}>Revisar área</Chip>
              <Chip icon={GraduationCap} disabled={locked} active={picker === 'exam_day'} onClick={() => {
                // Sugere a data a partir do "hoje" atual (o do backend chega depois da 1ª renderização).
                if (picker !== 'exam_day') setExamDate(addDays(today, 3));
                setPicker(picker === 'exam_day' ? null : 'exam_day');
              }}>Prova na escola</Chip>
            </div>
          )}

          {!open && (picker === 'more_subject' || picker === 'review_mistakes') && (
            <div className="flex flex-wrap gap-1.5">
              {AREAS.map((a) => (
                <button key={a} type="button"
                  onClick={() => {
                    chip(`${picker === 'more_subject' ? 'Focar em' : 'Revisar'} ${AREA_STYLE[a].label}`, { chip: picker, payload: { subject: a } });
                    setPicker(null);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold ${AREA_STYLE[a].chip}`}>
                  <span className="h-2 w-2 rounded-full" style={{ background: AREA_STYLE[a].dot }} />
                  {AREA_STYLE[a].label}
                </button>
              ))}
            </div>
          )}
          {!open && picker === 'exam_day' && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-[12px] text-slate-600 dark:text-white/60" htmlFor="cronograma-exam-day">Dia da prova:</label>
              <input id="cronograma-exam-day" type="date" min={today} value={examDate} onChange={(e) => setExamDate(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white/80 px-2 py-1 text-[12.5px] text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white" />
              <button type="button" onClick={() => { chip(`Tenho prova na escola dia ${formatDayMonth(examDate)}`, { chip: 'exam_day', payload: { date: examDate } }); setPicker(null); }}
                className="rounded-full px-3 py-1.5 text-[12px] font-bold text-white" style={{ background: 'var(--brand-primary)' }}>
                Liberar o dia
              </button>
            </div>
          )}

          {/* Campo de mensagem: sempre no pé do cartão */}
          <div className="rounded-2xl border border-slate-200 bg-white p-1.5 transition focus-within:border-[color:color-mix(in_srgb,var(--brand-ink)_45%,transparent)] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand-ink)_12%,transparent)] dark:border-white/10 dark:bg-white/[0.03]">
            <textarea
              value={text}
              maxLength={300}
              onChange={(e) => setText(e.target.value.slice(0, 300))}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder="Peça uma mudança, ex.: “quinta tenho consulta, tira tudo”"
              aria-label="Mensagem para o assistente do cronograma"
              className="relative block w-full resize-none bg-transparent px-3 py-2 text-[13.5px] text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed dark:text-white dark:placeholder:text-white/35"
              disabled={locked}
            />
            <div className="relative flex items-center justify-between px-2 pb-0.5">
              <span className="text-[10.5px] text-slate-400 dark:text-white/35">{text.length > 400 ? `${text.length}/500` : 'Enter envia · Shift+Enter quebra linha'}</span>
              <button type="button" onClick={send} disabled={busy || !text.trim() || !!open} aria-label="Enviar"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white transition hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-35"
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

type ChatMsg = { id: number; role: 'user' | 'agent'; text: string; note?: string; at: Date };

const hhmm = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

function replyOf(p: Proposal): string {
  return p.reply || (p.status === 'proposed' ? 'Preparei algumas mudanças no cronograma.' : 'Não consegui aplicar esse pedido.');
}

function Time({ at }: { at: Date }) {
  return (
    <time dateTime={at.toISOString()} className="shrink-0 pb-0.5 text-[10px] tabular-nums text-slate-400 dark:text-white/35">
      {hhmm(at)}
    </time>
  );
}

function BotDot() {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
      style={{ background: 'color-mix(in srgb, var(--brand-ink) 12%, transparent)', color: 'var(--brand-ink)' }}>
      <Sparkles className="h-3.5 w-3.5" />
    </span>
  );
}

function AgentBubble({ children, at }: { children: React.ReactNode; at: Date }) {
  return (
    <div className="flex items-end gap-1.5">
      <BotDot />
      <div className="min-w-0 max-w-[84%] rounded-2xl rounded-bl-md bg-slate-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-slate-700 dark:bg-white/5 dark:text-white/75">
        {children}
      </div>
      <Time at={at} />
    </div>
  );
}

function UserBubble({ children, at }: { children: React.ReactNode; at: Date }) {
  return (
    <div className="flex items-end justify-end gap-1.5">
      <Time at={at} />
      <p className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md px-3.5 py-2 text-[13px] text-slate-900 dark:text-white"
        style={{ background: 'color-mix(in srgb, var(--brand-ink) 13%, transparent)' }}>
        {children}
      </p>
    </div>
  );
}

function Chip({ children, onClick, disabled, active, icon: Icon }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean; icon: React.ElementType;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[12px] font-semibold transition disabled:opacity-45 ${active
        ? 'border-transparent text-white shadow-sm'
        : 'border-slate-200 bg-white text-slate-700 hover:-translate-y-px hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10'}`}
      style={active ? { background: 'var(--brand-primary)' } : undefined}>
      <Icon className="h-3.5 w-3.5 opacity-70" />
      {children}
    </button>
  );
}
