'use client';

import { useEffect, useState } from 'react';
import {
  X,
  Phone,
  Mail,
  MessageCircle,
  Video,
  Users,
  Zap,
  Flame,
  Wind,
  Snowflake,
  Building2,
  ExternalLink,
  CheckCircle2,
  Trash2,
  Loader2,
  Calendar,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  apiUpdateLead,
  apiDeleteLead,
  apiAddContact,
  apiCreateMockOrg,
  apiConvertLead,
} from '../hooks/useLeads';
import { STATUS_CONFIG } from './LeadsTable';
import type {
  Lead,
  LeadStatusCRM,
  LeadTemperature,
  ContactChannel,
  ContactResponse,
} from '../types';

const CHANNEL_OPTIONS: { value: ContactChannel; label: string; icon: React.ReactNode }[] = [
  { value: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="w-3.5 h-3.5" /> },
  { value: 'ligacao', label: 'Ligação', icon: <Phone className="w-3.5 h-3.5" /> },
  { value: 'email', label: 'Email', icon: <Mail className="w-3.5 h-3.5" /> },
  { value: 'reuniao_presencial', label: 'Reunião presencial', icon: <Users className="w-3.5 h-3.5" /> },
  { value: 'reuniao_online', label: 'Reunião online', icon: <Video className="w-3.5 h-3.5" /> },
  { value: 'outro', label: 'Outro', icon: <Zap className="w-3.5 h-3.5" /> },
];

const CHANNEL_ICON: Record<ContactChannel, React.ReactNode> = {
  whatsapp: <MessageCircle className="w-3.5 h-3.5" />,
  ligacao: <Phone className="w-3.5 h-3.5" />,
  email: <Mail className="w-3.5 h-3.5" />,
  reuniao_presencial: <Users className="w-3.5 h-3.5" />,
  reuniao_online: <Video className="w-3.5 h-3.5" />,
  outro: <Zap className="w-3.5 h-3.5" />,
};

const RESPONSE_CONFIG: Record<ContactResponse, { label: string; cls: string }> = {
  positivo: { label: 'Positivo', cls: 'text-emerald-600 dark:text-emerald-400' },
  negativo: { label: 'Negativo', cls: 'text-red-500 dark:text-red-400' },
  neutro: { label: 'Neutro', cls: 'text-slate-500 dark:text-slate-400' },
  sem_resposta: { label: 'Sem resposta', cls: 'text-amber-600 dark:text-amber-400' },
  agendou: { label: 'Agendou', cls: 'text-blue-600 dark:text-blue-400' },
};

const ACTIVE_STATUSES: LeadStatusCRM[] = [
  'novo', 'contatado', 'respondeu', 'demo_agendada', 'proposta_enviada',
];

function formatDate(v: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function daysSince(v: string) {
  const diff = Date.now() - new Date(v).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'hoje';
  if (days === 1) return 'ontem';
  return `${days}d atrás`;
}

function getWhatsAppUrl(phone: string) {
  return `https://wa.me/55${phone.replace(/\D/g, '')}`;
}

function getExternalUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

const inputCls =
  'h-9 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors';

const labelCls =
  'block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400 mb-1';

interface LeadDrawerProps {
  lead: Lead;
  onClose: () => void;
  onLeadUpdate: () => void;
}

export function LeadDrawer({ lead, onClose, onLeadUpdate }: LeadDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [creatingMock, setCreatingMock] = useState(false);
  const [converting, setConverting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingObs, setSavingObs] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [obsText, setObsText] = useState(lead.observacoes ?? '');

  // Sincroniza obsText quando o lead é refreshado pelo pai (após salvar)
  useEffect(() => {
    setObsText(lead.observacoes ?? '');
  }, [lead.observacoes]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const [contactForm, setContactForm] = useState({
    channel: 'whatsapp' as ContactChannel,
    response: 'sem_resposta' as ContactResponse,
    notes: '',
    next_action: '',
    temperature: 'morno' as LeadTemperature,
  });

  const statusCfg = STATUS_CONFIG[lead.status_crm];
  const displayName = lead.nome_fantasia || lead.razao_social;
  const isActive = ACTIVE_STATUSES.includes(lead.status_crm);
  const hasCadastro = Boolean(lead.uf || lead.municipio || lead.website);

  async function handleUpdateStatus(status: LeadStatusCRM) {
    try {
      await apiUpdateLead(lead.id, { status_crm: status });
      onLeadUpdate();
      toast.success('Status atualizado');
    } catch {
      toast.error('Erro ao atualizar status');
    }
  }

  async function handleSaveObs() {
    setSavingObs(true);
    try {
      await apiUpdateLead(lead.id, { observacoes: obsText });
      onLeadUpdate();
      toast.success('Observação salva');
    } catch {
      toast.error('Erro ao salvar observação');
    } finally {
      setSavingObs(false);
    }
  }

  async function handleAddContact() {
    setSavingContact(true);
    try {
      await apiAddContact(lead.id, contactForm);
      setContactForm({
        channel: 'whatsapp',
        response: 'sem_resposta',
        notes: '',
        next_action: '',
        temperature: 'morno',
      });
      onLeadUpdate();
    } catch {
      toast.error('Erro ao registrar contato');
    } finally {
      setSavingContact(false);
    }
  }

  async function handleCreateMockOrg() {
    if (!confirm(`Criar demo para "${displayName}"?\nSerão gerados 20 alunos e dados de demonstração.`)) return;
    setCreatingMock(true);
    try {
      const json = await apiCreateMockOrg(lead.id, displayName);
      onLeadUpdate();

      if (json.founder && !json.founder.is_mock) {
        toast.success(
          `Demo criada! Acesso do founder:\n${json.founder.email}\nSenha: ${json.founder.password}`,
          { duration: 20000, description: 'Copie as credenciais antes de fechar.' }
        );
      } else {
        toast.success('Demo criada com sucesso!');
      }

      window.open(json.org_url, '_blank');
    } catch {
      toast.error('Erro ao criar demo');
    } finally {
      setCreatingMock(false);
    }
  }

  async function handleConvert() {
    if (!confirm(`Converter "${displayName}" para parceiro real?\n\nOs dados mockados serão deletados e a org ficará pronta para uso.`)) return;
    setConverting(true);
    try {
      await apiConvertLead(lead.id);
      onLeadUpdate();
      onClose();
      window.location.href = '/portal/admin/b2b';
    } catch {
      toast.error('Erro ao converter lead');
    } finally {
      setConverting(false);
    }
  }

  async function handleDelete() {
    const msg = lead.org_id
      ? `Excluir "${displayName}" e deletar todos os dados mockados?`
      : `Excluir lead "${displayName}"?`;
    if (!confirm(msg)) return;
    setDeleting(true);
    try {
      await apiDeleteLead(lead.id);
      onLeadUpdate();
      onClose();
    } catch {
      toast.error('Erro ao excluir lead');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div className="hidden md:block flex-1 bg-black/50" onClick={onClose} />

      {/* Drawer */}
      <div className={`w-full md:max-w-md bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-700 flex flex-col overflow-hidden transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 dark:border-zinc-800 shrink-0">
          <div className="min-w-0 flex-1 mr-3">
            <p className="text-base font-bold text-slate-900 dark:text-white truncate">
              {displayName}
            </p>
            {lead.nome_fantasia && (
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 truncate">
                {lead.razao_social}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusCfg.cls}`}
              >
                {statusCfg.label}
              </span>
              {lead.temperature === 'quente' && (
                <span className="flex items-center gap-0.5 text-[11px] font-bold text-orange-500">
                  <Flame className="w-3 h-3" />Quente
                </span>
              )}
              {lead.temperature === 'morno' && (
                <span className="flex items-center gap-0.5 text-[11px] font-bold text-amber-500">
                  <Wind className="w-3 h-3" />Morno
                </span>
              )}
              {lead.temperature === 'frio' && (
                <span className="flex items-center gap-0.5 text-[11px] font-bold text-blue-400">
                  <Snowflake className="w-3 h-3" />Frio
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white mt-0.5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo rolável */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Dados cadastrais */}
          {hasCadastro && (
            <div className="space-y-2">
              <p className={labelCls}>Dados cadastrais</p>
              <div className="rounded-xl bg-slate-50 dark:bg-zinc-800/50 p-3.5 space-y-2 text-sm">
              {(lead.uf || lead.municipio) && (
                <div className="flex justify-between">
                  <span className="text-slate-400 dark:text-zinc-500">Localidade</span>
                  <span className="text-slate-700 dark:text-zinc-200">
                    {[lead.municipio, lead.uf].filter(Boolean).join(' · ')}
                  </span>
                </div>
              )}
              {lead.website && (
                <div className="flex justify-between gap-3">
                  <span className="text-slate-400 dark:text-zinc-500">Website</span>
                  <a
                    href={getExternalUrl(lead.website)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-w-0 items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <span className="truncate">{lead.website}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                </div>
              )}
              </div>
            </div>
          )}

          {/* Contatos */}
          <div className="space-y-2">
            <p className={labelCls}>Contatos</p>
            <div className="space-y-1.5">
              {lead.telefone1 && (
                <a
                  href={getWhatsAppUrl(lead.telefone1)}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Abrir WhatsApp
                </a>
              )}
              {lead.telefone1 && (
                <a
                  href={`tel:${lead.telefone1}`}
                  className="flex items-center gap-2 text-sm text-slate-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <Phone className="w-4 h-4 text-slate-400" />
                  {lead.telefone1}
                </a>
              )}
              {lead.telefone2 && (
                <a
                  href={`tel:${lead.telefone2}`}
                  className="flex items-center gap-2 text-sm text-slate-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <Phone className="w-4 h-4 text-slate-400" />
                  {lead.telefone2}
                </a>
              )}
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center gap-2 text-sm text-slate-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <Mail className="w-4 h-4 text-slate-400" />
                  {lead.email}
                </a>
              )}
              {!lead.telefone1 && !lead.telefone2 && !lead.email && (
                <p className="text-xs text-slate-400 dark:text-zinc-500">
                  Nenhum contato disponível
                </p>
              )}
            </div>
          </div>

          {/* Mover estágio */}
          <div>
            <p className={labelCls}>Mover para status</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(STATUS_CONFIG) as LeadStatusCRM[]).map((s) => (
                <button
                  key={s}
                  disabled={lead.status_crm === s}
                  onClick={() => handleUpdateStatus(s)}
                  className={`rounded-xl border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-40 ${
                    lead.status_crm === s
                      ? `${STATUS_CONFIG[s].cls} border-transparent`
                      : 'border-slate-200 dark:border-zinc-700 text-slate-500 hover:border-indigo-300 dark:hover:border-indigo-500/40'
                  }`}
                >
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>

          {/* Org de demonstração */}
          {(isActive || lead.org_id) && (
            <div className="rounded-xl border border-slate-200 dark:border-zinc-700 p-4 space-y-3">
              <p className={labelCls}>Org de demonstração</p>
              {lead.org ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-violet-100 dark:bg-violet-500/20 px-2.5 py-0.5 text-[11px] font-bold text-violet-700 dark:text-violet-300">
                      Demo ativa
                    </span>
                    <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200">
                      {lead.org.name}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`/partners/${lead.org.slug}/dashboard`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-violet-300 dark:border-violet-500/40 py-2 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ver demo
                    </a>
                    <button
                      onClick={handleConvert}
                      disabled={converting}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2 text-xs font-bold text-white disabled:opacity-50 transition-colors"
                    >
                      {converting ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" />Convertendo...</>
                      ) : (
                        <><CheckCircle2 className="w-3.5 h-3.5" />Converter para produção</>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleCreateMockOrg}
                  disabled={creatingMock}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 py-2.5 text-sm font-bold text-white disabled:opacity-50 transition-all"
                >
                  {creatingMock ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Gerando org demo...</>
                  ) : (
                    <><Building2 className="w-4 h-4" />Criar org mock com dados demo</>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Observações */}
          <div>
            <p className={labelCls}>Observações</p>
            <div className="space-y-2">
              <textarea
                value={obsText}
                onChange={(e) => setObsText(e.target.value)}
                placeholder="Contexto, notas, informações relevantes..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400 dark:focus:border-indigo-500 resize-none transition-colors"
              />
              {obsText !== (lead.observacoes ?? '') && (
                <button
                  onClick={handleSaveObs}
                  disabled={savingObs}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingObs ? 'Salvando...' : 'Salvar observação'}
                </button>
              )}
            </div>
          </div>

          {/* Histórico de abordagens */}
          <div className="space-y-3">
            <p className={labelCls}>
              Histórico de abordagens ({lead.lead_contacts.length})
            </p>

            {/* Formulário de novo contato */}
            <div className="rounded-xl border border-slate-200 dark:border-zinc-700 p-3 space-y-2">
              <p className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                Registrar abordagem
              </p>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={contactForm.channel}
                  onChange={(e) =>
                    setContactForm((f) => ({ ...f, channel: e.target.value as ContactChannel }))
                  }
                  className={inputCls}
                >
                  {CHANNEL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <select
                  value={contactForm.response}
                  onChange={(e) =>
                    setContactForm((f) => ({ ...f, response: e.target.value as ContactResponse }))
                  }
                  className={inputCls}
                >
                  {(Object.entries(RESPONSE_CONFIG) as [ContactResponse, { label: string }][]).map(
                    ([v, c]) => (
                      <option key={v} value={v}>{c.label}</option>
                    )
                  )}
                </select>
              </div>
              <textarea
                value={contactForm.notes}
                onChange={(e) => setContactForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Como foi o contato? O que foi dito?"
                rows={2}
                className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-400 dark:focus:border-indigo-500 resize-none"
              />
              <input
                value={contactForm.next_action}
                onChange={(e) => setContactForm((f) => ({ ...f, next_action: e.target.value }))}
                placeholder="Próxima ação..."
                className={`${inputCls} text-xs`}
              />
              <button
                onClick={handleAddContact}
                disabled={savingContact}
                className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 py-2 text-xs font-bold text-white disabled:opacity-50 transition-colors"
              >
                {savingContact ? 'Salvando...' : 'Registrar contato'}
              </button>
            </div>

            {/* Timeline */}
            {[...lead.lead_contacts].reverse().map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                  {CHANNEL_ICON[c.channel]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${RESPONSE_CONFIG[c.response].cls}`}>
                      {RESPONSE_CONFIG[c.response].label}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                      {daysSince(c.contact_date)}
                    </span>
                  </div>
                  {c.notes && (
                    <p className="text-xs text-slate-600 dark:text-zinc-300 mt-0.5">
                      {c.notes}
                    </p>
                  )}
                  {c.next_action && (
                    <p className="text-[11px] text-indigo-500 dark:text-indigo-400 mt-0.5">
                      {c.next_action}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {lead.lead_contacts.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-zinc-500 text-center py-2">
                Nenhuma abordagem registrada ainda
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 dark:border-zinc-800 px-5 py-3 flex justify-between items-center shrink-0">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            Excluir lead
          </button>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-zinc-500">
            <Calendar className="w-3 h-3" />
            Criado {formatDate(lead.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
}
