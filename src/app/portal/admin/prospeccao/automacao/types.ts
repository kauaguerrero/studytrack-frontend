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

export interface FlowNode {
  id: string;
  flow_id?: string;
  title: string;
  message_body: string;
  is_start: boolean;
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
}

export interface DailyInsight {
  id: string;
  insight_date: string;
  summary_md: string;
  stats: Record<string, unknown>;
  created_at: string;
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

export type WorkerConnectionStatus = 'disconnected' | 'awaiting_qr' | 'connected' | 'error';

export interface WorkerStatus {
  status: WorkerConnectionStatus;
  command: 'start' | 'stop' | null;
  qr_code: string | null;
  error_message: string | null;
  last_heartbeat: string | null;
  paired_at: string | null;
  updated_at: string;
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
// GET       /api/admin/prospeccao/automacao/insights     → { insights: DailyInsight[] }
// GET       /api/admin/prospeccao/automacao/handoff      → { handoff: HandoffItem[] }
// POST      /api/admin/prospeccao/automacao/handoff/:phone/assumir → { ok: true }
