'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  ConnectionMode,
  Handle,
  Position,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { X, Plus, Save, Play, Tag, Sparkles, MessageCircleQuestion, AlertTriangle, UserX, MessageSquare, Zap, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { apiGetFlowDetail, apiSaveFlowGraph } from '../hooks/useAutomacao';
import type { DetectionConfig, DetectionMethod, NodeActionType } from '../types';

const ACTION_LABEL: Record<NodeActionType, string> = {
  discard_lead: 'Descartar lead',
};

const ACTION_ICON: Record<NodeActionType, typeof UserX> = {
  discard_lead: UserX,
};

interface StepNodeData {
  title: string;
  message_body: string;
  is_start: boolean;
  action_type: NodeActionType | null;
  // computado a partir das arestas pra colorir visualmente, não vem da API nem é salvo
  isTerminal?: boolean;
  [key: string]: unknown;
}

type StepNode = Node<StepNodeData, 'step'>;

interface EdgeData {
  detection_method: DetectionMethod;
  detection_config: DetectionConfig;
  priority: number;
  is_fallback: boolean;
  traversal_count: number;
  // computado entre arestas irmãs (mesmo nó de origem) pra destacar a mais tomada
  isTopSibling?: boolean;
  [key: string]: unknown;
}

type StepEdge = Edge<EdgeData>;

const METHOD_ICON: Record<DetectionMethod, typeof Tag> = {
  keyword: Tag,
  gemini: Sparkles,
  active_question: MessageCircleQuestion,
};

const METHOD_LABEL: Record<DetectionMethod, string> = {
  keyword: 'Palavras-chave',
  gemini: 'Gemini',
  active_question: 'Pergunta ativa',
};

function StepNodeCard({ data, selected }: NodeProps<StepNode>) {
  const isAction = !!data.action_type;
  const ActionIcon = data.action_type ? ACTION_ICON[data.action_type] : null;
  const borderCls = selected
    ? 'border-violet-500'
    : data.isTerminal
      ? 'border-fuchsia-400 dark:border-fuchsia-600'
      : 'border-slate-200 dark:border-zinc-700';

  return (
    <div
      className={`w-56 rounded-xl border-2 bg-white dark:bg-zinc-900 shadow-md px-3 py-2.5 transition-colors ${borderCls}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-slate-400 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-zinc-900"
        title="Arraste daqui pra puxar uma conexão, ou solte aqui pra receber uma"
      />
      <div className="flex items-center gap-1.5 flex-wrap mb-1">
        {data.is_start && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
            <Play className="w-2.5 h-2.5" /> Início
          </span>
        )}
        {data.isTerminal && !isAction && (
          <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/40 px-2 py-0.5 text-[10px] font-bold uppercase text-fuchsia-700 dark:text-fuchsia-300">
            <Flag className="w-2.5 h-2.5" /> Fim (Hand-off)
          </span>
        )}
        {isAction && (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 dark:bg-orange-900/40 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-700 dark:text-orange-300">
            <Zap className="w-2.5 h-2.5" /> Ação
          </span>
        )}
      </div>
      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{data.title || 'Passo sem título'}</p>
      {isAction && ActionIcon ? (
        <p className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 mt-0.5">
          <ActionIcon className="w-3.5 h-3.5 shrink-0" /> {ACTION_LABEL[data.action_type as NodeActionType]}
        </p>
      ) : (
        <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 mt-0.5">
          {data.message_body || <span className="italic">sem mensagem</span>}
        </p>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-violet-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-zinc-900"
        title="Arraste daqui pra puxar uma conexão, ou solte aqui pra receber uma"
      />
    </div>
  );
}

const nodeTypes = { step: StepNodeCard };

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `tmp-${Date.now()}-${Math.random()}`;
}

interface FlowEditorModalProps {
  flowId: string;
  flowName: string;
  onClose: () => void;
  onSaved: () => void;
}

export function FlowEditorModal({ flowId, flowName, onClose, onSaved }: FlowEditorModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nodes, setNodes] = useState<StepNode[]>([]);
  const [edges, setEdges] = useState<StepEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiGetFlowDetail(flowId)
      .then(({ nodes: apiNodes, edges: apiEdges }) => {
        if (cancelled) return;
        setNodes(
          apiNodes.map((n) => ({
            id: n.id,
            type: 'step',
            position: { x: n.position_x, y: n.position_y },
            data: { title: n.title, message_body: n.message_body, is_start: n.is_start, action_type: n.action_type ?? null },
          }))
        );
        setEdges(
          apiEdges.map((e) => ({
            id: e.id,
            source: e.from_node_id,
            target: e.to_node_id,
            type: 'smoothstep',
            label: e.label || METHOD_LABEL[e.detection_method],
            data: {
              detection_method: e.detection_method,
              detection_config: e.detection_config,
              priority: e.priority,
              is_fallback: e.is_fallback,
              traversal_count: e.traversal_count ?? 0,
            },
          }))
        );
      })
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : 'Erro ao carregar fluxo'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [flowId]);

  const onNodesChange = useCallback(
    (changes: NodeChange<StepNode>[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange<StepEdge>[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) =>
      addEdge<StepEdge>(
        {
          ...connection,
          id: newId(),
          type: 'smoothstep',
          label: METHOD_LABEL.keyword,
          data: { detection_method: 'keyword', detection_config: { keywords: [] }, priority: eds.length, is_fallback: false, traversal_count: 0 },
        },
        eds
      )
    );
  }, []);

  function addNode() {
    const id = newId();
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'step',
        position: { x: 120 + nds.length * 40, y: 120 + nds.length * 30 },
        data: { title: 'Novo passo', message_body: '', is_start: nds.length === 0, action_type: null },
      },
    ]);
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
  }

  function updateSelectedNode(patch: Partial<StepNodeData>) {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== selectedNodeId) {
          // Só um nó pode ser is_start — desmarca os outros se este virar o início
          if (patch.is_start) return { ...n, data: { ...n.data, is_start: false } };
          return n;
        }
        return { ...n, data: { ...n.data, ...patch } };
      })
    );
  }

  function deleteSelectedNode() {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  }

  function updateSelectedEdge(patch: Partial<EdgeData> & { label?: string }) {
    if (!selectedEdgeId) return;
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id !== selectedEdgeId) return e;
        const data = { ...e.data!, ...patch };
        return { ...e, data, label: patch.label ?? e.label };
      })
    );
  }

  function deleteSelectedEdge() {
    if (!selectedEdgeId) return;
    setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
    setSelectedEdgeId(null);
  }

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId) || null;

  const warnings = useMemo(() => {
    const list: string[] = [];
    const starts = nodes.filter((n) => n.data.is_start);
    if (starts.length !== 1) list.push('O fluxo precisa de exatamente um nó marcado como início.');
    const outgoingByNode = new Map<string, StepEdge[]>();
    for (const e of edges) {
      outgoingByNode.set(e.source, [...(outgoingByNode.get(e.source) ?? []), e]);
    }
    for (const [nodeId, out] of outgoingByNode) {
      if (out.length > 1 && !out.some((e) => e.data?.is_fallback)) {
        const title = nodes.find((n) => n.id === nodeId)?.data.title ?? nodeId;
        list.push(`"${title}" tem múltiplas decisões sem uma aresta padrão (fallback) — se nenhuma bater, a conversa trava.`);
      }
    }
    return list;
  }, [nodes, edges]);

  // Nós sem nenhuma aresta de saída são fim de fluxo — é ali que o handoff
  // acontece (_advance_session em prospeccao_whatsapp_service.py). Colore
  // roxo/fúcsia só pra visualização, não é salvo.
  const displayNodes = useMemo(() => {
    const hasOutgoing = new Set(edges.map((e) => e.source));
    return nodes.map((n) => ({
      ...n,
      data: { ...n.data, isTerminal: !hasOutgoing.has(n.id) },
    }));
  }, [nodes, edges]);

  // Contador visual de quantas vezes o fluxo real passou por cada aresta
  // (traversal_count, vindo do backend) — e destaque na mais tomada entre
  // arestas que saem do mesmo nó (decisão com 2+ opções).
  const displayEdges = useMemo(() => {
    const bySource = new Map<string, StepEdge[]>();
    for (const e of edges) {
      bySource.set(e.source, [...(bySource.get(e.source) ?? []), e]);
    }
    const topIds = new Set<string>();
    for (const siblings of bySource.values()) {
      if (siblings.length < 2) continue;
      const maxCount = Math.max(...siblings.map((e) => e.data?.traversal_count ?? 0));
      if (maxCount <= 0) continue;
      for (const e of siblings) {
        if ((e.data?.traversal_count ?? 0) === maxCount) topIds.add(e.id);
      }
    }
    return edges.map((e) => {
      const count = e.data?.traversal_count ?? 0;
      const isTop = topIds.has(e.id);
      const baseLabel = typeof e.label === 'string' ? e.label : '';
      return {
        ...e,
        label: count > 0 ? `${baseLabel} · ${count}x` : baseLabel,
        style: isTop ? { stroke: '#059669', strokeWidth: 2.5 } : undefined,
        labelStyle: isTop ? { fontWeight: 700, fill: '#059669' } : undefined,
        data: { ...e.data!, isTopSibling: isTop },
      };
    });
  }, [edges]);

  async function handleSave() {
    const starts = nodes.filter((n) => n.data.is_start);
    if (starts.length !== 1) {
      toast.error('Marque exatamente um passo como início antes de salvar.');
      return;
    }
    setSaving(true);
    try {
      await apiSaveFlowGraph(flowId, {
        nodes: nodes.map((n) => ({
          id: n.id,
          title: n.data.title,
          message_body: n.data.message_body,
          is_start: n.data.is_start,
          action_type: n.data.action_type,
          position_x: n.position.x,
          position_y: n.position.y,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          from_node_id: e.source,
          to_node_id: e.target,
          label: typeof e.label === 'string' ? e.label : null,
          priority: e.data?.priority ?? 0,
          is_fallback: e.data?.is_fallback ?? false,
          detection_method: e.data?.detection_method ?? 'keyword',
          detection_config: e.data?.detection_config ?? {},
        })),
      });
      toast.success('Fluxo salvo!');
      onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar fluxo');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-6 py-3 shrink-0">
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">Editor de fluxo — {flowName}</p>
          <p className="text-xs text-slate-400 dark:text-zinc-500">Arraste pra criar passos, conecte pra ligar decisões</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addNode}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-zinc-300 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo passo
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 disabled:opacity-50 transition-all"
          >
            <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors ml-2">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-6 py-2 text-xs text-amber-700 dark:text-amber-300 space-y-0.5 shrink-0">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {w}
            </div>
          ))}
        </div>
      )}

      <div className="relative flex-1 min-h-0">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400 dark:text-zinc-500">Carregando fluxo...</div>
        ) : (
          <ReactFlow<StepNode, StepEdge>
            nodes={displayNodes}
            edges={displayEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            connectionMode={ConnectionMode.Loose}
            defaultEdgeOptions={{ type: 'smoothstep' }}
            zoomOnPinch
            zoomOnScroll
            panOnScroll={false}
            onNodeClick={(_, node) => {
              setSelectedNodeId(node.id);
              setSelectedEdgeId(null);
            }}
            onEdgeClick={(_, edge) => {
              setSelectedEdgeId(edge.id);
              setSelectedNodeId(null);
            }}
            onPaneClick={() => {
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
            }}
            fitView
            deleteKeyCode={['Backspace', 'Delete']}
          >
            <Background />
            <Controls className="!shadow-lg !rounded-xl overflow-hidden" />
            <MiniMap
              pannable
              zoomable
              position="bottom-right"
              className="!m-3 !rounded-xl !border !border-slate-200 dark:!border-zinc-700 !bg-white dark:!bg-zinc-900 !shadow-lg overflow-hidden"
              maskColor="rgba(15, 23, 42, 0.06)"
              nodeColor={(n) => {
                const d = n.data as { is_start?: boolean; isTerminal?: boolean } | undefined;
                if (d?.is_start) return '#10b981';
                if (d?.isTerminal) return '#d946ef';
                return '#8b5cf6';
              }}
              nodeStrokeWidth={0}
              nodeBorderRadius={4}
              style={{ width: 160, height: 110 }}
            />
          </ReactFlow>
        )}

        {selectedNode && (
          <NodeConfigPanel
            data={selectedNode.data}
            onChange={updateSelectedNode}
            onDelete={deleteSelectedNode}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
        {selectedEdge && (
          <EdgeConfigPanel
            key={selectedEdge.id}
            data={selectedEdge.data!}
            label={typeof selectedEdge.label === 'string' ? selectedEdge.label : ''}
            onChange={updateSelectedEdge}
            onDelete={deleteSelectedEdge}
            onClose={() => setSelectedEdgeId(null)}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Painel lateral — configuração do nó selecionado
// ---------------------------------------------------------------------------

const inputCls =
  'w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors';
const labelCls = 'block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400 mb-1';

function SidePanel({ title, onClose, onDelete, children }: { title: string; onClose: () => void; onDelete: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute top-3 right-3 bottom-3 w-80 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-zinc-800 shrink-0">
        <p className="text-sm font-bold text-slate-900 dark:text-white">{title}</p>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">{children}</div>
      <div className="border-t border-slate-100 dark:border-zinc-800 px-4 py-3 shrink-0">
        <button onClick={onDelete} className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors">
          Excluir
        </button>
      </div>
    </div>
  );
}

function NodeConfigPanel({
  data,
  onChange,
  onDelete,
  onClose,
}: {
  data: StepNodeData;
  onChange: (patch: Partial<StepNodeData>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const isAction = !!data.action_type;

  return (
    <SidePanel title="Passo" onClose={onClose} onDelete={onDelete}>
      <div>
        <label className={labelCls}>Título</label>
        <input value={data.title} onChange={(e) => onChange({ title: e.target.value })} className={inputCls} placeholder="Ex: Abertura" />
      </div>

      <div>
        <label className={labelCls}>Tipo de passo</label>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onChange({ action_type: null })}
            className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-semibold transition-colors ${
              !isAction
                ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                : 'border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Mensagem
          </button>
          <button
            onClick={() => onChange({ action_type: 'discard_lead', message_body: '' })}
            className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-semibold transition-colors ${
              isAction
                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                : 'border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800'
            }`}
          >
            <Zap className="w-4 h-4" /> Ação
          </button>
        </div>
      </div>

      {isAction ? (
        <div>
          <label className={labelCls}>Ação a executar</label>
          <select
            value={data.action_type ?? 'discard_lead'}
            onChange={(e) => onChange({ action_type: e.target.value as NodeActionType })}
            className={inputCls}
          >
            {(Object.keys(ACTION_LABEL) as NodeActionType[]).map((a) => (
              <option key={a} value={a}>
                {ACTION_LABEL[a]}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
            Executa a ação e encerra o fluxo automático ali mesmo — não manda mensagem, não vai pra handoff.
          </p>
        </div>
      ) : (
        <div>
          <label className={labelCls}>Mensagem enviada ao lead</label>
          <textarea
            value={data.message_body}
            onChange={(e) => onChange({ message_body: e.target.value })}
            rows={5}
            className={`${inputCls} resize-none`}
            placeholder="Boa tarde, tudo bem?"
          />
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">Deixe em branco pra um passo que só roteia, sem mandar mensagem.</p>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-zinc-300">
        <input type="checkbox" checked={data.is_start} onChange={(e) => onChange({ is_start: e.target.checked })} />
        Este é o passo inicial do fluxo
      </label>
    </SidePanel>
  );
}

// ---------------------------------------------------------------------------
// Painel lateral — configuração da aresta (decisão) selecionada
// ---------------------------------------------------------------------------

function EdgeConfigPanel({
  data,
  label,
  onChange,
  onDelete,
  onClose,
}: {
  data: EdgeData;
  label: string;
  onChange: (patch: Partial<EdgeData> & { label?: string }) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const method = data.detection_method;
  const config = data.detection_config as Record<string, unknown>;

  // Texto bruto do campo fica num state local, separado do array já processado —
  // se o value do input viesse de `keywords.join(', ')` a cada tecla, um espaço ou
  // vírgula digitado por último é descartado no próprio re-render seguinte (o
  // split+trim+filter de-para some antes do usuário conseguir digitar a próxima
  // palavra), dando a impressão de que essas teclas simplesmente não funcionam.
  const [keywordsText, setKeywordsText] = useState(((config.keywords as string[] | undefined) ?? []).join(', '));
  const [yesKeywordsText, setYesKeywordsText] = useState(((config.yes_keywords as string[] | undefined) ?? []).join(', '));
  const [noKeywordsText, setNoKeywordsText] = useState(((config.no_keywords as string[] | undefined) ?? []).join(', '));

  function setMethod(next: DetectionMethod) {
    const defaults: Record<DetectionMethod, DetectionConfig> = {
      keyword: { keywords: [] },
      gemini: { instruction: '' },
      active_question: { question: '', yes_keywords: [], no_keywords: [] },
    };
    setKeywordsText('');
    setYesKeywordsText('');
    setNoKeywordsText('');
    onChange({ detection_method: next, detection_config: defaults[next] });
  }

  function commitKeywords(raw: string) {
    setKeywordsText(raw);
    onChange({ detection_config: { ...config, keywords: raw.split(',').map((k) => k.trim()).filter(Boolean) } });
  }

  function commitYesKeywords(raw: string) {
    setYesKeywordsText(raw);
    onChange({ detection_config: { ...config, yes_keywords: raw.split(',').map((k) => k.trim()).filter(Boolean) } });
  }

  function commitNoKeywords(raw: string) {
    setNoKeywordsText(raw);
    onChange({ detection_config: { ...config, no_keywords: raw.split(',').map((k) => k.trim()).filter(Boolean) } });
  }

  return (
    <SidePanel title="Decisão" onClose={onClose} onDelete={onDelete}>
      <div>
        <label className={labelCls}>Rótulo (ex: Sim / Não / É secretária)</label>
        <input value={label} onChange={(e) => onChange({ label: e.target.value })} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Como identificar</label>
        <div className="grid grid-cols-3 gap-1.5">
          {(['keyword', 'gemini', 'active_question'] as DetectionMethod[]).map((m) => {
            const Icon = METHOD_ICON[m];
            return (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-semibold transition-colors ${
                  method === m
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                    : 'border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {METHOD_LABEL[m]}
              </button>
            );
          })}
        </div>
      </div>

      {method === 'keyword' && (
        <div>
          <label className={labelCls}>Palavras-chave (separadas por vírgula)</label>
          <textarea
            value={keywordsText}
            onChange={(e) => commitKeywords(e.target.value)}
            rows={3}
            className={`${inputCls} resize-none`}
            placeholder="sobre o que, o que é, como funciona"
          />
        </div>
      )}

      {method === 'gemini' && (
        <div>
          <label className={labelCls}>Instrução de classificação</label>
          <textarea
            value={(config.instruction as string | undefined) ?? ''}
            onChange={(e) => onChange({ detection_config: { ...config, instruction: e.target.value } })}
            rows={4}
            className={`${inputCls} resize-none`}
            placeholder="A resposta indica que quem está falando é secretária/atendente, não o decisor?"
          />
        </div>
      )}

      {method === 'active_question' && (
        <div className="space-y-2">
          <div>
            <label className={labelCls}>Pergunta que o bot manda</label>
            <input
              value={(config.question as string | undefined) ?? ''}
              onChange={(e) => onChange({ detection_config: { ...config, question: e.target.value } })}
              className={inputCls}
              placeholder="Eu falo com o gestor?"
            />
          </div>
          <div>
            <label className={labelCls}>Palavras que confirmam (sim)</label>
            <input
              value={yesKeywordsText}
              onChange={(e) => commitYesKeywords(e.target.value)}
              className={inputCls}
              placeholder="sim, é ele, pode falar"
            />
          </div>
          <div>
            <label className={labelCls}>Palavras que negam (não)</label>
            <input
              value={noKeywordsText}
              onChange={(e) => commitNoKeywords(e.target.value)}
              className={inputCls}
              placeholder="não, ele não está, depois"
            />
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-zinc-300 pt-1">
        <input type="checkbox" checked={data.is_fallback} onChange={(e) => onChange({ is_fallback: e.target.checked })} />
        Usar como padrão (quando nenhuma outra decisão bater)
      </label>
    </SidePanel>
  );
}
