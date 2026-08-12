'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bot,
  Clock,
  Download,
  History,
  Inbox,
  Loader2,
  LogOut,
  Maximize2,
  Minimize2,
  Moon,
  Plus,
  Power,
  QrCode,
  Send,
  Settings,
  Sun,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useWorkerStatus,
  useWorkerLogs,
  apiSetWorkerCommand,
  useFlows,
  apiCreateFlow,
  apiDeleteFlow,
  apiPatchFlow,
  useAutomationConfig,
  apiPatchConfig,
  useActiveSessions,
  useLeadFilterOptions,
  useManualQueue,
  apiAddToManualQueue,
  apiClearManualQueue,
  apiDispatchNextInQueue,
} from './hooks/useAutomacao';
import { FlowEditorModal } from './components/FlowEditorModal';
import { useLeads } from '../hooks/useLeads';
import type { Flow } from './types';

const cardCls = 'rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5';
const inputCls =
  'h-9 w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400 dark:focus:border-indigo-500';
const labelCls = 'block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400 mb-1';

function isHeartbeatFresh(lastHeartbeat: string | null): boolean {
  if (!lastHeartbeat) return false;
  return Date.now() - new Date(lastHeartbeat).getTime() < 30_000;
}

// Cor/tag por categoria do evento no terminal — level (warn/error) sempre
// sobrepõe a cor (âmbar/vermelho), independente da categoria.
const CATEGORY_META_DARK: Record<string, { tag: string; color: string }> = {
  conexao: { tag: 'CONEXÃO', color: 'text-sky-400' },
  recebido: { tag: 'RECEBIDO', color: 'text-blue-300' },
  fila: { tag: 'FILA', color: 'text-amber-300' },
  envio: { tag: 'ENVIO', color: 'text-emerald-400' },
  fluxo: { tag: 'FLUXO', color: 'text-violet-400' },
  handoff: { tag: 'HANDOFF', color: 'text-fuchsia-400' },
  cron: { tag: 'CRON', color: 'text-zinc-500' },
  sistema: { tag: 'SISTEMA', color: 'text-zinc-300' },
};

// Mesmas categorias, tons mais escuros pra terem contraste em fundo claro.
const CATEGORY_META_LIGHT: Record<string, { tag: string; color: string }> = {
  conexao: { tag: 'CONEXÃO', color: 'text-sky-600' },
  recebido: { tag: 'RECEBIDO', color: 'text-blue-700' },
  fila: { tag: 'FILA', color: 'text-amber-700' },
  envio: { tag: 'ENVIO', color: 'text-emerald-700' },
  fluxo: { tag: 'FLUXO', color: 'text-violet-700' },
  handoff: { tag: 'HANDOFF', color: 'text-fuchsia-700' },
  cron: { tag: 'CRON', color: 'text-zinc-500' },
  sistema: { tag: 'SISTEMA', color: 'text-zinc-600' },
};

function WorkerCard() {
  const { worker, isLoading } = useWorkerStatus();
  const { logs } = useWorkerLogs();
  const [busy, setBusy] = useState(false);
  // Some pra esconder o QR na hora do clique — o worker local só processa o
  // 'logout' (e limpa qr_code no banco) no próximo ciclo de polling dele, então
  // não dá pra confiar só no estado vindo do SWR pra sumir o QR imediatamente.
  const [qrHidden, setQrHidden] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Preferências só do terminal — independentes do tema claro/escuro do
  // resto do painel (o terminal por padrão imita um console, fundo preto).
  const [terminalLight, setTerminalLight] = useState(false);
  const [terminalExpanded, setTerminalExpanded] = useState(false);

  useEffect(() => {
    setTerminalLight(localStorage.getItem('prospeccao-terminal-light') === '1');
    setTerminalExpanded(localStorage.getItem('prospeccao-terminal-expanded') === '1');
  }, []);

  useEffect(() => {
    localStorage.setItem('prospeccao-terminal-light', terminalLight ? '1' : '0');
  }, [terminalLight]);

  useEffect(() => {
    localStorage.setItem('prospeccao-terminal-expanded', terminalExpanded ? '1' : '0');
  }, [terminalExpanded]);

  useEffect(() => {
    const el = terminalRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs, terminalExpanded]);

  async function toggle(command: 'start' | 'stop' | 'logout') {
    if (command === 'logout') {
      const ok = window.confirm(
        'Isso desconecta o WhatsApp do chip e apaga a sessão local — vai precisar escanear o QR de novo. Continuar?'
      );
      if (!ok) return;
    }
    if (command === 'logout') setQrHidden(true);
    else if (command === 'start') setQrHidden(false);
    setBusy(true);
    try {
      await apiSetWorkerCommand(command);
      if (command === 'start') toast.success('Comando de início enviado ao worker');
      else if (command === 'stop') toast.success('Worker pausado');
      else toast.success('Comando de cancelamento enviado — a sessão será apagada em instantes');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao controlar worker');
    } finally {
      setBusy(false);
    }
  }

  const online = isHeartbeatFresh(worker?.last_heartbeat ?? null);

  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Bot className="w-4 h-4 text-violet-500" /> Worker local (WhatsApp)
        </p>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            online ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
          }`}
        >
          {online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {online ? 'Worker online' : 'Worker offline'}
        </span>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400 dark:text-zinc-500">Carregando...</p>
      ) : (
        <>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mb-3">
            Status da conexão WhatsApp: <span className="font-semibold">{worker?.status ?? 'desconhecido'}</span>
            {worker?.error_message && <span className="text-red-500 dark:text-red-400"> — {worker.error_message}</span>}
          </p>

          {!qrHidden && worker?.status === 'awaiting_qr' && worker.qr_code && (
            <div className="mb-3 flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 p-4">
              <QrCode className="w-4 h-4 text-slate-400" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={worker.qr_code} alt="QR code de pareamento do WhatsApp" className="w-48 h-48" />
              <p className="text-xs text-slate-400 dark:text-zinc-500 text-center">Escaneie com o WhatsApp do chip de prospecção</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => toggle('start')}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 transition-all"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />} Iniciar
            </button>
            <button
              onClick={() => toggle('stop')}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-600 dark:text-zinc-300 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            >
              <Power className="w-4 h-4" /> Parar
            </button>
            <button
              onClick={() => toggle('logout')}
              disabled={busy}
              title="Desconecta o WhatsApp do chip e apaga a sessão local salva"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Cancelar conexão
            </button>
          </div>

          <div className="flex items-center justify-between mt-3 mb-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500">Terminal ao vivo</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTerminalLight((v) => !v)}
                title={terminalLight ? 'Modo escuro' : 'Modo claro'}
                className="p-1.5 rounded-md text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                {terminalLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setTerminalExpanded((v) => !v)}
                title={terminalExpanded ? 'Recolher' : 'Expandir'}
                className="p-1.5 rounded-md text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                {terminalExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div
            ref={terminalRef}
            className={`overflow-y-auto rounded-xl border p-3 font-mono text-[11px] leading-relaxed transition-[height] ${
              terminalExpanded ? 'h-[32rem]' : 'h-56'
            } ${terminalLight ? 'bg-white border-slate-200' : 'bg-black border-zinc-800'}`}
          >
            {logs.length === 0 ? (
              <p className={terminalLight ? 'text-zinc-400' : 'text-zinc-600'}>Aguardando atividade do worker...</p>
            ) : (
              logs.map((l) => {
                const categoryMeta = terminalLight ? CATEGORY_META_LIGHT : CATEGORY_META_DARK;
                const meta = categoryMeta[l.category] ?? categoryMeta.sistema;
                const color = l.level === 'error'
                  ? (terminalLight ? 'text-red-600' : 'text-red-400')
                  : l.level === 'warn'
                    ? (terminalLight ? 'text-amber-600' : 'text-amber-400')
                    : meta.color;
                return (
                  <p key={l.id} className={color}>
                    <span className={terminalLight ? 'text-zinc-400' : 'text-zinc-600'}>
                      {new Date(l.created_at).toLocaleTimeString('pt-BR')}
                    </span>{' '}
                    <span className="opacity-60">[{meta.tag}]</span> {l.message}
                  </p>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Cron.org está configurado pra bater exatamente a cada 15min (:00/:15/:30/:45,
// horário de Brasília) — calculado aqui no cliente, sem precisar consultar a
// API do cron.org, já que o agendamento real usa essa mesma marcação.
function CronCountdown() {
  const { logs } = useWorkerLogs();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const nextMark = new Date(now);
  nextMark.setSeconds(0, 0);
  const minutesToAdd = 15 - (nextMark.getMinutes() % 15 || 15);
  nextMark.setMinutes(nextMark.getMinutes() + (minutesToAdd === 0 ? 15 : minutesToAdd));
  const msLeft = Math.max(0, nextMark.getTime() - now.getTime());
  const minutesLeft = Math.floor(msLeft / 60000);
  const secondsLeft = Math.floor((msLeft % 60000) / 1000);

  const lastCronLog = [...logs].reverse().find((l) => l.message.startsWith('Cron rodou'));

  return (
    <p className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-zinc-500 mb-3">
      <Clock className="w-3 h-3 shrink-0" />
      Próximo cron em{' '}
      <span className="font-mono font-semibold text-slate-600 dark:text-zinc-300">
        {minutesLeft}min{secondsLeft.toString().padStart(2, '0')}s
      </span>
      {lastCronLog && <span> — último rodou às {new Date(lastCronLog.created_at).toLocaleTimeString('pt-BR')}</span>}
    </p>
  );
}

function SessionsOverviewCard({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { config, reload: reloadConfig } = useAutomationConfig();
  const { sessions, isLoading } = useActiveSessions();
  const [toggling, setToggling] = useState(false);

  function timeSince(iso: string | null): string {
    if (!iso) return '—';
    const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }

  async function handleToggleEnabled() {
    if (!config) return;
    setToggling(true);
    try {
      await apiPatchConfig({ enabled: !config.enabled });
      toast.success(config.enabled ? 'Automação desligada' : 'Automação ligada');
      reloadConfig();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar automação');
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-slate-900 dark:text-white">Leads em andamento</p>
        <div className="flex items-center gap-2">
          <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
            {sessions.length}
          </span>
          <button
            onClick={onOpenSettings}
            title="Configurações de ritmo de envio"
            className="p-1.5 rounded-md text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      <CronCountdown />

      {config && (
        <label
          className={`mb-3 flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
            config.enabled
              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20'
              : 'border-slate-200 dark:border-zinc-700'
          }`}
        >
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">Automação ativa</p>
            <p className="text-xs text-slate-400 dark:text-zinc-500">
              {config.enabled ? 'O bot pode iniciar conversas novas automaticamente.' : 'Desligado — nenhuma conversa nova é iniciada, mesmo com o worker online.'}
            </p>
          </div>
          <input
            type="checkbox"
            checked={config.enabled}
            disabled={toggling}
            onChange={handleToggleEnabled}
            className="w-4 h-4 shrink-0"
          />
        </label>
      )}

      <div className="max-h-56 overflow-y-auto space-y-1">
        {isLoading ? (
          <p className="text-xs text-slate-400 dark:text-zinc-500 italic py-3 text-center">Carregando...</p>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-zinc-500 italic py-3 text-center">Nenhuma conversa em andamento agora.</p>
        ) : (
          sessions.map((s) => (
            <div
              key={s.session_phone}
              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800 text-xs"
            >
              <span className="truncate text-slate-700 dark:text-zinc-300" title={s.lead?.nome_fantasia ?? s.lead?.razao_social ?? s.session_phone}>
                {s.lead?.nome_fantasia ?? s.lead?.razao_social ?? s.session_phone}
              </span>
              <span className="flex items-center gap-1.5 shrink-0">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 max-w-[9rem] truncate">
                  {s.node_title ?? '—'}
                </span>
                <span className="text-slate-400 dark:text-zinc-500">{timeSince(s.last_activity)}</span>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AutomationSettingsModal({ onClose }: { onClose: () => void }) {
  const { config, isLoading, reload } = useAutomationConfig();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<typeof config>(null);

  const active = form ?? config;

  async function handleSave() {
    if (!active) return;
    setSaving(true);
    try {
      await apiPatchConfig(active);
      toast.success('Configuração salva');
      reload();
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  const hoursInvalid = !!active && active.business_hours_start >= active.business_hours_end;
  const delayInvalid = !!active && active.send_delay_min_seconds > active.send_delay_max_seconds;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-bold text-slate-900 dark:text-white">Ritmo de envio</p>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
              Controla quando e com que frequência o bot manda mensagem, pra imitar um comportamento humano e reduzir o risco de o número ser banido.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading || !active ? (
          <p className="text-sm text-slate-400 dark:text-zinc-500">Carregando configuração...</p>
        ) : (
        <>
      <p className="text-xs text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-950 rounded-lg px-3 py-2">
        <strong>Resumo:</strong> envia mensagens novas entre {active.business_hours_start}h e {active.business_hours_end}h, esperando de{' '}
        {active.send_delay_min_seconds}s a {active.send_delay_max_seconds}s entre uma e outra, até {active.daily_send_limit} conversas novas por dia.
      </p>

      <p
        className={`flex items-center justify-between gap-2 text-xs rounded-lg px-3 py-2 ${
          active.remaining_today <= 0
            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
            : 'bg-slate-50 dark:bg-zinc-950 text-slate-500 dark:text-zinc-400'
        }`}
      >
        <span>
          <strong>{active.remaining_today}</strong> restantes hoje ({active.sent_today}/{active.daily_send_limit} usados)
        </span>
        <span className="text-[11px] text-slate-400 dark:text-zinc-500">
          reseta às{' '}
          {new Date(active.resets_at).toLocaleTimeString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </p>

      <div className="space-y-4">
        <div>
          <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">Horário de disparo</p>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mb-2">
            O bot só inicia conversas novas dentro desse intervalo (horário de Brasília). Respostas a leads que já responderam não são afetadas.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Começa às (0–23h)</label>
              <input
                type="number"
                min={0}
                max={23}
                value={active.business_hours_start}
                onChange={(e) => setForm({ ...active, business_hours_start: Number(e.target.value) })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Termina às (0–23h)</label>
              <input
                type="number"
                min={0}
                max={23}
                value={active.business_hours_end}
                onChange={(e) => setForm({ ...active, business_hours_end: Number(e.target.value) })}
                className={inputCls}
              />
            </div>
          </div>
          {hoursInvalid && (
            <p className="text-[11px] text-red-500 dark:text-red-400 mt-1">O horário final precisa ser depois do inicial.</p>
          )}
        </div>

        <div>
          <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">Intervalo entre mensagens</p>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mb-2">
            Antes de cada envio, o worker espera um tempo aleatório entre esses dois valores — evita mandar tudo em rajada, o que é um dos principais gatilhos de banimento.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Mínimo (segundos)</label>
              <input
                type="number"
                min={0}
                value={active.send_delay_min_seconds}
                onChange={(e) => setForm({ ...active, send_delay_min_seconds: Number(e.target.value) })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Máximo (segundos)</label>
              <input
                type="number"
                min={0}
                value={active.send_delay_max_seconds}
                onChange={(e) => setForm({ ...active, send_delay_max_seconds: Number(e.target.value) })}
                className={inputCls}
              />
            </div>
          </div>
          {delayInvalid && (
            <p className="text-[11px] text-red-500 dark:text-red-400 mt-1">O máximo precisa ser maior ou igual ao mínimo.</p>
          )}
        </div>

        <div>
          <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">Limite diário</p>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mb-2">
            Máximo de conversas <strong>novas</strong> (primeira mensagem) que o bot pode iniciar por dia. Não conta respostas a quem já está conversando.
          </p>
          <input
            type="number"
            min={1}
            value={active.daily_send_limit}
            onChange={(e) => setForm({ ...active, daily_send_limit: Number(e.target.value) })}
            className={inputCls}
          />
        </div>

        <div>
          <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">Espera antes de responder</p>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mb-2">
            Quanto tempo o worker espera sem nova mensagem do mesmo lead antes de repassar pro bot — junta bolhas seguidas (&quot;Sim&quot; / &quot;Trabalhamos com X&quot;) numa resposta só, pra não avançar o fluxo várias vezes por engano.
          </p>
          <input
            type="number"
            min={0}
            value={active.inbound_debounce_seconds}
            onChange={(e) => setForm({ ...active, inbound_debounce_seconds: Number(e.target.value) })}
            className={inputCls}
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || hoursInvalid || delayInvalid}
        className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 disabled:opacity-50 transition-all"
      >
        {saving ? 'Salvando...' : 'Salvar configuração'}
      </button>
      </>
      )}
      </div>
    </div>
  );
}

const TEMPERATURE_OPTIONS = ['quente', 'morno', 'frio'];

function MultiSelectField({
  label,
  options,
  selected,
  onChange,
  emptyHint,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  emptyHint?: string;
}) {
  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }
  return (
    <div>
      <label className={labelCls}>
        {label} {selected.length > 0 && <span className="text-violet-500">({selected.length})</span>}
      </label>
      {options.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-zinc-500 italic py-1.5">{emptyHint ?? 'Nenhuma opção disponível'}</p>
      ) : (
        <div className="max-h-28 overflow-y-auto rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 p-1.5 space-y-0.5">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer text-xs text-slate-700 dark:text-zinc-300"
            >
              <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateFlowModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const { ufs, municipios, source_channels } = useLeadFilterOptions(filters.uf ?? []);

  if (!open) return null;

  function setField(key: string, values: string[]) {
    setFilters((prev) => {
      const next = { ...prev, [key]: values };
      if (key === 'uf') next.municipio = []; // trocou a UF — reseta município (cascade)
      return next;
    });
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const filter_config: Record<string, string[]> = {};
      for (const [key, values] of Object.entries(filters)) {
        if (values.length > 0) filter_config[key] = values;
      }
      await apiCreateFlow({ name: name.trim(), is_default: isDefault, filter_config });
      toast.success('Fluxo criado — configure os passos em "Editar"');
      onCreated();
      onClose();
      setName('');
      setIsDefault(false);
      setFilters({});
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar fluxo');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl p-6 space-y-3">
        <p className="text-base font-bold text-slate-900 dark:text-white">Novo fluxo</p>
        <div>
          <label className={labelCls}>Nome</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Ex: Leads de SP" autoFocus />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-zinc-300">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
          Usar como fluxo padrão (pega leads que não batem com nenhum filtro)
        </label>
        {!isDefault && (
          <div className="grid grid-cols-2 gap-2">
            <MultiSelectField label="UF" options={ufs} selected={filters.uf ?? []} onChange={(v) => setField('uf', v)} />
            <MultiSelectField
              label="Município"
              options={municipios}
              selected={filters.municipio ?? []}
              onChange={(v) => setField('municipio', v)}
              emptyHint="Selecione uma UF primeiro"
            />
            <MultiSelectField
              label="Temperatura"
              options={TEMPERATURE_OPTIONS}
              selected={filters.temperature ?? []}
              onChange={(v) => setField('temperature', v)}
            />
            <MultiSelectField
              label="Canal de origem"
              options={source_channels}
              selected={filters.source_channel ?? []}
              onChange={(v) => setField('source_channel', v)}
            />
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white">
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            className="px-5 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Criando...' : 'Criar fluxo'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LeadPickerModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const { leads, isLoading } = useLeads({ uf: '', status: '', has_phone: false, search, temperature: '' });

  if (!open) return null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0) return;
    setAdding(true);
    try {
      await apiAddToManualQueue([...selected]);
      toast.success(`${selected.size} lead(s) adicionado(s) à fila`);
      onAdded();
      onClose();
      setSelected(new Set());
      setSearch('');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao adicionar à fila');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl p-6 space-y-3 max-h-[85vh] flex flex-col">
        <p className="text-base font-bold text-slate-900 dark:text-white">Adicionar lead à fila manual</p>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome..."
          className={inputCls}
          autoFocus
        />
        <div className="flex-1 overflow-y-auto space-y-0.5 border border-slate-100 dark:border-zinc-800 rounded-xl p-2 min-h-[240px]">
          {isLoading ? (
            <p className="text-sm text-slate-400 dark:text-zinc-500 text-center py-8">Carregando...</p>
          ) : leads.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-zinc-500 text-center py-8">Nenhum lead encontrado</p>
          ) : (
            leads.map((lead) => (
              <label
                key={lead.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer text-sm"
              >
                <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggle(lead.id)} />
                <span className="flex-1 min-w-0 truncate text-slate-700 dark:text-zinc-300">
                  {lead.nome_fantasia ?? lead.razao_social}
                </span>
                <span className="text-xs text-slate-400 dark:text-zinc-500 shrink-0">{lead.uf}</span>
              </label>
            ))
          )}
        </div>
        <div className="flex justify-between items-center gap-2 pt-1">
          <p className="text-xs text-slate-400 dark:text-zinc-500">{selected.size} selecionado(s)</p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              disabled={adding || selected.size === 0}
              className="px-5 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 disabled:opacity-50"
            >
              {adding ? 'Adicionando...' : `Adicionar (${selected.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ManualQueueCard() {
  const { queue, reload } = useManualQueue();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [sendingNext, setSendingNext] = useState(false);
  const pendingCount = queue.filter((item) => item.status === 'pending').length;
  // "queued" já foi disparado (agendado) mas ainda não confirmado como
  // entregue pelo worker — pro badge do topo isso ainda conta como "esperando".
  const waitingCount = queue.filter((item) => item.status === 'pending' || item.status === 'queued').length;

  async function handleClear() {
    if (queue.length === 0) return;
    const ok = window.confirm(
      pendingCount > 0
        ? `Limpar a fila manual? ${pendingCount} lead(s) aguardando serão removidos (nenhuma mensagem é enviada) e o histórico de enviados/pulados desaparece da lista.`
        : 'Limpar a lista da fila manual? Isso só limpa a visualização — as mensagens já enviadas continuam valendo.',
    );
    if (!ok) return;
    setClearing(true);
    try {
      await apiClearManualQueue();
      toast.success('Fila manual limpa');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao limpar fila');
    } finally {
      setClearing(false);
    }
  }

  async function handleSendNext() {
    setSendingNext(true);
    try {
      const result = await apiDispatchNextInQueue();
      if (result.dispatched) {
        toast.success('Mensagem enviada pro próximo da fila!');
      } else if (result.skipped === 'fila_vazia') {
        toast.error('A fila manual está vazia');
      } else if (result.skipped === 'fora_horario_comercial') {
        toast.error('Fora do horário comercial configurado');
      } else if (result.skipped === 'limite_diario_atingido') {
        toast.error('Limite diário de envios já foi atingido');
      } else {
        toast.error(`Lead pulado: ${result.skipped}`);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao enviar');
    } finally {
      setSendingNext(false);
    }
  }

  const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Aguardando', cls: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300' },
    queued: { label: 'Enfileirado', cls: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
    sent: { label: 'Enviado', cls: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
    skipped: { label: 'Pulado', cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
    failed: { label: 'Falhou', cls: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' },
  };

  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">Fila manual</p>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
            Leads com prioridade + histórico recente do que o scan automático despachou.
          </p>
        </div>
        <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
          {waitingCount} aguardando
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        {queue.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-zinc-500 italic py-3 text-center w-full">Fila vazia</p>
        ) : (
          queue.map((item) => {
            const status = STATUS_LABEL[item.status] ?? { label: item.status, cls: 'bg-slate-100 dark:bg-zinc-700 text-slate-500 dark:text-zinc-400' };
            const name = item.lead?.nome_fantasia ?? item.lead?.razao_social ?? item.lead_id;
            return (
              <div
                key={item.id}
                className="shrink-0 w-44 flex flex-col gap-2 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700"
              >
                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 truncate" title={name}>
                  {name}
                </span>
                <span className="flex items-center gap-1.5 flex-wrap">
                  {item.source === 'auto' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 dark:bg-zinc-700 text-slate-500 dark:text-zinc-400">
                      auto
                    </span>
                  )}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${status.cls}`}>{status.label}</span>
                  {item.lead?.uf && <span className="text-[10px] text-slate-400 dark:text-zinc-500">{item.lead.uf}</span>}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-300 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Adicionar lead
        </button>
        <button
          onClick={handleClear}
          disabled={clearing || queue.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Limpar fila
        </button>
        <button
          onClick={handleSendNext}
          disabled={sendingNext || pendingCount === 0}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 transition-all ml-auto"
        >
          {sendingNext ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Enviar próximo
        </button>
      </div>

      <LeadPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} onAdded={reload} />
    </div>
  );
}

function filterSummary(flow: Flow): string {
  const entries = Object.entries(flow.filter_config || {});
  if (entries.length === 0) return flow.is_default ? 'Padrão (sem filtro)' : 'Sem filtro';
  return entries.map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' · ');
}

function FlowsCard({ onEdit }: { onEdit: (flow: Flow) => void }) {
  const { flows, isLoading, reload } = useFlows();
  const [createOpen, setCreateOpen] = useState(false);

  async function toggleActive(flow: Flow) {
    try {
      await apiPatchFlow(flow.id, { active: !flow.active });
      reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar fluxo');
    }
  }

  async function handleDelete(flow: Flow) {
    try {
      await apiDeleteFlow(flow.id);
      toast.success('Fluxo removido');
      reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao remover fluxo (pode ter conversas ativas)');
    }
  }

  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-slate-900 dark:text-white">Fluxos</p>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700"
        >
          <Plus className="w-3.5 h-3.5" /> Novo fluxo
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400 dark:text-zinc-500">Carregando...</p>
      ) : flows.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-zinc-500">Nenhum fluxo criado ainda.</p>
      ) : (
        <div className="space-y-2">
          {flows.map((flow) => (
            <div
              key={flow.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 dark:border-zinc-800 px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{flow.name}</p>
                  {flow.is_default && (
                    <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                      Padrão
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 dark:text-zinc-500 truncate">{filterSummary(flow)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
                  <input type="checkbox" checked={flow.active} onChange={() => toggleActive(flow)} />
                  Ativo
                </label>
                <button
                  onClick={() => onEdit(flow)}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800"
                >
                  Editar
                </button>
                <button onClick={() => handleDelete(flow)} className="text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateFlowModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={reload} />
    </div>
  );
}

function ExportConversationsCard() {
  const today = new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!start || !end) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/admin/prospeccao/automacao/export-conversations?start=${start}&end=${end}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Erro ao baixar (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prospeccao-conversas-${start}_a_${end}.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Download iniciado');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao baixar dados');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className={cardCls}>
      <p className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
        <Download className="w-4 h-4 text-violet-500" /> Exportar conversas
      </p>
      <p className="text-xs text-slate-400 dark:text-zinc-500 mb-3">
        Baixa as conversas do bot com os leads no período escolhido, organizadas por lead num arquivo markdown — pra você analisar como quiser.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className={labelCls}>De</label>
          <input type="date" value={start} max={end || undefined} onChange={(e) => setStart(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Até</label>
          <input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading || !start || !end}
          className="h-9 inline-flex items-center gap-1.5 px-3.5 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 disabled:opacity-50 transition-all"
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Baixar dados para análise
        </button>
      </div>
    </div>
  );
}

export default function AutomacaoPage() {
  const [editingFlow, setEditingFlow] = useState<Flow | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link
            href="/portal/admin/prospeccao"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-white mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Prospecção
          </Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Automação via WhatsApp</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href="/portal/admin/prospeccao/automacao/historico"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-600 dark:text-zinc-300 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <History className="w-4 h-4" /> Histórico de envios
          </Link>
          <Link
            href="/portal/admin/prospeccao/handoff"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-600 dark:text-zinc-300 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Inbox className="w-4 h-4" /> Painel de handoff
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <WorkerCard />
        <SessionsOverviewCard onOpenSettings={() => setSettingsOpen(true)} />
      </div>

      <ManualQueueCard />

      <FlowsCard onEdit={setEditingFlow} />
      <ExportConversationsCard />

      {editingFlow && (
        <FlowEditorModal
          flowId={editingFlow.id}
          flowName={editingFlow.name}
          onClose={() => setEditingFlow(null)}
          onSaved={() => setEditingFlow(null)}
        />
      )}

      {settingsOpen && <AutomationSettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
