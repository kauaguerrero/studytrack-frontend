'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Send, Sparkles, CheckCircle2, XCircle } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

type Segment = 'HOT' | 'WARM' | 'COLD';
type SegmentFilter = Segment | 'ALL';
type ConversionStage = 'nao_abordado' | 'abordado' | 'oferta_feita' | 'oferta_especial' | 'convertido' | 'perdido';

type UserRow = {
  id: string;
  full_name: string;
  whatsapp_phone: string | null;
  segment: Segment;
  last_whatsapp_at: string | null;
  conversion_stage: ConversionStage;
  last_user_message_at: string | null;
  meta_window_active: boolean;
  admin_approaches_count: number;
  has_unread?: boolean;
};

type ChatItem =
  | {
      kind: 'whatsapp_log';
      id: string;
      direction: 'inbound' | 'outbound' | null;
      text: string;
      created_at: string | null;
    }
  | {
      kind: 'admin_action';
      id: string;
      action_type: string | null;
      text: string;
      created_at: string | null;
      payload: any;
    };

function segmentBadge(seg: Segment) {
  if (seg === 'HOT') return <Badge className="bg-red-50 text-red-700 border border-red-200">HOT</Badge>;
  if (seg === 'WARM') return <Badge className="bg-amber-50 text-amber-700 border border-amber-200">WARM</Badge>;
  return <Badge className="bg-sky-50 text-sky-700 border border-sky-200">COLD</Badge>;
}

function stageBadge(stage: ConversionStage) {
  if (stage === 'abordado') return <Badge className="bg-blue-50 text-blue-700 border border-blue-200">Abordado</Badge>;
  if (stage === 'oferta_feita') return <Badge className="bg-amber-50 text-amber-800 border border-amber-200">Oferta feita</Badge>;
  if (stage === 'oferta_especial') return <Badge className="bg-orange-50 text-orange-800 border border-orange-200">Oferta especial</Badge>;
  if (stage === 'convertido') return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">Convertido</Badge>;
  if (stage === 'perdido') return <Badge className="bg-red-50 text-red-700 border border-red-200">Perdido</Badge>;
  return <Badge className="bg-slate-100 text-slate-700 border border-slate-200">Não abordado</Badge>;
}

function fmtTime(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function bubbleClass(kind: ChatItem['kind'], direction?: ChatItem extends any ? any : never) {
  if (kind === 'admin_action') return 'bg-purple-950/70 border border-purple-700 text-purple-50';
  if (direction === 'outbound') return 'bg-emerald-950/60 border border-emerald-700 text-emerald-50 ml-auto';
  if (direction === 'inbound') return 'bg-slate-900/70 border border-slate-700 text-slate-50';
  return 'bg-slate-900/70 border border-slate-700 text-slate-50';
}

export default function AdminReengagementConversationPage() {
  const params = useParams<{ userId: string }>();
  const userId = params?.userId;

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingChat, setLoadingChat] = useState(true);
  const [items, setItems] = useState<ChatItem[]>([]);

  const selectedUser = useMemo(() => users.find((u) => u.id === userId) ?? null, [users, userId]);

  const [sendTab, setSendTab] = useState<'free' | 'templates'>('free');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templates, setTemplates] = useState<any[] | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});
  const [sendingTemplate, setSendingTemplate] = useState(false);

  const [suggestions, setSuggestions] = useState<Record<string, { loading: boolean; text: string | null }>>({});

  const [readAtMap, setReadAtMap] = useState<Record<string, number>>({});
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const [segment, setSegment] = useState<SegmentFilter>('ALL');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [minTrialDays, setMinTrialDays] = useState<string>('0');
  const [maxTrialDays, setMaxTrialDays] = useState<string>('3650');
  const [limitReached, setLimitReached] = useState<'all' | 'true' | 'false'>('all');
  const [sort, setSort] = useState<'messages_desc' | 'points_desc' | 'trial_days_desc'>('messages_desc');
  const [sort2, setSort2] = useState<string>('none');
  const [activeWindowOnly, setActiveWindowOnly] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = useCallback(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams({
        all: 'true',
        pageSize: '2000',
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
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Falha ao carregar usuários');
      setUsers((json?.users as UserRow[]) ?? []);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar usuários');
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [segment, stageFilter, minTrialDays, maxTrialDays, limitReached, sort, sort2, activeWindowOnly]);

  const fetchConversation = useCallback(async () => {
    if (!userId) return;
    setLoadingChat(true);
    try {
      const res = await fetch(`/api/admin/reengagement/conversation?userId=${encodeURIComponent(userId)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Falha ao carregar conversa');
      setItems((json?.items as ChatItem[]) ?? []);
      setTimeout(scrollToBottom, 50);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar conversa');
      setItems([]);
    } finally {
      setLoadingChat(false);
    }
  }, [scrollToBottom, userId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Carrega "último timestamp lido" da conversa por usuário (localStorage).
  useEffect(() => {
    try {
      const raw = localStorage.getItem('reengajamento_readAtMap');
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, number>;
      if (parsed && typeof parsed === 'object') setReadAtMap(parsed);
    } catch {
      // ignore
    }
  }, []);

  // Marca como "lido" nesta sessão ao abrir a conversa (client-side, sem persistência).
  useEffect(() => {
    if (!userId) return;
    setReadIds((prev) => new Set(prev).add(userId));
  }, [userId]);

  // Marca como "lido" quando o admin abre a conversa (persistido em localStorage).
  useEffect(() => {
    if (!userId) return;
    if (!selectedUser?.last_user_message_at) return;

    const lastAtMs = new Date(selectedUser.last_user_message_at).getTime();
    if (!Number.isFinite(lastAtMs)) return;

    setReadAtMap((prev) => {
      const next = { ...prev, [userId]: lastAtMs };
      try {
        localStorage.setItem('reengajamento_readAtMap', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [selectedUser?.last_user_message_at, userId]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  useEffect(() => {
    if (!selectedUser) return;
    setSendTab(selectedUser.meta_window_active ? 'free' : 'templates');
  }, [selectedUser?.meta_window_active]);

  // Realtime: novas mensagens no whatsapp_logs
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`conversa-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_logs',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchConversation();
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversation, fetchUsers, userId]);

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
    if (keys.includes('1') && selectedUser?.full_name) initial['1'] = selectedUser.full_name;
    setTemplateVars(initial);
  }

  async function sendFreeMessage() {
    if (!selectedUser?.whatsapp_phone) {
      toast.error('Usuário sem WhatsApp');
      return;
    }
    if (!selectedUser.meta_window_active) {
      toast.error('Fora da janela de 24h. Use template aprovado.');
      return;
    }
    if (!message.trim()) {
      toast.error('Digite uma mensagem');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/admin/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: selectedUser.whatsapp_phone, message, userId: selectedUser.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Falha ao enviar');
      setMessage('');
      fetchConversation();
      fetchUsers();
      setTimeout(scrollToBottom, 50);
      toast.success('Mensagem enviada');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao enviar');
    } finally {
      setSending(false);
    }
  }

  async function sendTemplate() {
    if (!selectedUser?.whatsapp_phone) {
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
    const vars = keys.sort((a, b) => Number(a) - Number(b)).map((k) => (templateVars[k] ?? '').trim());
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
          to: selectedUser.whatsapp_phone,
          userId: selectedUser.id,
          template_name: selectedTemplate?.name,
          variables: vars,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Falha ao enviar template');
      fetchConversation();
      fetchUsers();
      setTimeout(scrollToBottom, 50);
      toast.success('Template enviado');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao enviar template');
    } finally {
      setSendingTemplate(false);
    }
  }

  async function suggestReply(item: Extract<ChatItem, { kind: 'whatsapp_log' }>) {
    if (!selectedUser) return;
    if (item.direction !== 'inbound') return;
    const msg = item.text?.trim();
    if (!msg) return;

    setSuggestions((prev) => ({ ...prev, [item.id]: { loading: true, text: null } }));
    try {
      const res = await fetch('/api/admin/whatsapp/suggest-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, messageId: item.id, userMessage: msg }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Falha ao sugerir resposta');
      setSuggestions((prev) => ({ ...prev, [item.id]: { loading: false, text: String(json?.suggestion ?? '').trim() } }));
    } catch (e: any) {
      setSuggestions((prev) => ({ ...prev, [item.id]: { loading: false, text: null } }));
      toast.error(e?.message || 'Erro ao sugerir resposta');
    }
  }

  const sidebarUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const ta = a.last_user_message_at ? new Date(a.last_user_message_at).getTime() : 0;
      const tb = b.last_user_message_at ? new Date(b.last_user_message_at).getTime() : 0;
      return tb - ta;
    });
  }, [users]);

  // Mesma lógica da listagem principal: verde = mensagem nova do usuário que o admin não leu;
  // some ao abrir a conversa (readIds nesta sessão + readAtMap persistido).
  function shouldShowGreenDot(u: UserRow) {
    if (u.id === userId) return false;
    if (readIds.has(u.id)) return false;
    if (!u.has_unread) return false;
    const readAt = readAtMap[u.id];
    if (readAt == null) return true;
    const lastUserAt = u.last_user_message_at ? new Date(u.last_user_message_at).getTime() : 0;
    return lastUserAt > readAt;
  }

  return (
    <div className="h-[calc(100vh-0px)] bg-slate-50/50 text-slate-900">
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/portal/admin/reengagement" className="text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Conversa</h1>
            <p className="text-sm text-slate-500">Reengajamento · estilo WhatsApp Web</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[360px_1fr] h-[calc(100vh-73px)]">
        {/* Sidebar */}
        <div className="border-r bg-white overflow-y-auto flex flex-col">
          <div className="p-4 border-b shrink-0">
            <p className="text-sm font-semibold text-slate-700">Usuários</p>
            <p className="text-xs text-slate-500 mb-3">{loadingUsers ? 'Carregando...' : `${sidebarUsers.length} na lista`}</p>
            <div className="space-y-2">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 mb-0.5">Segmento</p>
                <Select value={segment} onValueChange={(v) => setSegment(v as SegmentFilter)}>
                  <SelectTrigger className="rounded-lg h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="HOT">HOT</SelectItem>
                    <SelectItem value="WARM">WARM</SelectItem>
                    <SelectItem value="COLD">COLD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 mb-0.5">Stage</p>
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger className="rounded-lg h-8 text-xs"><SelectValue /></SelectTrigger>
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
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 mb-0.5">Min trial</p>
                  <Input className="rounded-lg h-8 text-xs" value={minTrialDays} onChange={(e) => setMinTrialDays(e.target.value)} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 mb-0.5">Max trial</p>
                  <Input className="rounded-lg h-8 text-xs" value={maxTrialDays} onChange={(e) => setMaxTrialDays(e.target.value)} />
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 mb-0.5">Limit reached</p>
                <Select value={limitReached} onValueChange={(v) => setLimitReached(v as any)}>
                  <SelectTrigger className="rounded-lg h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="true">Sim</SelectItem>
                    <SelectItem value="false">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 mb-0.5">Ordenação</p>
                <Select value={sort} onValueChange={(v) => setSort(v as any)}>
                  <SelectTrigger className="rounded-lg h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="messages_desc">Mensagens ↓</SelectItem>
                    <SelectItem value="points_desc">Pontos ↓</SelectItem>
                    <SelectItem value="trial_days_desc">Dias trial ↓</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 mb-0.5">Ordenação sec.</p>
                <Select value={sort2} onValueChange={setSort2}>
                  <SelectTrigger className="rounded-lg h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    <SelectItem value="messages_desc">Mensagens ↓</SelectItem>
                    <SelectItem value="points_desc">Pontos ↓</SelectItem>
                    <SelectItem value="trial_days_desc">Dias trial ↓</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Switch checked={activeWindowOnly} onCheckedChange={setActiveWindowOnly} />
                <span className="text-xs text-slate-600">Janela 24h</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
          {sidebarUsers.map((u) => {
            const active = u.id === userId;
            const showGreenDot = shouldShowGreenDot(u);
            return (
              <Link key={u.id} href={`/portal/admin/reengagement/${u.id}`} prefetch={false}>
                <div className={`px-4 py-3 border-b hover:bg-slate-50 ${active ? 'bg-slate-50' : ''} ${showGreenDot ? 'bg-green-50' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {showGreenDot && <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse inline-block shrink-0" />}
                        <p className="font-semibold truncate">{u.full_name}</p>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{u.whatsapp_phone || '—'}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {segmentBadge(u.segment)}
                        {stageBadge(u.conversion_stage)}
                        {u.meta_window_active ? (
                          <Badge className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-4 h-4" />
                            Janela ativa
                          </Badge>
                        ) : (
                          <Badge className="inline-flex items-center gap-2 bg-red-50 text-red-700 border border-red-200">
                            <XCircle className="w-4 h-4" />
                            Expirada
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">{fmtTime(u.last_whatsapp_at)}</p>
                      <p className="mt-2 text-xs text-slate-700 font-semibold tabular-nums">{u.admin_approaches_count} abordagens</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
          </div>
        </div>

        {/* Chat */}
        <div className="flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {loadingChat && (
              <div className="text-sm text-slate-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando conversa...
              </div>
            )}

            {!loadingChat && items.length === 0 && (
              <div className="text-sm text-slate-500">Sem mensagens ainda.</div>
            )}

            {items.map((it) => {
              const isLog = it.kind === 'whatsapp_log';
              const isUser = isLog && it.direction === 'inbound';
              const sug = isLog ? suggestions[it.id] : undefined;
              return (
                <div key={`${it.kind}-${it.id}`} className={`max-w-[75%] rounded-2xl px-4 py-3 ${bubbleClass(it.kind, (it as any).direction)}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold opacity-80">
                      {it.kind === 'admin_action' ? 'Admin' : isUser ? 'Usuário' : 'Bot'}
                    </p>
                    <p className="text-[11px] opacity-70 tabular-nums">{fmtTime(it.created_at)}</p>
                  </div>
                  <p className="mt-2 text-sm whitespace-pre-wrap leading-relaxed">{it.text || '—'}</p>

                  {isUser && (
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl bg-white/5 border-white/10 text-white hover:bg-white/10"
                        onClick={() => suggestReply(it as any)}
                        disabled={!!sug?.loading}
                      >
                        {sug?.loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        Sugerir resposta
                      </Button>
                    </div>
                  )}

                  {isUser && sug?.text && (
                    <Card className="mt-3 bg-slate-950/40 border border-slate-700 text-slate-50 p-3 rounded-xl">
                      <p className="text-xs font-semibold text-slate-200 mb-1">Sugestão da IA</p>
                      <p className="text-sm whitespace-pre-wrap">{sug.text}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <Button size="sm" className="rounded-xl" onClick={() => setMessage(sug.text || '')}>
                          Usar esta resposta
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => setSuggestions((prev) => ({ ...prev, [it.id]: { loading: false, text: null } }))}
                        >
                          Descartar
                        </Button>
                      </div>
                    </Card>
                  )}
                </div>
              );
            })}

            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <div className="border-t bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedUser ? stageBadge(selectedUser.conversion_stage) : null}
                {selectedUser?.meta_window_active ? (
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
              </div>
              <Button variant="outline" className="rounded-xl" onClick={() => { fetchConversation(); fetchUsers(); }}>
                Recarregar
              </Button>
            </div>

            <Tabs value={sendTab} onValueChange={(v) => setSendTab(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="free" disabled={!selectedUser?.meta_window_active}>
                  Texto livre
                </TabsTrigger>
                <TabsTrigger value="templates" onClick={() => { if (!templates) loadTemplates(); }}>
                  Templates
                </TabsTrigger>
              </TabsList>

              <TabsContent value="free" className="space-y-2 mt-3">
                {!selectedUser?.meta_window_active && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Este usuário está fora da janela de 24h da Meta. Use um template aprovado para iniciar a conversa.
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Textarea
                    className="rounded-xl min-h-[60px]"
                    value={message}
                    maxLength={1024}
                    disabled={!selectedUser?.meta_window_active}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                  />
                  <Button className="rounded-xl" onClick={sendFreeMessage} disabled={sending || !selectedUser?.meta_window_active}>
                    {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Enviar
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="templates" className="space-y-3 mt-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">Templates aprovados</p>
                  <Button variant="outline" className="rounded-xl" onClick={loadTemplates} disabled={templatesLoading}>
                    {templatesLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Recarregar
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white max-h-[210px] overflow-auto">
                    {(templates ?? []).filter((t) => String(t?.status ?? '').toUpperCase() === 'APPROVED').map((tpl) => (
                      <button
                        type="button"
                        key={tpl?.name ?? Math.random()}
                        className={`w-full text-left p-3 border-b last:border-b-0 hover:bg-slate-50 ${selectedTemplate?.name === tpl?.name ? 'bg-indigo-50/40' : ''}`}
                        onClick={() => selectTemplate(tpl)}
                      >
                        <p className="font-semibold text-sm">{tpl?.name ?? '—'}</p>
                        <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{templateBodyPreview(tpl) || '—'}</p>
                      </button>
                    ))}
                    {templatesLoading && (
                      <div className="p-3 text-sm text-slate-500 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-700">Variáveis</p>
                    {!selectedTemplate && <p className="text-sm text-slate-500">Selecione um template à esquerda.</p>}
                    {selectedTemplate && (
                      <div className="space-y-2">
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
                        <Button className="rounded-xl" onClick={sendTemplate} disabled={sendingTemplate || !selectedTemplate}>
                          {sendingTemplate ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                          Enviar template
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

