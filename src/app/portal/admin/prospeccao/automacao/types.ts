export type DetectionMethod = 'keyword' | 'gemini' | 'active_question';

export interface KeywordDetectionConfig {
  keywords: string[];
}

export interface GeminiDetectionConfig {
  instruction: string;
}

export interface ActiveQuestionDetectionConfig {
  question: string;
  yes_keywords: string[];
  no_keywords: string[];
}

export type DetectionConfig =
  | Partial<KeywordDetectionConfig>
  | Partial<GeminiDetectionConfig>
  | Partial<ActiveQuestionDetectionConfig>;

export type NodeActionType = 'discard_lead';

export interface FlowNode {
  id: string;
  flow_id?: string;
  title: string;
  message_body: string;
  /** Textos alternativos (mesmo sentido, redação diferente) sorteados junto
   *  com message_body na hora do envio — evita mandar o texto idêntico pra
   *  todo lead, reduzindo a chance de detecção anti-bot do WhatsApp. */
  message_variants: string[];
  is_start: boolean;
  action_type: NodeActionType | null;
  position_x: number;
  position_y: number;
}

export interface FlowEdge {
  id: string;
  from_node_id: string;
  to_node_id: string;
  label: string | null;
  priority: number;
  is_fallback: boolean;
  detection_method: DetectionMethod;
  detection_config: DetectionConfig;
  traversal_count: number;
}

export interface Flow {
  id: string;
  name: string;
  active: boolean;
  priority: number;
  is_default: boolean;
  filter_config: Record<string, string[]>;
  created_at: string;
  updated_at: string;
}

export interface FlowDetail {
  flow: Flow;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface AutomationConfig {
  enabled: boolean;
  business_hours_start: number;
  business_hours_end: number;
  send_delay_min_seconds: number;
  send_delay_max_seconds: number;
  daily_send_limit: number;
  inbound_debounce_seconds: number;
  sent_today: number;
  remaining_today: number;
  resets_at: string;
}

export interface HandoffItem {
  session_phone: string;
  lead: {
    id: string;
    razao_social: string;
    nome_fantasia: string | null;
    telefone1: string | null;
    telefone2: string | null;
    uf: string | null;
    municipio: string | null;
  } | null;
  flow_name: string | null;
  node_title: string | null;
  handoff_at: string | null;
}

export interface ActiveSessionItem {
  session_phone: string;
  lead: {
    id: string;
    razao_social: string;
    nome_fantasia: string | null;
    telefone1: string | null;
    telefone2: string | null;
    uf: string | null;
    municipio: string | null;
  } | null;
  node_title: string | null;
  created_at: string | null;
  last_activity: string | null;
}

export interface ManualQueueItem {
  id: string;
  lead_id: string;
  status: 'pending' | 'queued' | 'sent' | 'skipped' | 'failed' | 'removed';
  source: 'manual' | 'auto';
  created_at: string;
  processed_at: string | null;
  lead: {
    id: string;
    razao_social: string;
    nome_fantasia: string | null;
    telefone1: string | null;
    telefone2: string | null;
    uf: string | null;
    municipio: string | null;
    status_crm: string;
  } | null;
}

export interface OutboundHistoryItem {
  id: string;
  lead_id: string;
  phone: string;
  body: string;
  node_id: string | null;
  node_title: string | null;
  status: 'pending' | 'sent' | 'failed';
  wa_message_id: string | null;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  lead: {
    id: string;
    razao_social: string;
    nome_fantasia: string | null;
    uf: string | null;
  } | null;
}

export type WorkerConnectionStatus = 'disconnected' | 'awaiting_qr' | 'connected' | 'error';

export interface WorkerStatus {
  status: WorkerConnectionStatus;
  command: 'start' | 'stop' | 'logout' | null;
  qr_code: string | null;
  error_message: string | null;
  last_heartbeat: string | null;
  paired_at: string | null;
  updated_at: string;
}

export type WorkerLogCategory = 'conexao' | 'recebido' | 'envio' | 'fluxo' | 'handoff' | 'cron' | 'sistema';

export interface WorkerLog {
  id: number;
  message: string;
  level: 'info' | 'warn' | 'error';
  category: WorkerLogCategory;
  created_at: string;
}

export interface LeadFilterOptions {
  ufs: string[];
  municipios: string[];
  source_channels: string[];
}

// ── Contratos de API (Next.js route handlers em /api/admin/prospeccao/automacao/) ──
//
// GET/PATCH /api/admin/prospeccao/automacao/worker
//   PATCH body: { command: 'start' | 'stop' } → { worker: WorkerStatus }
//
// GET/POST  /api/admin/prospeccao/automacao/flows        → { flows: Flow[] } | { flow: Flow }
// GET/PUT/DELETE /api/admin/prospeccao/automacao/flows/:id
//   GET  → { flow, nodes, edges }
//   PUT  body: Partial<Flow> & { nodes: FlowNode[], edges: FlowEdge[] } → { ok: true }
//
// GET/PATCH /api/admin/prospeccao/automacao/config       → { config: AutomationConfig }
// GET       /api/admin/prospeccao/automacao/export-conversations?start=&end= → arquivo markdown (download)
// GET       /api/admin/prospeccao/automacao/handoff      → { handoff: HandoffItem[] }
// POST      /api/admin/prospeccao/automacao/handoff/:phone/assumir → { ok: true }
