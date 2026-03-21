'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Flame, Thermometer, Snowflake, Send, Loader2, MessageSquareText, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { MarketingBroadcastModal } from '@/components/admin/MarketingBroadcastModal';

type Segment = 'HOT' | 'WARM' | 'COLD';
type SegmentFilter = Segment | 'ALL';
type BulkSegment = Segment | 'TODOS';
type ConversionStage = 'nao_abordado' | 'abordado' | 'oferta_feita' | 'oferta_especial' | 'convertido' | 'perdido';

type UserRow = {
  id: string;
  full_name: string;
  whatsapp_phone: string | null;
  segment: Segment;
  messages_total: number;
  total_points: number;
  days_in_trial: number | null;
  limit_reached: boolean;
  last_activity_date: string | null;
  last_whatsapp_at: string | null;
  whatsapp_notifications_enabled: boolean;
  conversion_stage: ConversionStage;
  last_user_message_at: string | null;
  meta_window_active: boolean;
  admin_approaches_count: number;
  has_unread?: boolean;
};

type ApiResponse = {
  summary: { HOT: number; WARM: number; COLD: number; total: number };
  page: number;
  pageSize: number;
  totalFiltered: number;
  users: UserRow[];
};

function segmentBadge(seg: Segment) {
  if (seg === 'HOT') return <Badge className="bg-red-50 text-red-700 border border-red-200">HOT</Badge>;
  if (seg === 'WARM') return <Badge className="bg-amber-50 text-amber-700 border border-amber-200">WARM</Badge>;
  return <Badge className="bg-sky-50 text-sky-700 border border-sky-200">COLD</Badge>;
}

function fmtDate(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('pt-BR');
}

function stageBadge(stage: ConversionStage) {
  if (stage === 'abordado') return <Badge className="bg-blue-50 text-blue-700 border border-blue-200">Abordado</Badge>;
  if (stage === 'oferta_feita') return <Badge className="bg-amber-50 text-amber-800 border border-amber-200">Oferta feita</Badge>;
  if (stage === 'oferta_especial') return <Badge className="bg-orange-50 text-orange-800 border border-orange-200">Oferta especial</Badge>;
  if (stage === 'convertido') return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">Convertido</Badge>;
  if (stage === 'perdido') return <Badge className="bg-red-50 text-red-700 border border-red-200">Perdido</Badge>;
  return <Badge className="bg-slate-100 text-slate-700 border border-slate-200">Não abordado</Badge>;
}

export default function AdminReengagementPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApiResponse | null>(null);

  // filtros
  const [segment, setSegment] = useState<SegmentFilter>('ALL');
  const [minTrialDays, setMinTrialDays] = useState<string>('0');
  const [maxTrialDays, setMaxTrialDays] = useState<string>('3650');
  const [minTrialDaysInput, setMinTrialDaysInput] = useState<string>('0');
  const [maxTrialDaysInput, setMaxTrialDaysInput] = useState<string>('3650');
  const [stageSelectOpen, setStageSelectOpen] = useState(false);
  const [limitReached, setLimitReached] = useState<'all' | 'true' | 'false'>('all');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [sort, setSort] = useState<'messages_desc' | 'points_desc' | 'trial_days_desc'>('messages_desc');
  const [sort2, setSort2] = useState<string>('none');
  const [page, setPage] = useState(1);
  const [activeWindowOnly, setActiveWindowOnly] = useState(false);

  // modal individual
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [modalTab, setModalTab] = useState<'templates' | 'free'>('templates');
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templates, setTemplates] = useState<any[] | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});
  const [sendingTemplate, setSendingTemplate] = useState(false);

  // bulk
  const [bulkSegment, setBulkSegment] = useState<BulkSegment>('HOT');
  const [bulkTemplate, setBulkTemplate] = useState('');
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ sent: number; total: number; ok: number; fail: number } | null>(null);
  const [bulkActiveWindowOnly, setBulkActiveWindowOnly] = useState(true);
  const [bulkTargetCount, setBulkTargetCount] = useState<number>(0);
  const [bulkCountLoading, setBulkCountLoading] = useState(false);
  const [isMarketingModalOpen, setIsMarketingModalOpen] = useState(false);

  const lastManualFetchAtRef = useRef(0);
  const minTrialDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTrialDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleMinTrialDaysCommit = useCallback((value: string) => {
    if (minTrialDebounceRef.current) clearTimeout(minTrialDebounceRef.current);
    minTrialDebounceRef.current = setTimeout(() => {
      minTrialDebounceRef.current = null;
      setMinTrialDays(value);
    }, 500);
  }, []);

  const scheduleMaxTrialDaysCommit = useCallback((value: string) => {
    if (maxTrialDebounceRef.current) clearTimeout(maxTrialDebounceRef.current);
    maxTrialDebounceRef.current = setTimeout(() => {
      maxTrialDebounceRef.current = null;
      setMaxTrialDays(value);
    }, 500);
  }, []);

  const segmentCounts = data?.summary ?? { HOT: 0, WARM: 0, COLD: 0, total: 0 };

  const previewUser = useMemo(() => {
    if (!data?.users?.length) return null;
    const match = bulkSegment === 'TODOS' ? data.users[0] : data.users.find((u) => u.segment === bulkSegment) ?? data.users[0];
    return match;
  }, [data?.users, bulkSegment]);

  const bulkPreviewText = useMemo(() => {
    const name = previewUser?.full_name ?? 'Aluno(a)';
    return (bulkTemplate || '').replaceAll('{{nome}}', name);
  }, [bulkTemplate, previewUser?.full_name]);

  const fetchUsers = useCallback(async (fromPolling = false) => {
    if (!fromPolling) {
      lastManualFetchAtRef.current = Date.now();
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
        segment,
        minTrialDays: minTrialDays || '0',
        maxTrialDays: maxTrialDays || '3650',
        sort,
      });
      if (stageFilter !== 'ALL') params.set('stage', stageFilter);
      if (sort2 !== 'none') params.set('sort2', sort2);
      if (limitReached !== 'all') params.set('limitReached', limitReached);
      if (activeWindowOnly) params.set('activeWindowOnly', 'true');

      const res = await fetch(`/api/admin/reengagement/users?${params.toString()}`);
      const json = (await res.json()) as ApiResponse & { error?: string };
      if (!res.ok) throw new Error(json.error || 'Falha ao carregar usuários');
      setData(json);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar usuários');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, segment, stageFilter, minTrialDays, maxTrialDays, limitReached, sort, sort2, activeWindowOnly]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => () => {
    if (minTrialDebounceRef.current) clearTimeout(minTrialDebounceRef.current);
    if (maxTrialDebounceRef.current) clearTimeout(maxTrialDebounceRef.current);
  }, []);

  // Atualiza lista ao voltar para a aba (nova msg do usuário → has_unread do backend)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState !== 'visible') return;
      fetchUsers();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [fetchUsers]);

  // Polling na listagem para refletir novas mensagens (verde "não lida")
  const REFETCH_INTERVAL_MS = 120_000;
  const MIN_GAP_AFTER_MANUAL_MS = 10_000;
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (stageSelectOpen) return;
      if (Date.now() - lastManualFetchAtRef.current < MIN_GAP_AFTER_MANUAL_MS) return;
      fetchUsers(true);
    }, REFETCH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchUsers, stageSelectOpen]);

  // Contagem do disparo em massa com os mesmos filtros da tabela
  useEffect(() => {
    let cancelled = false;
    setBulkCountLoading(true);
    const params = new URLSearchParams({
      page: '1',
      pageSize: '1',
      segment: bulkSegment === 'TODOS' ? 'ALL' : bulkSegment,
      minTrialDays: minTrialDays || '0',
      maxTrialDays: maxTrialDays || '3650',
      sort,
    });
    if (stageFilter !== 'ALL') params.set('stage', stageFilter);
    if (sort2 !== 'none') params.set('sort2', sort2);
    if (limitReached !== 'all') params.set('limitReached', limitReached);
    if (bulkActiveWindowOnly) params.set('activeWindowOnly', 'true');
    fetch(`/api/admin/reengagement/users?${params.toString()}`)
      .then((res) => res.json())
      .then((json: ApiResponse & { totalFiltered?: number }) => {
        if (!cancelled) setBulkTargetCount(json?.totalFiltered ?? 0);
      })
      .catch(() => { if (!cancelled) setBulkTargetCount(0); })
      .finally(() => { if (!cancelled) setBulkCountLoading(false); });
    return () => { cancelled = true; };
  }, [bulkSegment, stageFilter, minTrialDays, maxTrialDays, limitReached, bulkActiveWindowOnly, sort, sort2]);

  const totalPages = useMemo(() => {
    const total = data?.totalFiltered ?? 0;
    return Math.max(1, Math.ceil(total / 20));
  }, [data?.totalFiltered]);

  function openSendModal(u: UserRow) {
    setSelected(u);
    setMessage('');
    setModalTab(u.meta_window_active ? 'free' : 'templates');
    setSelectedTemplate(null);
    setTemplateVars({});
    setModalOpen(true);
  }

  async function sendIndividual() {
    if (!selected?.whatsapp_phone) {
      toast.error('Usuário sem WhatsApp');
      return;
    }
    if (!message.trim()) {
      toast.error('Digite uma mensagem');
      return;
    }
    if (!selected.meta_window_active) {
      toast.error('Este usuário está fora da janela de 24h da Meta. Use um template aprovado para iniciar a conversa.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/admin/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: selected.whatsapp_phone, message, userId: selected.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Falha ao enviar');
      toast.success('Mensagem enviada');
      setModalOpen(false);
      fetchUsers();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao enviar');
    } finally {
      setSending(false);
    }
  }

  async function loadTemplates() {
    setTemplatesLoading(true);
    try {
      const res = await fetch('/api/admin/whatsapp/templates');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Falha ao carregar templates');
      const list = (json?.data?.data as any[]) ?? (json?.data as any[]) ?? [];
      setTemplates(list);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar templates');
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }

  function templateBodyPreview(tpl: any): string {
    const comps = (tpl?.components as any[]) ?? [];
    const body = comps.find((c) => (c?.type || '').toUpperCase() === 'BODY');
    return String(body?.text ?? '').trim();
  }

  function templateVarKeys(tpl: any): string[] {
    const body = templateBodyPreview(tpl);
    const matches = Array.from(body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)).map((m) => m[1]);
    return Array.from(new Set(matches));
  }

  async function selectTemplate(tpl: any) {
    setSelectedTemplate(tpl);
    const keys = templateVarKeys(tpl);
    const initial: Record<string, string> = {};
    for (const k of keys) initial[k] = '';
    if (keys.includes('1') && selected?.full_name) initial['1'] = selected.full_name;
    setTemplateVars(initial);
  }

  async function sendSelectedTemplate() {
    if (!selected?.whatsapp_phone) {
      toast.error('Usuário sem WhatsApp');
      return;
    }
    if (!selectedTemplate) {
      toast.error('Selecione um template');
      return;
    }
    const status = String(selectedTemplate?.status ?? '').toUpperCase();
    if (status !== 'APPROVED') {
      toast.error('Template precisa estar APPROVED');
      return;
    }

    const keys = templateVarKeys(selectedTemplate);
    const vars = keys
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => (templateVars[k] ?? '').trim());

    if (vars.some((v) => !v)) {
      toast.error('Preencha todas as variáveis do template');
      return;
    }

    setSendingTemplate(true);
    try {
      const res = await fetch('/api/admin/whatsapp/send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selected.whatsapp_phone,
          userId: selected.id,
          template_name: selectedTemplate?.name,
          variables: vars,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Falha ao enviar template');
      toast.success('Template enviado');
      setModalOpen(false);
      fetchUsers();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao enviar template');
    } finally {
      setSendingTemplate(false);
    }
  }

  async function updateStage(userId: string, newStage: ConversionStage) {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        users: prev.users.map((u) =>
          u.id === userId ? { ...u, conversion_stage: newStage } : u
        ),
      };
    });
    try {
      const res = await fetch('/api/admin/reengagement/stage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, conversion_stage: newStage }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Falha ao atualizar stage');
      toast.success('Stage atualizado');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar stage');
      fetchUsers();
    }
  }

  async function runBulkSend() {
    if (!bulkTemplate.trim()) {
      toast.error('Digite um template');
      return;
    }
    setBulkConfirmOpen(false);
    setBulkRunning(true);
    setBulkProgress({ sent: 0, total: 0, ok: 0, fail: 0 });
    try {
      const params = new URLSearchParams({
        all: 'true',
        pageSize: '2000',
        sort,
        minTrialDays: minTrialDays || '0',
        maxTrialDays: maxTrialDays || '3650',
      });
      if (bulkSegment !== 'TODOS') params.set('segment', bulkSegment);
      if (stageFilter !== 'ALL') params.set('stage', stageFilter);
      if (sort2 !== 'none') params.set('sort2', sort2);
      if (limitReached !== 'all') params.set('limitReached', limitReached);
      if (bulkActiveWindowOnly) params.set('activeWindowOnly', 'true');

      const res = await fetch(`/api/admin/reengagement/users?${params.toString()}`);
      const json = (await res.json()) as ApiResponse & { error?: string };
      if (!res.ok) throw new Error(json.error || 'Falha ao carregar lista para disparo');

      const list = json.users.filter((u) => u.whatsapp_phone);
      if (list.length > 30) {
        throw new Error(`Este segmento tem ${list.length} usuários. Limite máximo por disparo é 30 — filtre (ex.: apenas janela ativa) ou refine o segmento.`);
      }
      const total = list.length;
      setBulkProgress({ sent: 0, total, ok: 0, fail: 0 });

      let ok = 0;
      let fail = 0;
      for (let i = 0; i < list.length; i += 1) {
        const u = list[i];
        const body = bulkTemplate.replaceAll('{{nome}}', u.full_name || 'Aluno(a)');
        try {
          const r = await fetch('/api/admin/whatsapp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: u.whatsapp_phone, message: body, userId: u.id }),
          });
          if (!r.ok) fail += 1;
          else ok += 1;
        } catch {
          fail += 1;
        }
        setBulkProgress({ sent: i + 1, total, ok, fail });
        // delay 1500ms (mais seguro que 1s)
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      toast.success(`Disparo finalizado: ${ok} ok, ${fail} falhas`);
    } catch (e: any) {
      toast.error(e?.message || 'Erro no disparo');
    } finally {
      setBulkRunning(false);
    }
  }

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen font-sans text-slate-900">
      <MarketingBroadcastModal
        isOpen={isMarketingModalOpen}
        onClose={() => setIsMarketingModalOpen(false)}
      />
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/portal/admin" className="text-slate-500 hover:text-slate-900">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Reengajamento</h1>
          </div>
          <p className="text-slate-500 mt-1">Segmentação automática e disparos via WhatsApp.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button className="rounded-xl" onClick={() => setIsMarketingModalOpen(true)}>
            📣 Fazer envio de marketing
          </Button>
          <Link href="/portal/admin">
            <Button variant="outline" className="rounded-xl">Voltar</Button>
          </Link>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase">HOT</p>
                <h3 className="text-4xl font-bold mt-2">{loading ? '—' : segmentCounts.HOT}</h3>
              </div>
              <div className="p-3 bg-red-50 rounded-lg"><Flame className="w-6 h-6 text-red-600" /></div>
            </div>
            <p className="text-sm text-slate-500 mt-4">Alta probabilidade de conversão.</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase">WARM</p>
                <h3 className="text-4xl font-bold mt-2">{loading ? '—' : segmentCounts.WARM}</h3>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg"><Thermometer className="w-6 h-6 text-amber-600" /></div>
            </div>
            <p className="text-sm text-slate-500 mt-4">Ativo, mas ainda sem sinal forte.</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-sky-500">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase">COLD</p>
                <h3 className="text-4xl font-bold mt-2">{loading ? '—' : segmentCounts.COLD}</h3>
              </div>
              <div className="p-3 bg-sky-50 rounded-lg"><Snowflake className="w-6 h-6 text-sky-600" /></div>
            </div>
            <p className="text-sm text-slate-500 mt-4">Ainda não concluiu onboarding/handshake.</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usuários</CardTitle>
          <CardDescription>Filtre e envie mensagens individuais.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Segmento</p>
              <Select value={segment} onValueChange={(v) => { setPage(1); setSegment(v as SegmentFilter); }}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Segmento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="HOT">HOT</SelectItem>
                  <SelectItem value="WARM">WARM</SelectItem>
                  <SelectItem value="COLD">COLD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Stage</p>
              <Select
                value={stageFilter}
                onOpenChange={setStageSelectOpen}
                onValueChange={(v) => { setPage(1); setStageFilter(v); }}
              >
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Stage" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="nao_abordado">Não abordado</SelectItem>
                  <SelectItem value="abordado">Abordado</SelectItem>
                  <SelectItem value="oferta_feita">Oferta feita</SelectItem>
                  <SelectItem value="oferta_especial">Oferta especial</SelectItem>
                  <SelectItem value="convertido">Convertido</SelectItem>
                  <SelectItem value="perdido">Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Min dias trial</p>
              <Input
                className="rounded-xl"
                value={minTrialDaysInput}
                onChange={(e) => {
                  setPage(1);
                  const v = e.target.value;
                  setMinTrialDaysInput(v);
                  scheduleMinTrialDaysCommit(v);
                }}
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Max dias trial</p>
              <Input
                className="rounded-xl"
                value={maxTrialDaysInput}
                onChange={(e) => {
                  setPage(1);
                  const v = e.target.value;
                  setMaxTrialDaysInput(v);
                  scheduleMaxTrialDaysCommit(v);
                }}
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Limit reached</p>
              <Select value={limitReached} onValueChange={(v) => { setPage(1); setLimitReached(v as any); }}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Sim</SelectItem>
                  <SelectItem value="false">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Ordenação</p>
              <Select value={sort} onValueChange={(v) => { setPage(1); setSort(v as any); }}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="messages_desc">Mensagens ↓</SelectItem>
                  <SelectItem value="points_desc">Pontos ↓</SelectItem>
                  <SelectItem value="trial_days_desc">Dias trial ↓</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Ordenação secundária</p>
              <Select value={sort2} onValueChange={(v) => { setPage(1); setSort2(v); }}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  <SelectItem value="messages_desc">Mensagens ↓</SelectItem>
                  <SelectItem value="points_desc">Pontos ↓</SelectItem>
                  <SelectItem value="trial_days_desc">Dias trial ↓</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={activeWindowOnly} onCheckedChange={(v) => { setPage(1); setActiveWindowOnly(!!v); }} />
            <span className="text-sm text-slate-700 font-medium">Apenas janela ativa</span>
            <span className="text-xs text-slate-500">(última mensagem do usuário nas últimas 24h)</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left p-3">Nome</th>
                  <th className="text-left p-3">WhatsApp</th>
                  <th className="text-left p-3">Segmento</th>
                  <th className="text-left p-3">Janela Meta</th>
                  <th className="text-left p-3">Stage</th>
                  <th className="text-right p-3">Abordagens</th>
                  <th className="text-right p-3">Mensagens</th>
                  <th className="text-right p-3">Pontos</th>
                  <th className="text-right p-3">Dias em Trial</th>
                  <th className="text-center p-3">Limit</th>
                  <th className="text-left p-3">Últ. Atividade</th>
                  <th className="text-left p-3">Ação</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-3" colSpan={12}><Skeleton className="h-6 w-full" /></td>
                    </tr>
                  ))
                )}
                {!loading && (data?.users?.length ?? 0) === 0 && (
                  <tr className="border-t">
                    <td className="p-6 text-slate-500" colSpan={12}>Nenhum usuário encontrado.</td>
                  </tr>
                )}
                {!loading && data?.users?.map((u) => (
                  <tr key={u.id} className={`border-t hover:bg-slate-50/50 ${u.has_unread === true ? 'bg-green-50' : ''}`}>
                    <td className="p-3 font-medium">
                      <span className="inline-flex items-center">
                        {u.full_name}
                        {u.has_unread === true && (
                          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse inline-block ml-2 shrink-0" />
                        )}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{u.whatsapp_phone || '—'}</td>
                    <td className="p-3">{segmentBadge(u.segment)}</td>
                    <td className="p-3">
                      {u.meta_window_active ? (
                        <Badge className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4" />
                          Janela ativa
                        </Badge>
                      ) : (
                        <Badge className="inline-flex items-center gap-2 bg-red-50 text-red-700 border border-red-200">
                          <XCircle className="w-4 h-4" />
                          Janela expirada
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {stageBadge(u.conversion_stage)}
                        <Select
                          value={u.conversion_stage}
                          onOpenChange={setStageSelectOpen}
                          onValueChange={(v) => updateStage(u.id, v as ConversionStage)}
                        >
                          <SelectTrigger className="h-8 w-[170px] rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nao_abordado">Não abordado</SelectItem>
                            <SelectItem value="abordado">Abordado</SelectItem>
                            <SelectItem value="oferta_feita">Oferta feita</SelectItem>
                            <SelectItem value="oferta_especial">Oferta especial</SelectItem>
                            <SelectItem value="convertido">Convertido</SelectItem>
                            <SelectItem value="perdido">Perdido</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      <div className="flex items-center justify-end gap-2">
                        <span className="tabular-nums">{u.admin_approaches_count ?? 0}</span>
                        {(u.admin_approaches_count ?? 0) >= 3 && u.conversion_stage !== 'convertido' && (
                          <Badge className="inline-flex items-center gap-2 bg-orange-50 text-orange-800 border border-orange-200">
                            <AlertTriangle className="w-4 h-4" />
                            3+ tentativas
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right tabular-nums">{u.messages_total}</td>
                    <td className="p-3 text-right tabular-nums">{u.total_points}</td>
                    <td className="p-3 text-right tabular-nums">{u.days_in_trial ?? '—'}</td>
                    <td className="p-3 text-center">{u.limit_reached ? <Badge className="bg-red-50 text-red-700 border border-red-200">Sim</Badge> : <span className="text-slate-400">—</span>}</td>
                    <td className="p-3 text-slate-600">{u.last_activity_date || '—'}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/portal/admin/reengagement/${u.id}`} prefetch={false}>
                          <Button className="rounded-xl" size="sm" variant="outline">
                            <MessageSquareText className="w-4 h-4 mr-2" /> Ver conversa
                          </Button>
                        </Link>
                        <Button
                          className="rounded-xl"
                          size="sm"
                          onClick={() => openSendModal(u)}
                          disabled={!u.whatsapp_phone || !u.whatsapp_notifications_enabled}
                          variant={!u.whatsapp_notifications_enabled ? 'outline' : 'default'}
                        >
                          <Send className="w-4 h-4 mr-2" /> Enviar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-slate-500">
              {data ? `${data.totalFiltered} usuários` : '—'}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="rounded-xl" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Anterior
              </Button>
              <span className="text-sm text-slate-600 tabular-nums">{page} / {totalPages}</span>
              <Button variant="outline" className="rounded-xl" disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                Próxima
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Disparo em massa</CardTitle>
          <CardDescription>Envie um template com variável <span className="font-mono">{'{{nome}}'}</span> para um segmento. Usa os mesmos filtros da tabela acima.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Segmento alvo</p>
              <Select value={bulkSegment} onValueChange={(v) => setBulkSegment(v as BulkSegment)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOT">HOT</SelectItem>
                  <SelectItem value="WARM">WARM</SelectItem>
                  <SelectItem value="COLD">COLD</SelectItem>
                  <SelectItem value="TODOS">TODOS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Stage</p>
              <Select value={stageFilter} onOpenChange={setStageSelectOpen} onValueChange={setStageFilter}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Stage" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="nao_abordado">Não abordado</SelectItem>
                  <SelectItem value="abordado">Abordado</SelectItem>
                  <SelectItem value="oferta_feita">Oferta feita</SelectItem>
                  <SelectItem value="oferta_especial">Oferta especial</SelectItem>
                  <SelectItem value="convertido">Convertido</SelectItem>
                  <SelectItem value="perdido">Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Min dias trial</p>
              <Input
                className="rounded-xl"
                value={minTrialDaysInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setMinTrialDaysInput(v);
                  scheduleMinTrialDaysCommit(v);
                }}
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Max dias trial</p>
              <Input
                className="rounded-xl"
                value={maxTrialDaysInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setMaxTrialDaysInput(v);
                  scheduleMaxTrialDaysCommit(v);
                }}
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Limit reached</p>
              <Select value={limitReached} onValueChange={(v) => setLimitReached(v as any)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Sim</SelectItem>
                  <SelectItem value="false">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 md:col-span-6">
              <Switch checked={bulkActiveWindowOnly} onCheckedChange={(v) => setBulkActiveWindowOnly(!!v)} />
              <span className="text-sm text-slate-700 font-medium">Apenas janela ativa</span>
              <span className="text-xs text-slate-500">(recomendado)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Template</p>
              <Textarea className="rounded-xl min-h-[88px]" value={bulkTemplate} onChange={(e) => setBulkTemplate(e.target.value)} placeholder="Ex: Oi {{nome}}, vi que você começou o StudyTrack..." />
            </div>
          </div>

          {bulkTargetCount > 30 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Este segmento tem mais de 30 usuários. O disparo é limitado a 30 por vez — considere filtrar por “apenas janela ativa” ou segmentar melhor.
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500 mb-1">Preview</p>
            <p className="text-sm text-slate-800 whitespace-pre-wrap">{bulkPreviewText || '—'}</p>
            <p className="text-xs text-slate-400 mt-2">Exemplo com: {previewUser?.full_name ?? '—'}</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              {bulkProgress ? (
                <span className="tabular-nums">Enviando {bulkProgress.sent}/{bulkProgress.total}… (ok {bulkProgress.ok}, falhas {bulkProgress.fail})</span>
              ) : (
                <span>Delay de 1500ms entre mensagens.</span>
              )}
            </div>
            <Button
              className="rounded-xl"
              onClick={() => setBulkConfirmOpen(true)}
              disabled={bulkRunning || bulkTargetCount === 0 || bulkCountLoading}
            >
              {bulkRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : bulkCountLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Disparar para {bulkCountLoading ? '…' : bulkTargetCount} usuários
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal individual */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Enviar mensagem</DialogTitle>
            <DialogDescription>
              {selected?.full_name} · {selected?.whatsapp_phone || 'Sem WhatsApp'}
            </DialogDescription>
          </DialogHeader>
          <Tabs value={modalTab} onValueChange={(v) => setModalTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates" onClick={() => { if (!templates) loadTemplates(); }}>
                Templates da Meta
              </TabsTrigger>
              <TabsTrigger value="free" disabled={!selected?.meta_window_active}>
                Mensagem livre
              </TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500">Templates</p>
                <Button variant="outline" size="sm" className="rounded-xl" onClick={loadTemplates} disabled={templatesLoading}>
                  {templatesLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Recarregar
                </Button>
              </div>

              <div className="max-h-[240px] overflow-auto rounded-xl border border-slate-200 bg-white">
                {templatesLoading && (
                  <div className="p-4 text-sm text-slate-500 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Carregando templates...
                  </div>
                )}
                {!templatesLoading && (templates?.length ?? 0) === 0 && (
                  <div className="p-4 text-sm text-slate-500">Nenhum template encontrado.</div>
                )}
                {!templatesLoading && (templates ?? []).map((tpl) => {
                  const status = String(tpl?.status ?? '').toUpperCase();
                  const canUse = status === 'APPROVED';
                  const statusBadge = status === 'APPROVED'
                    ? (
                      <Badge className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4" />
                        APPROVED
                      </Badge>
                    )
                    : status === 'PENDING'
                      ? (
                        <Badge className="inline-flex items-center gap-2 bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-4 h-4" />
                          PENDING
                        </Badge>
                      )
                      : status === 'REJECTED'
                        ? (
                          <Badge className="inline-flex items-center gap-2 bg-red-50 text-red-700 border border-red-200">
                            <XCircle className="w-4 h-4" />
                            REJECTED
                          </Badge>
                        )
                        : (
                          <Badge className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 border border-slate-200">
                            <Clock className="w-4 h-4" />
                            DISABLED
                          </Badge>
                        );

                  const preview = templateBodyPreview(tpl);
                  const isSelected = selectedTemplate?.name && selectedTemplate?.name === tpl?.name;
                  return (
                    <div key={tpl?.name ?? Math.random()} className={`p-4 border-b last:border-b-0 ${isSelected ? 'bg-indigo-50/40' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{tpl?.name ?? '—'}</p>
                          <div className="mt-1 flex items-center gap-2">{statusBadge}</div>
                        </div>
                        <Button
                          size="sm"
                          className="rounded-xl"
                          onClick={() => selectTemplate(tpl)}
                          disabled={!canUse}
                          variant={isSelected ? 'default' : 'outline'}
                        >
                          Usar este template
                        </Button>
                      </div>
                      <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">{preview || '—'}</p>
                    </div>
                  );
                })}
              </div>

              {selectedTemplate && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500">Variáveis</p>
                  <div className="grid grid-cols-1 gap-2">
                    {templateVarKeys(selectedTemplate).sort((a, b) => Number(a) - Number(b)).map((k) => (
                      <div key={k} className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-500 w-14">{`{{${k}}}`}</span>
                        <Input
                          className="rounded-xl"
                          value={templateVars[k] ?? ''}
                          onChange={(e) => setTemplateVars((prev) => ({ ...prev, [k]: e.target.value }))}
                          placeholder={k === '1' ? 'Nome (auto)' : `Valor para {{${k}}}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="free" className="space-y-2">
              {!selected?.meta_window_active && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  Este usuário está fora da janela de 24h da Meta. Use um template aprovado para iniciar a conversa.
                </div>
              )}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500">Mensagem (máx. 1024)</p>
                  <span className="text-xs text-slate-500 tabular-nums">{message.length}/1024</span>
                </div>
                <Textarea
                  className="rounded-xl min-h-[120px]"
                  value={message}
                  maxLength={1024}
                  disabled={!selected?.meta_window_active}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="sm:justify-end">
            <Button variant="outline" className="rounded-xl" onClick={() => setModalOpen(false)} disabled={sending || sendingTemplate}>Cancelar</Button>
            {modalTab === 'templates' ? (
              <Button className="rounded-xl" onClick={sendSelectedTemplate} disabled={sendingTemplate || !selectedTemplate}>
                {sendingTemplate ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Enviar template
              </Button>
            ) : (
              <Button className="rounded-xl" onClick={sendIndividual} disabled={sending || !selected?.meta_window_active}>
                {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Enviar mensagem
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal confirmação bulk */}
      <Dialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Confirmar disparo</DialogTitle>
            <DialogDescription>
              Enviar para <span className="font-semibold">{bulkTargetCount}</span> usuários (segmento <span className="font-semibold">{bulkSegment}</span>, stage e demais filtros aplicados).
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 mb-1">Template</p>
            <p className="text-sm whitespace-pre-wrap">{bulkTemplate || '—'}</p>
          </div>
          <DialogFooter className="sm:justify-end">
            <Button variant="outline" className="rounded-xl" onClick={() => setBulkConfirmOpen(false)} disabled={bulkRunning}>Cancelar</Button>
            <Button className="rounded-xl" onClick={runBulkSend} disabled={bulkRunning}>
              {bulkRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Confirmar e enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

