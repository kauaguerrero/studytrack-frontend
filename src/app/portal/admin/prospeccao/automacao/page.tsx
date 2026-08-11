'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bot,
  ChevronDown,
  Clock,
  Inbox,
  Loader2,
  LogOut,
  Plus,
  Power,
  QrCode,
  Send,
  Sparkles,
  Trash2,
  Wifi,
  WifiOff,
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
  useDailyInsights,
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

function WorkerCard() {
  const { worker, isLoading } = useWorkerStatus();
  const { logs } = useWorkerLogs();
  const [busy, setBusy] = useState(false);
  // Some pra esconder o QR na hora do clique — o worker local só processa o
  // 'logout' (e limpa qr_code no banco) no próximo ciclo de polling dele, então
  // não dá pra confiar só no estado vindo do SWR pra sumir o QR imediatamente.
  const [qrHidden, setQrHidden] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = terminalRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

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

          <div
            ref={terminalRef}
            className="mt-3 h-56 overflow-y-auto rounded-xl bg-black border border-zinc-800 p-3 font-mono text-[11px] leading-relaxed"
          >
            {logs.length === 0 ? (
              <p className="text-zinc-600">Aguardando atividade do worker...</p>
            ) : (
              logs.map((l) => (
                <p
                  key={l.id}
                  className={
                    l.level === 'error' ? 'text-red-400' : l.level === 'warn' ? 'text-amber-400' : 'text-emerald-400'
                  }
                >
                  <span className="text-zinc-600">{new Date(l.created_at).toLocaleTimeString('pt-BR')}</span> {l.message}
                </p>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Estimativa client-side de quando o cron.org deve bater de novo — assume um
// agendamento alinhado a cada 15min (:00/:15/:30/:45). Não temos como saber
// o agendamento real sem consultar a API do cron.org; isso é só uma referência.
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
      Próximo cron (estimado, a cada 15min) em{' '}
      <span className="font-mono font-semibold text-slate-600 dark:text-zinc-300">
        {minutesLeft}min{secondsLeft.toString().padStart(2, '0')}s
      </span>
      {lastCronLog && <span> — último rodou às {new Date(lastCronLog.created_at).toLocaleTimeString('pt-BR')}</span>}
    </p>
  );
}

function ConfigCard() {
  const { config, isLoading, reload } = useAutomationConfig();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<typeof config>(null);
  const [expanded, setExpanded] = useState(false);

  const active = form ?? config;

  async function handleSave() {
    if (!active) return;
    setSaving(true);
    try {
      await apiPatchConfig(active);
      toast.success('Configuração salva');
      reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !active) {
    return (
      <div className={cardCls}>
        <p className="text-sm text-slate-400 dark:text-zinc-500">Carregando configuração...</p>
      </div>
    );
  }

  const hoursInvalid = active.business_hours_start >= active.business_hours_end;
  const delayInvalid = active.send_delay_min_seconds > active.send_delay_max_seconds;

  return (
    <div className={cardCls}>
      <div className="mb-4">
        <p className="text-sm font-bold text-slate-900 dark:text-white">Ritmo de envio</p>
        <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
          Controla quando e com que frequência o bot manda mensagem, pra imitar um comportamento humano e reduzir o risco de o número ser banido.
        </p>
      </div>

      <CronCountdown />

      <label
        className={`mb-4 flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
          active.enabled
            ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20'
            : 'border-slate-200 dark:border-zinc-700'
        }`}
      >
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">Automação ativa</p>
          <p className="text-xs text-slate-400 dark:text-zinc-500">
            {active.enabled ? 'O bot pode iniciar conversas novas automaticamente.' : 'Desligado — nenhuma conversa nova é iniciada, mesmo com o worker online.'}
          </p>
        </div>
        <input
          type="checkbox"
          checked={active.enabled}
          onChange={(e) => setForm({ ...active, enabled: e.target.checked })}
          className="w-4 h-4 shrink-0"
        />
      </label>

      <p className="text-xs text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-950 rounded-lg px-3 py-2 mb-3">
        <strong>Resumo:</strong> envia mensagens novas entre {active.business_hours_start}h e {active.business_hours_end}h, esperando de{' '}
        {active.send_delay_min_seconds}s a {active.send_delay_max_seconds}s entre uma e outra, até {active.daily_send_limit} conversas novas por dia.
      </p>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-colors py-1"
      >
        <span>{expanded ? 'Ocultar detalhes' : 'Configurar horário, intervalo e limite'}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
      <div className="space-y-4 mt-3">
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
      </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || hoursInvalid || delayInvalid}
        className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 disabled:opacity-50 transition-all"
      >
        {saving ? 'Salvando...' : 'Salvar configuração'}
      </button>
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

  async function handleClear() {
    if (queue.length === 0) return;
    const ok = window.confirm(`Limpar a fila manual? ${queue.length} lead(s) serão removidos — nenhuma mensagem é enviada.`);
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

  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">Fila manual</p>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
            Leads com prioridade — sempre processados no próximo cron, mesmo com a automação em massa desligada.
          </p>
        </div>
        <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
          {queue.length}
        </span>
      </div>

      <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
        {queue.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-zinc-500 italic py-3 text-center">Fila vazia</p>
        ) : (
          queue.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800 text-xs"
            >
              <span className="truncate text-slate-700 dark:text-zinc-300">
                {item.lead?.nome_fantasia ?? item.lead?.razao_social ?? item.lead_id}
              </span>
              <span className="text-slate-400 dark:text-zinc-500 shrink-0">{item.lead?.uf}</span>
            </div>
          ))
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
          disabled={sendingNext || queue.length === 0}
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

function InsightsCard() {
  const { insights, isLoading } = useDailyInsights();
  return (
    <div className={cardCls}>
      <p className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-violet-500" /> Insights diários (Gemini)
      </p>
      {isLoading ? (
        <p className="text-sm text-slate-400 dark:text-zinc-500">Carregando...</p>
      ) : insights.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-zinc-500">Nenhuma síntese gerada ainda.</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {insights.map((insight) => (
            <div key={insight.id} className="rounded-xl border border-slate-100 dark:border-zinc-800 px-3 py-2.5">
              <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 mb-1">
                {new Date(insight.insight_date).toLocaleDateString('pt-BR')}
              </p>
              <p className="text-sm text-slate-700 dark:text-zinc-300 whitespace-pre-wrap">{insight.summary_md}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AutomacaoPage() {
  const [editingFlow, setEditingFlow] = useState<Flow | null>(null);

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
        <Link
          href="/portal/admin/prospeccao/handoff"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-600 dark:text-zinc-300 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <Inbox className="w-4 h-4" /> Painel de handoff
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <WorkerCard />
        <ConfigCard />
      </div>

      <ManualQueueCard />

      <FlowsCard onEdit={setEditingFlow} />
      <InsightsCard />

      {editingFlow && (
        <FlowEditorModal
          flowId={editingFlow.id}
          flowName={editingFlow.name}
          onClose={() => setEditingFlow(null)}
          onSaved={() => setEditingFlow(null)}
        />
      )}
    </div>
  );
}
