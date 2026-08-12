export type LeadStatusCRM =
  | 'novo'
  | 'contatado'
  | 'respondeu'
  | 'handoff'
  | 'esperando_contato_gestor'
  | 'aguardando_confirmacao_call'
  | 'call_agendado'
  | 'interesse'
  | 'demo_teste'
  | 'enviar_proposta'
  | 'proposta_enviada'
  | 'fechado'
  | 'perdido';

export type LeadTemperature = 'quente' | 'morno' | 'frio';

export type LeadCallOutcome = 'pendente' | 'ocorreu' | 'nao_ocorreu';

export type ContactChannel =
  | 'whatsapp'
  | 'ligacao'
  | 'email'
  | 'reuniao_presencial'
  | 'reuniao_online'
  | 'outro';

export type ContactResponse =
  | 'positivo'
  | 'negativo'
  | 'neutro'
  | 'sem_resposta'
  | 'agendou';

export interface LeadContact {
  id: string;
  channel: ContactChannel;
  contact_date: string;
  response: ContactResponse;
  notes: string | null;
  next_action: string | null;
}

export interface Lead {
  id: string;
  // Dados cadastrais (populados via importação ou manualmente)
  cnpj: string | null;
  razao_social: string;
  nome_fantasia: string | null;
  uf: string | null;
  municipio: string | null;
  telefone1: string | null;
  telefone2: string | null;
  email: string | null;
  website: string | null;
  place_id: string | null;
  nome_socio: string | null;
  data_abertura: string | null;
  codigo_natureza_juridica: string | null;
  // CRM
  status_crm: LeadStatusCRM;
  temperature: LeadTemperature;
  source_channel: string | null;
  next_followup_at: string | null;
  observacoes: string | null;
  // Call agendada (Google Meet) — preenchidos via POST .../schedule-call
  call_scheduled_at: string | null;
  call_ends_at: string | null;
  call_title: string | null;
  call_meet_link: string | null;
  call_calendar_event_id: string | null;
  call_outcome: LeadCallOutcome;
  // Demo org
  org_id: string | null;
  org: { id: string; name: string; slug: string; brand_primary: string } | null;
  converted_at: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
  // Relações
  lead_contacts: LeadContact[];
  // Automação WhatsApp (sessão ativa do fluxo, se houver) — ausente em respostas
  // que não fazem essa junção (ex. PATCH de status/observações).
  automation?: {
    node_title: string | null;
    session_status: 'ativo' | 'aguardando_humano' | 'assumido' | null;
  } | null;
}

export interface LeadsStats {
  total: number;
  com_contato: number;    // tem telefone1, telefone2 ou email
  em_andamento: number;   // status_crm não é 'novo', 'fechado' ou 'perdido'
  conversoes: number;     // status_crm === 'fechado'
  by_status: Partial<Record<LeadStatusCRM, number>>;
  by_uf: Record<string, number>;
  conversion_rate: number;
}

export interface ImportJob {
  job_id: string;
  status: 'pending' | 'running' | 'done' | 'error';
  current_keyword: string | null;
  keywords_total: number;
  keywords_done: number;
  leads_found: number;
  leads_imported: number;
  leads_skipped: number;
  progress_pct: number;
  error: string | null;
}

export interface LeadFilters {
  uf: string;
  status: LeadStatusCRM[];
  has_phone: boolean;
  search: string;
  temperature: LeadTemperature | '';
}

// ── Contratos de API (Next.js route handlers em /api/admin/prospeccao/) ──────
//
// GET    /api/admin/prospeccao/leads
//        query: uf?, status?: LeadStatusCRM (repetível — ?status=a&status=b
//               filtra por múltiplas fases), has_phone?: '1', search?,
//               temperature?: LeadTemperature
//        → { leads: Lead[] }
//
// POST   /api/admin/prospeccao/leads
//        body: { razao_social, nome_fantasia?, uf?, municipio?, telefone1?,
//                email?, nome_socio?, status_crm?, temperature?, source_channel?,
//                next_followup_at?, observacoes? }
//        → { lead: Lead }
//
// PATCH  /api/admin/prospeccao/leads/:id
//        body: Partial<{ status_crm, temperature, observacoes, next_followup_at,
//                cnpj, razao_social, nome_fantasia, nome_socio, uf, municipio,
//                telefone1, telefone2, email, website, call_outcome }>
//        → { lead: Lead }
//
// DELETE /api/admin/prospeccao/leads/:id  → { ok: true }
//
// POST   /api/admin/prospeccao/leads/:id/schedule-call
//        body: { title, start: ISO, end: ISO, time_zone?, attendee_email? }
//        Cria o evento no Google Calendar (com Meet) e move o lead pra
//        call_agendado com os dados da call preenchidos.
//        → { lead: Lead, meet_link: string }
//
// GET    /api/admin/prospeccao/stats  → LeadsStats
//
// POST   /api/admin/prospeccao/leads/:id/contacts
//        body: { channel, response, notes?, next_action?, temperature? }
//        → { contact: LeadContact }
//
// POST   /api/admin/prospeccao/leads/:id/create-mock-org
//        body: { org_name: string }
//        → { org_url: string }
//
// POST   /api/admin/prospeccao/leads/:id/convert  → { ok: true }
//
// POST   /api/admin/prospeccao/import
//        body: { keywords: string[] }
//        → { job_id: string }
//
// GET    /api/admin/prospeccao/import/:job_id  → ImportJob
//
// GET    /api/admin/prospeccao/export
//        query: mesmos filtros de /leads
//        → CSV file (Content-Disposition: attachment; filename="leads.csv")
