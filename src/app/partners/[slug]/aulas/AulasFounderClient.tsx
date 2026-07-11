'use client';

import { useEffect, useRef, useState } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import * as tus from 'tus-js-client';
import { readableBrandText } from '@/lib/brand-color';
import {
  RevealGroup, RevealItem, ElevatedCard, SectionTitle,
  BrandButton, MiniBar,
} from '@/components/partners/founder-ui';
import {
  Plus,
  ChevronDown,
  GripVertical,
  Pencil,
  ArrowUp,
  ArrowDown,
  Play,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  Loader2,
  AlertCircle,
  Users,
  TriangleAlert,
  Gauge,
  BookOpen,
  Video,
} from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface VideoLesson {
  id: string;
  title: string;
  description: string | null;
  bunny_video_id: string | null;
  thumbnail_url: string | null;
  duration_secs: number | null;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  display_order: number;
  is_active: boolean;
  embed_url?: string | null;
}

export interface VideoModule {
  id: string;
  title: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  lessons: VideoLesson[];
  progress: { total: number; completed: number; pct: number };
}

export interface VideoModulesPayload {
  modules: VideoModule[];
  has_library: boolean;
}

interface UploadInfo {
  tus_endpoint: string;
  library_id: string;
  video_id: string;
  signature: string;
  expiry: number;
}

interface AulasFounderClientProps {
  slug: string;
  initialData: VideoModulesPayload | null;
}

interface VideoKpiSummary {
  adoption_weekly_pct: number;
  adoption_weekly_num: number;
  adoption_weekly_den: number;
  avg_completion_pct: number;
  at_risk_students: number;
  module_coverage_pct: number;
}

interface VideoKpiAlert {
  level: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  action: string;
  lesson_id?: string;
}

interface VideoKpiLessonRow {
  lesson_id: string;
  lesson_title: string;
  module_id: string | null;
  module_title: string;
  started: number;
  reached_50: number;
  completed: number;
  completion_rate_pct: number;
  avg_watched_pct: number;
}

interface VideoKpiPayload {
  summary: VideoKpiSummary;
  funnel: { started: number; reached_50: number; completed_80: number };
  alerts: VideoKpiAlert[];
  lesson_table: VideoKpiLessonRow[];
  dropoff: { lt25: number; from25to50: number; from50to80: number; gte80: number };
  students_total: number;
  lessons_total: number;
  period_days: 7 | 30 | 60 | 90;
  module_id: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(secs: number | null): string {
  if (!secs) return '';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function StatusBadge({ status, isUploading }: { status: VideoLesson['status']; isUploading?: boolean }) {
  if (isUploading) {
    return (
      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
        Enviando
      </span>
    );
  }
  const map: Record<VideoLesson['status'], { label: string; cls: string }> = {
    uploading:  { label: 'Aguardando upload', cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
    processing: { label: 'Processando',       cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
    ready:      { label: 'Pronto',            cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
    error:      { label: 'Erro',              cls: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' },
  };
  const { label, cls } = map[status] ?? map.error;
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}>{label}</span>;
}

// ── KPI toggle card (mesma linguagem visual do KpiCard, com estado ativo/onClick) ──

function KpiToggleCard({
  icon: Icon,
  label,
  value,
  subtitle,
  active,
  onClick,
  hint,
  accentColor,
  accentHex,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  subtitle: string;
  active: boolean;
  onClick: () => void;
  hint: string;
  accentColor: string;
  accentHex?: string;
}) {
  const iconColor = readableBrandText(accentHex, accentColor, 46);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-[20px] p-4 text-left',
        'partner-elevated-card partner-elevated-card-hover',
        'bg-white dark:bg-slate-900',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px] transition-opacity"
        style={{
          background: `linear-gradient(90deg, ${accentColor}, color-mix(in srgb, ${accentColor} 40%, white))`,
          opacity: active ? 1 : 0.35,
        }}
      />
      <div className="relative z-10">
        <div className="mb-2.5 flex items-center gap-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: `color-mix(in srgb, ${accentColor} 16%, white)`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 8px color-mix(in srgb, ${accentColor} 22%, transparent)`,
            }}
          >
            <Icon className="h-4 w-4" style={{ color: iconColor }} />
          </div>
          <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-white/50">
            {label}
          </span>
        </div>
        <p className="font-display text-[26px] font-black tabular-nums text-slate-900 dark:text-white">
          {value}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400 dark:text-white/35">{subtitle}</p>
        <div
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold"
          style={{ color: readableBrandText(accentHex, accentColor, 46) }}
        >
          <span>{hint}</span>
          <ChevronDown
            className="h-3.5 w-3.5 transition-transform"
            style={{ transform: active ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </div>
      </div>
    </button>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function AulasFounderClient({ slug, initialData }: AulasFounderClientProps) {
  const { org } = useOrg();
  const videoToolEnabled = org.permissions?.video_lessons_enabled === true;

  const [modules, setModules] = useState<VideoModule[]>(initialData?.modules ?? []);
  const [hasLibrary, setHasLibrary] = useState(initialData?.has_library ?? false);
  const [loading, setLoading] = useState(initialData === null);

  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Criação de módulo
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [creatingModule, setCreatingModule] = useState(false);

  // Criação de aula
  const [newLessonForm, setNewLessonForm] = useState<{
    moduleId: string;
    title: string;
    description: string;
  } | null>(null);
  const [creatingLesson, setCreatingLesson] = useState(false);

  // Deleção de módulo
  const [deletingModuleId, setDeletingModuleId] = useState<string | null>(null);

  // Toggle módulo
  const [togglingModuleId, setTogglingModuleId] = useState<string | null>(null);
  const [editingModule, setEditingModule] = useState<{ id: string; title: string } | null>(null);
  const [savingModuleId, setSavingModuleId] = useState<string | null>(null);

  const [editingLesson, setEditingLesson] = useState<{ id: string; title: string } | null>(null);
  const [savingLessonId, setSavingLessonId] = useState<string | null>(null);
  const [reorderingLessonId, setReorderingLessonId] = useState<string | null>(null);

  // Provisionamento
  const [provisioning, setProvisioning] = useState(false);

  // Upload
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadRef = useRef<{ lessonId: string; info: UploadInfo } | null>(null);

  // Polling de sincronização com Bunny
  const [pollingActive, setPollingActive] = useState(false);
  const pollAttemptsRef = useRef(0);

  // KPIs founder
  const [kpis, setKpis] = useState<VideoKpiPayload | null>(null);
  const [kpisLoading, setKpisLoading] = useState(false);
  const [kpiPeriodDays, setKpiPeriodDays] = useState<7 | 30 | 60 | 90>(7);
  const [kpiModuleId, setKpiModuleId] = useState<string>('');
  const [kpiDetailOpen, setKpiDetailOpen] = useState<'adoption' | 'completion' | 'risk' | 'coverage' | null>(null);

  // ── Auth fetch ────────────────────────────────────────────────────────────────

  async function authFetch(path: string, options: RequestInit = {}) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? '';
    const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000';
    return fetch(`${api}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers ?? {}),
      },
    });
  }

  // ── Carregar módulos ─────────────────────────────────────────────────────────

  async function loadModules() {
    setLoading(true);
    try {
      const res = await authFetch(`/api/partners/${slug}/videos/modules`);
      if (!res.ok) return;
      const data: VideoModulesPayload = await res.json();
      const mods = data.modules ?? [];
      setModules(mods);
      setHasLibrary(data.has_library);
      const hasPending = mods.some((m) =>
        m.lessons.some((l) => l.status === 'uploading' || l.status === 'processing')
      );
      if (hasPending) {
        setPollingActive(true);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!videoToolEnabled) return;
    if (initialData !== null) return;
    loadModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, videoToolEnabled]);

  async function loadKpis() {
    setKpisLoading(true);
    try {
      const params = new URLSearchParams({ period_days: String(kpiPeriodDays) });
      if (kpiModuleId) {
        params.set('module_id', kpiModuleId);
      }
      const res = await authFetch(`/api/partners/${slug}/videos/kpis?${params.toString()}`);
      if (!res.ok) return;
      const data: VideoKpiPayload = await res.json();
      setKpis(data);
    } catch {
      // no-op
    } finally {
      setKpisLoading(false);
    }
  }

  useEffect(() => {
    if (!videoToolEnabled) return;
    loadKpis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, kpiPeriodDays, kpiModuleId, videoToolEnabled]);

  // ── Polling: sincroniza status no backend e recarrega módulos ──

  const silentRefreshRef = useRef(async () => false as boolean);
  silentRefreshRef.current = async (): Promise<boolean> => {
    // 1) sincroniza estados pendentes direto no Bunny (fallback do webhook)
    try {
      await authFetch(`/api/partners/${slug}/videos/sync`, { method: 'POST' });
    } catch {
      // segue para refresh da lista mesmo se sync falhar
    }

    // 2) recarrega estado atualizado do banco
    try {
      const res = await authFetch(`/api/partners/${slug}/videos/modules`);
      if (!res.ok) return false;
      const data: VideoModulesPayload = await res.json();
      setModules(data.modules ?? []);
      setHasLibrary(data.has_library);
      // Retorna true se ainda há aulas pendentes no pipeline
      return (data.modules ?? []).some(m =>
        m.lessons.some(l => l.status === 'uploading' || l.status === 'processing')
      );
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!initialData?.modules?.length) return;
    const hasPending = initialData.modules.some((m) =>
      m.lessons.some((l) => l.status === 'uploading' || l.status === 'processing')
    );
    if (hasPending) {
      setPollingActive(true);
    }
  }, [initialData]);

  useEffect(() => {
    if (!pollingActive) return;
    pollAttemptsRef.current = 0;

    const timer = setInterval(async () => {
      pollAttemptsRef.current += 1;
      const stillProcessing = await silentRefreshRef.current();
      // Para após encontrar tudo pronto ou após ~2 minutos (24 × 5s)
      if (!stillProcessing || pollAttemptsRef.current >= 24) {
        setPollingActive(false);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [pollingActive]);

  // ── Provisionar library Bunny ─────────────────────────────────────────────────

  async function handleProvision() {
    setProvisioning(true);
    try {
      const res = await authFetch(`/api/partners/${slug}/videos/library/provision`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Erro ao ativar videoaulas.'); return; }
      setHasLibrary(true);
      toast.success('Videoaulas ativadas! Agora você já pode criar módulos e fazer upload de aulas.');
    } catch {
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setProvisioning(false);
    }
  }

  // ── Criar módulo ──────────────────────────────────────────────────────────────

  async function handleCreateModule() {
    if (!newModuleTitle.trim() || creatingModule) return;
    setCreatingModule(true);
    try {
      const res = await authFetch(`/api/partners/${slug}/videos/modules`, {
        method: 'POST',
        body: JSON.stringify({ title: newModuleTitle.trim() }),
      });
      if (!res.ok) { toast.error('Erro ao criar módulo.'); return; }
      const { module } = await res.json();
      setModules((prev) => [...prev, module]);
      setExpandedModules((prev) => new Set([...prev, module.id]));
      setNewModuleTitle('');
      setAddingModule(false);
      toast.success('Módulo criado!');
    } catch {
      toast.error('Erro de conexão.');
    } finally {
      setCreatingModule(false);
    }
  }

  // ── Toggle ativo do módulo ────────────────────────────────────────────────────

  async function toggleModule(module: VideoModule) {
    if (togglingModuleId === module.id) return;
    setTogglingModuleId(module.id);
    try {
      const res = await authFetch(`/api/partners/${slug}/videos/modules/${module.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !module.is_active }),
      });
      if (res.ok) {
        setModules((prev) =>
          prev.map((m) => m.id === module.id ? { ...m, is_active: !m.is_active } : m)
        );
      }
    } finally {
      setTogglingModuleId(null);
    }
  }

  async function saveModuleTitle(moduleId: string) {
    if (!editingModule || editingModule.id !== moduleId) return;
    const title = editingModule.title.trim();
    if (!title) return;
    setSavingModuleId(moduleId);
    try {
      const res = await authFetch(`/api/partners/${slug}/videos/modules/${moduleId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        toast.error('Erro ao atualizar módulo.');
        return;
      }
      setModules((prev) => prev.map((m) => (m.id === moduleId ? { ...m, title } : m)));
      setEditingModule(null);
      toast.success('Módulo atualizado.');
    } catch {
      toast.error('Erro de conexão.');
    } finally {
      setSavingModuleId(null);
    }
  }

  // ── Excluir módulo ────────────────────────────────────────────────────────────

  async function deleteModule(moduleId: string) {
    if (!confirm('Excluir este módulo e todas as suas aulas? Os vídeos no Bunny também serão removidos.')) return;
    setDeletingModuleId(moduleId);
    try {
      const res = await authFetch(`/api/partners/${slug}/videos/modules/${moduleId}`, { method: 'DELETE' });
      if (!res.ok) { toast.error('Erro ao excluir módulo.'); return; }
      setModules((prev) => prev.filter((m) => m.id !== moduleId));
      toast.success('Módulo excluído.');
    } catch {
      toast.error('Erro de conexão.');
    } finally {
      setDeletingModuleId(null);
    }
  }

  // ── Criar aula + token TUS ────────────────────────────────────────────────────

  async function handleCreateLesson() {
    if (!newLessonForm?.title.trim() || creatingLesson) return;
    setCreatingLesson(true);
    try {
      const res = await authFetch(`/api/partners/${slug}/videos/lessons`, {
        method: 'POST',
        body: JSON.stringify({
          module_id: newLessonForm.moduleId,
          title: newLessonForm.title.trim(),
          description: newLessonForm.description,
        }),
      });
      if (!res.ok) { toast.error('Erro ao criar aula.'); return; }
      const { lesson, upload }: { lesson: VideoLesson; upload: UploadInfo } = await res.json();

      setModules((prev) =>
        prev.map((m) =>
          m.id === newLessonForm.moduleId
            ? { ...m, lessons: [...m.lessons, lesson], progress: { ...m.progress, total: m.progress.total + 1 } }
            : m
        )
      );
      setNewLessonForm(null);

      pendingUploadRef.current = { lessonId: lesson.id, info: upload };
      fileInputRef.current?.click();
    } catch {
      toast.error('Erro de conexão.');
    } finally {
      setCreatingLesson(false);
    }
  }

  // ── Upload TUS ────────────────────────────────────────────────────────────────

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !pendingUploadRef.current) return;
    const { lessonId, info } = pendingUploadRef.current;
    pendingUploadRef.current = null;
    e.target.value = '';

    setUploadProgress((prev) => ({ ...prev, [lessonId]: 0 }));

    // Fallback: se onSuccess não disparar em 15s após atingir 100%, forçamos o estado
    let completionTimer: ReturnType<typeof setTimeout> | null = null;
    let completed = false;

    function markComplete() {
      if (completed) return;
      completed = true;
      if (completionTimer) { clearTimeout(completionTimer); completionTimer = null; }
      setUploadProgress((prev) => { const n = { ...prev }; delete n[lessonId]; return n; });
      setModules((prev) =>
        prev.map((m) => ({
          ...m,
          lessons: m.lessons.map((l) =>
            l.id === lessonId ? { ...l, status: 'processing' } : l
          ),
        }))
      );
      setPollingActive(true);
      pollAttemptsRef.current = 0;
      toast.success('Upload concluído! O vídeo será processado em instantes.');
    }

    const upload = new tus.Upload(file, {
      endpoint: info.tus_endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        AuthorizationSignature: info.signature,
        AuthorizationExpire: String(info.expiry),
        VideoId: info.video_id,
        LibraryId: String(info.library_id),
      },
      metadata: { filetype: file.type, title: file.name },
      onProgress(uploaded: number, total: number) {
        if (!total) return;
        const pct = Math.round((uploaded / total) * 100);
        setUploadProgress((prev) => ({ ...prev, [lessonId]: pct }));
        // Arma timeout de 15s se chegou a 100% e onSuccess ainda não disparou
        if (pct >= 100 && !completionTimer && !completed) {
          completionTimer = setTimeout(markComplete, 15_000);
        }
      },
      onSuccess() {
        markComplete();
      },
      onError(err: Error) {
        if (completionTimer) { clearTimeout(completionTimer); completionTimer = null; }
        setUploadProgress((prev) => { const n = { ...prev }; delete n[lessonId]; return n; });
        toast.error('Erro no upload. Tente novamente.');
        console.error('[TUS]', err);
      },
      onShouldRetry(err: Error) {
        const status = (err as any)?.originalResponse?.getStatus?.() ?? 0;
        if (status === 401 || status === 403) return false;
        return true;
      },
    });

    upload.findPreviousUploads().then((prev) => {
      if (prev.length > 0) upload.resumeFromPreviousUpload(prev[0]);
      upload.start();
    });
  }

  // ── Toggle visibilidade da aula ───────────────────────────────────────────────

  async function toggleLesson(moduleId: string, lesson: VideoLesson) {
    const res = await authFetch(`/api/partners/${slug}/videos/lessons/${lesson.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: !lesson.is_active }),
    });
    if (res.ok) {
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? { ...m, lessons: m.lessons.map((l) => l.id === lesson.id ? { ...l, is_active: !l.is_active } : l) }
            : m
        )
      );
    }
  }

  async function saveLessonTitle(moduleId: string, lessonId: string) {
    if (!editingLesson || editingLesson.id !== lessonId) return;
    const title = editingLesson.title.trim();
    if (!title) return;
    setSavingLessonId(lessonId);
    try {
      const res = await authFetch(`/api/partners/${slug}/videos/lessons/${lessonId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        toast.error('Erro ao atualizar aula.');
        return;
      }
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? { ...m, lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, title } : l)) }
            : m
        )
      );
      setEditingLesson(null);
      toast.success('Aula atualizada.');
    } catch {
      toast.error('Erro de conexão.');
    } finally {
      setSavingLessonId(null);
    }
  }

  async function moveLesson(moduleId: string, lessonId: string, direction: -1 | 1) {
    const module = modules.find((m) => m.id === moduleId);
    if (!module) return;
    const idx = module.lessons.findIndex((l) => l.id === lessonId);
    const targetIdx = idx + direction;
    if (idx < 0 || targetIdx < 0 || targetIdx >= module.lessons.length) return;

    const reordered = [...module.lessons].sort((a, b) => a.display_order - b.display_order);
    const sortedIdx = reordered.findIndex((l) => l.id === lessonId);
    const sortedTarget = sortedIdx + direction;
    if (sortedIdx < 0 || sortedTarget < 0 || sortedTarget >= reordered.length) return;

    const swapped = [...reordered];
    [swapped[sortedIdx], swapped[sortedTarget]] = [swapped[sortedTarget], swapped[sortedIdx]];
    const normalized = swapped.map((l, i) => ({ ...l, display_order: i }));

    const prevModules = modules;
    setReorderingLessonId(lessonId);
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, lessons: normalized } : m))
    );

    try {
      const updates = [
        { id: normalized[sortedIdx].id, display_order: normalized[sortedIdx].display_order },
        { id: normalized[sortedTarget].id, display_order: normalized[sortedTarget].display_order },
      ];
      const responses = await Promise.all(
        updates.map((u) =>
          authFetch(`/api/partners/${slug}/videos/lessons/${u.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ display_order: u.display_order }),
          })
        )
      );
      if (responses.some((r) => !r.ok)) {
        setModules(prevModules);
        toast.error('Erro ao reordenar aula.');
        return;
      }
    } catch {
      setModules(prevModules);
      toast.error('Erro de conexão ao reordenar.');
    } finally {
      setReorderingLessonId(null);
    }
  }

  // ── Excluir aula ──────────────────────────────────────────────────────────────

  async function deleteLesson(moduleId: string, lessonId: string) {
    if (!confirm('Excluir esta aula? O vídeo será removido do Bunny também.')) return;
    const res = await authFetch(`/api/partners/${slug}/videos/lessons/${lessonId}`, { method: 'DELETE' });
    if (res.ok) {
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId), progress: { ...m.progress, total: Math.max(0, m.progress.total - 1) } }
            : m
        )
      );
      toast.success('Aula excluída.');
    } else {
      toast.error('Erro ao excluir aula.');
    }
  }

  const periodLabel = kpiPeriodDays === 7
    ? 'semanal'
    : kpiPeriodDays === 30
      ? 'mensal'
      : kpiPeriodDays === 60
        ? 'bimestral'
        : 'trimestral';

  function detailTitle(detail: NonNullable<typeof kpiDetailOpen>): string {
    if (detail === 'adoption') return `Detalhes de Adoção (${periodLabel})`;
    if (detail === 'completion') return `Detalhes de Conclusão (${periodLabel})`;
    if (detail === 'risk') return `Detalhes de Risco (${periodLabel})`;
    return `Detalhes de Cobertura (${periodLabel})`;
  }

  function detailHint(detail: NonNullable<typeof kpiDetailOpen>): string {
    return kpiDetailOpen === detail ? 'Clique para recolher' : 'Clique para ver detalhes';
  }

  function founderFriendlyAction(action: string): string {
    const normalized = (action || '').toLowerCase();
    if (normalized.includes('retomada')) return 'Fale com a turma e reforce uma meta simples de estudo nesta semana.';
    if (normalized.includes('recuperação')) return 'Priorize contato com quem está parado e combine um plano curto de retomada.';
    if (normalized.includes('estrutura') || normalized.includes('duração')) return 'Revise essa aula para ficar mais objetiva e fácil de acompanhar.';
    return action;
  }

  // ── JSX ───────────────────────────────────────────────────────────────────────

  if (!videoToolEnabled) {
    return (
      <PartnerLayout>
        <div className="mx-auto max-w-3xl py-10">
          <ElevatedCard accentColor="#f59e0b">
            <div className="p-6 text-center">
              <AlertCircle className="mx-auto h-7 w-7 text-amber-600 dark:text-amber-300" />
              <h1 className="font-display mt-3 text-lg font-black text-slate-900 dark:text-slate-100">
                Essa função não está habilitada em sua organização
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Peça ao administrador para ativar a ferramenta de videoaulas no painel B2B.
              </p>
            </div>
          </ElevatedCard>
        </div>
      </PartnerLayout>
    );
  }

  return (
    <PartnerLayout>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileSelected}
      />

      <div className="edificar-page-canvas min-h-full -mx-4 -mt-4 px-4 pt-4 pb-8 md:-mx-8 md:-mt-8 md:px-8 md:pt-8 [--partner-surface-base:#ffffff] dark:[--partner-surface-base:#0f172a]">
        <RevealGroup className="edificar-page-frame flex flex-col gap-4 p-3 md:gap-5 md:p-4">

          {/* Header */}
          <RevealItem className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-white/40">
                Videoaulas · {org.name}
              </p>
              <h1 className="font-display text-[26px] font-black text-slate-900 dark:text-white lg:text-[30px]">
                Aulas
              </h1>
              <p className="mt-1 text-[13px] text-slate-500 dark:text-white/50">
                Organize módulos e videoaulas para seus alunos.
              </p>
            </div>
            {!addingModule && hasLibrary && (
              <BrandButton onClick={() => setAddingModule(true)} hex={org.brand_primary}>
                <Plus className="h-4 w-4" />
                Novo módulo
              </BrandButton>
            )}
          </RevealItem>

          {/* Card de ativação */}
          {!hasLibrary && (
            <RevealItem>
              <ElevatedCard accentColor="var(--brand-primary)">
                <div className="p-5">
                  <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                      style={{ background: 'color-mix(in srgb, var(--brand-primary) 14%, white)' }}
                    >
                      <Video className="h-6 w-6" style={{ color: readableBrandText(org.brand_primary, 'var(--brand-primary)', 46) }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Library de vídeo não provisionada
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Clique para criar a library Bunny automaticamente e liberar uploads para esta organização.
                      </p>
                    </div>
                    <BrandButton onClick={handleProvision} disabled={provisioning} hex={org.brand_primary}>
                      {provisioning
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Provisionando…</>
                        : <><Video className="h-4 w-4" /> Provisionar library</>
                      }
                    </BrandButton>
                  </div>
                </div>
              </ElevatedCard>
            </RevealItem>
          )}

          {/* Dashboard de KPIs */}
          <RevealItem>
            <ElevatedCard accentColor="var(--brand-secondary)">
              <div className="p-5">
                <SectionTitle
                  kicker="Analytics"
                  title="Desempenho das Videoaulas"
                  hex={org.brand_secondary}
                  action={
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={kpiPeriodDays}
                        onChange={(e) => setKpiPeriodDays(Number(e.target.value) as 7 | 30 | 60 | 90)}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-[var(--brand-primary)] dark:border-white/10 dark:bg-slate-950 dark:text-slate-200"
                      >
                        <option value={7}>Últimos 7 dias</option>
                        <option value={30}>Últimos 30 dias</option>
                        <option value={60}>Últimos 60 dias</option>
                        <option value={90}>Últimos 90 dias</option>
                      </select>
                      <select
                        value={kpiModuleId}
                        onChange={(e) => setKpiModuleId(e.target.value)}
                        className="h-9 min-w-44 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-[var(--brand-primary)] dark:border-white/10 dark:bg-slate-950 dark:text-slate-200"
                      >
                        <option value="">Todos os módulos</option>
                        {modules.map((m) => (
                          <option key={m.id} value={m.id}>{m.title}</option>
                        ))}
                      </select>
                    </div>
                  }
                />
                <p className="-mt-2 mb-4 text-[11px] text-slate-400 dark:text-white/35">
                  Clique em um card para abrir os detalhes.
                </p>

                {kpisLoading && !kpis ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {[1, 2, 3, 4].map((k) => (
                      <div key={k} className="h-28 animate-pulse rounded-[20px] bg-slate-100 dark:bg-white/5" />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <KpiToggleCard
                        icon={Users}
                        label={`Adoção ${periodLabel}`}
                        value={`${kpis?.summary.adoption_weekly_pct ?? 0}%`}
                        subtitle={`${kpis?.summary.adoption_weekly_num ?? 0}/${kpis?.summary.adoption_weekly_den ?? 0} alunos ativos no período`}
                        active={kpiDetailOpen === 'adoption'}
                        onClick={() => setKpiDetailOpen((prev) => (prev === 'adoption' ? null : 'adoption'))}
                        hint={detailHint('adoption')}
                        accentColor="var(--brand-primary)"
                        accentHex={org.brand_primary}
                      />
                      <KpiToggleCard
                        icon={Gauge}
                        label={`Conclusão ${periodLabel}`}
                        value={`${kpis?.summary.avg_completion_pct ?? 0}%`}
                        subtitle="Entre alunos que iniciaram no período"
                        active={kpiDetailOpen === 'completion'}
                        onClick={() => setKpiDetailOpen((prev) => (prev === 'completion' ? null : 'completion'))}
                        hint={detailHint('completion')}
                        accentColor="var(--brand-secondary)"
                        accentHex={org.brand_secondary}
                      />
                      <KpiToggleCard
                        icon={TriangleAlert}
                        label={`Risco ${periodLabel}`}
                        value={kpis?.summary.at_risk_students ?? 0}
                        subtitle="Sem atividade recente no período"
                        active={kpiDetailOpen === 'risk'}
                        onClick={() => setKpiDetailOpen((prev) => (prev === 'risk' ? null : 'risk'))}
                        hint={detailHint('risk')}
                        accentColor="#f43f5e"
                        accentHex="#f43f5e"
                      />
                      <KpiToggleCard
                        icon={BookOpen}
                        label={`Cobertura ${periodLabel}`}
                        value={`${kpis?.summary.module_coverage_pct ?? 0}%`}
                        subtitle="Conclusões sobre o total possível"
                        active={kpiDetailOpen === 'coverage'}
                        onClick={() => setKpiDetailOpen((prev) => (prev === 'coverage' ? null : 'coverage'))}
                        hint={detailHint('coverage')}
                        accentColor="var(--brand-accent)"
                        accentHex={org.brand_accent}
                      />
                    </div>

                    {kpiDetailOpen && (
                      <div className="mt-3 rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-white/40">
                          {detailTitle(kpiDetailOpen)}
                        </div>

                        {kpiDetailOpen === 'adoption' && (
                          <div className="space-y-3">
                            {[
                              { label: `Iniciaram (${periodLabel})`, value: kpis?.funnel.started ?? 0 },
                              { label: `Chegaram em 50% (${periodLabel})`, value: kpis?.funnel.reached_50 ?? 0 },
                              { label: `Concluíram 80% (${periodLabel})`, value: kpis?.funnel.completed_80 ?? 0 },
                            ].map((f) => {
                              const den = kpis?.students_total || 1;
                              const pct = Math.round((f.value / den) * 100);
                              return (
                                <div key={f.label}>
                                  <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-white/40">
                                    <span>{f.label}</span>
                                    <span>{f.value} ({pct}%)</span>
                                  </div>
                                  <MiniBar pct={pct} color="var(--brand-primary)" height={6} />
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {kpiDetailOpen === 'risk' && (
                          <div className="space-y-3">
                            {(kpis?.alerts ?? []).length === 0 ? (
                              <p className="text-xs text-slate-500 dark:text-white/40">Nenhum alerta crítico no período {periodLabel}.</p>
                            ) : (
                              (kpis?.alerts ?? []).map((a, idx) => {
                                const title = a.title.replace('semanal', periodLabel);
                                const message = a.message.replace('no período', `no período ${periodLabel}`);
                                const clearAction = founderFriendlyAction(a.action);
                                return (
                                  <div
                                    key={`${a.title}-${idx}`}
                                    className={cn(
                                      'rounded-xl p-3',
                                      a.level === 'critical'
                                        ? 'bg-red-50 dark:bg-red-500/10'
                                        : 'bg-amber-50 dark:bg-amber-500/10'
                                    )}
                                  >
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{title}</p>
                                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{message}</p>
                                    <p className="mt-2 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                                      Próximo passo: {clearAction}
                                    </p>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}

                        {(kpiDetailOpen === 'completion' || kpiDetailOpen === 'coverage') && (
                          <>
                            {kpiDetailOpen === 'coverage' && (
                              <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                {[
                                  { label: '< 25%', value: kpis?.dropoff.lt25 ?? 0 },
                                  { label: '25% a 50%', value: kpis?.dropoff.from25to50 ?? 0 },
                                  { label: '50% a 80%', value: kpis?.dropoff.from50to80 ?? 0 },
                                  { label: '80%+', value: kpis?.dropoff.gte80 ?? 0 },
                                ].map((d) => (
                                  <div key={d.label} className="rounded-xl bg-white p-2.5 shadow-sm dark:bg-slate-900">
                                    <p className="text-[11px] text-slate-500 dark:text-white/40">{d.label}</p>
                                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{d.value}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="overflow-x-auto rounded-xl bg-white dark:bg-slate-900">
                              <table className="min-w-full text-left text-xs">
                                <thead>
                                  <tr className="text-slate-500 dark:text-white/40">
                                    <th className="px-3 py-2 font-semibold">Aula</th>
                                    <th className="px-3 py-2 font-semibold">Módulo</th>
                                    <th className="px-3 py-2 font-semibold">Iniciaram</th>
                                    <th className="px-3 py-2 font-semibold">Concluíram</th>
                                    <th className="px-3 py-2 font-semibold">Taxa</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                  {(kpis?.lesson_table ?? []).length === 0 ? (
                                    <tr>
                                      <td colSpan={5} className="px-3 py-3 text-center text-slate-500 dark:text-white/40">Sem dados suficientes no período {periodLabel}.</td>
                                    </tr>
                                  ) : (
                                    (kpis?.lesson_table ?? []).map((row) => (
                                      <tr key={row.lesson_id} className="transition-colors hover:bg-slate-50 dark:hover:bg-white/5">
                                        <td className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">{row.lesson_title}</td>
                                        <td className="px-3 py-2 text-slate-500 dark:text-white/40">{row.module_title}</td>
                                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{row.started}</td>
                                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{row.completed}</td>
                                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{row.completion_rate_pct}%</td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </ElevatedCard>
          </RevealItem>

          {/* Divisor de seção: gestão */}
          <RevealItem className="flex items-center gap-2.5 px-1">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'color-mix(in srgb, var(--brand-primary) 14%, white)' }}
            >
              <BookOpen className="h-4 w-4" style={{ color: readableBrandText(org.brand_primary, 'var(--brand-primary)', 46) }} />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">
                Gestão de Módulos e Aulas
              </p>
              <p className="text-[11px] text-slate-500 dark:text-white/40">
                Edite títulos, reordene aulas, ative/desative visibilidade e faça upload de novos vídeos.
              </p>
            </div>
          </RevealItem>

          {/* Formulário novo módulo */}
          {addingModule && (
            <RevealItem>
              <ElevatedCard accentColor="var(--brand-primary)">
                <div className="space-y-3 p-4">
                  <p
                    className="text-xs font-bold uppercase tracking-wide"
                    style={{ color: readableBrandText(org.brand_primary, 'var(--brand-primary)', 46) }}
                  >
                    Novo módulo
                  </p>
                  <input
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateModule()}
                    placeholder="Ex: Competência 1 — Norma Culta"
                    autoFocus
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[var(--brand-primary)] dark:border-white/10 dark:bg-slate-950"
                  />
                  <div className="flex gap-2">
                    <BrandButton
                      onClick={handleCreateModule}
                      disabled={!newModuleTitle.trim() || creatingModule}
                      hex={org.brand_primary}
                    >
                      {creatingModule
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Criando…</>
                        : 'Criar módulo'
                      }
                    </BrandButton>
                    <button
                      type="button"
                      onClick={() => { setAddingModule(false); setNewModuleTitle(''); }}
                      disabled={creatingModule}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50 dark:border-white/10 dark:text-slate-300"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </ElevatedCard>
            </RevealItem>
          )}

          {/* Loading skeleton */}
          {loading ? (
            <RevealItem className="space-y-3">
              {[1, 2].map((k) => (
                <div key={k} className="h-16 animate-pulse rounded-[20px] bg-slate-100 dark:bg-white/5" />
              ))}
            </RevealItem>
          ) : modules.length === 0 ? (
            <RevealItem>
              <ElevatedCard>
                <div className="p-12 text-center">
                  <BookOpen className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-white/20" />
                  <p className="text-sm text-slate-500 dark:text-white/40">
                    Nenhum módulo criado. Crie o primeiro para começar.
                  </p>
                </div>
              </ElevatedCard>
            </RevealItem>
          ) : (
            <RevealItem className="space-y-3">
              {modules.map((module) => {
                const isExpanded = expandedModules.has(module.id);
                const isDeleting = deletingModuleId === module.id;
                const isToggling = togglingModuleId === module.id;
                return (
                  <ElevatedCard
                    key={module.id}
                    accentColor={module.is_active ? 'var(--brand-primary)' : undefined}
                    className={cn(!module.is_active && 'opacity-60')}
                  >
                    {/* Cabeçalho do módulo */}
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-300 dark:text-white/20" />

                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (editingModule?.id === module.id) return;
                          setExpandedModules((prev) => {
                            const next = new Set(prev);
                            isExpanded ? next.delete(module.id) : next.add(module.id);
                            return next;
                          });
                        }}
                        onKeyDown={(e) => {
                          if (editingModule?.id === module.id) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setExpandedModules((prev) => {
                              const next = new Set(prev);
                              isExpanded ? next.delete(module.id) : next.add(module.id);
                              return next;
                            });
                          }
                        }}
                        className="flex flex-1 items-center gap-3 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          {editingModule?.id === module.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                value={editingModule.title}
                                onChange={(e) => setEditingModule({ id: module.id, title: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { e.preventDefault(); saveModuleTitle(module.id); }
                                  if (e.key === 'Escape') setEditingModule(null);
                                }}
                                autoFocus
                                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-900 outline-none focus:border-[var(--brand-primary)] dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                              />
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); saveModuleTitle(module.id); }}
                                disabled={!editingModule.title.trim() || savingModuleId === module.id}
                                className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 disabled:opacity-50 dark:border-white/10 dark:text-slate-300"
                              >
                                {savingModuleId === module.id ? '...' : 'Salvar'}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setEditingModule(null); }}
                                className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:border-white/10 dark:text-slate-300"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {module.title}
                            </p>
                          )}
                          <p className="text-[11px] text-slate-500 dark:text-white/40">
                            {module.lessons.length}{' '}
                            {module.lessons.length === 1 ? 'aula' : 'aulas'}
                            {!module.is_active && ' · Inativo'}
                          </p>
                        </div>
                        <ChevronDown
                          className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 dark:text-white/30"
                          style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        />
                      </div>

                      <button
                        type="button"
                        title="Editar módulo"
                        onClick={() => setEditingModule({ id: module.id, title: module.title })}
                        disabled={isDeleting || isToggling || savingModuleId === module.id}
                        className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:text-white/30 dark:hover:bg-white/10 dark:hover:text-white/70"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      {/* Toggle ativar/desativar */}
                      <button
                        type="button"
                        onClick={() => toggleModule(module)}
                        disabled={isToggling || isDeleting}
                        className={cn(
                          'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50',
                          module.is_active
                            ? 'border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-500 dark:border-white/10 dark:text-white/50'
                            : 'border-emerald-300 text-emerald-600 dark:border-emerald-500/40 dark:text-emerald-400'
                        )}
                      >
                        {isToggling
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : module.is_active ? 'Desativar' : 'Ativar'
                        }
                      </button>

                      {/* Excluir módulo */}
                      <button
                        type="button"
                        onClick={() => deleteModule(module.id)}
                        disabled={isDeleting || isToggling}
                        title="Excluir módulo"
                        className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:text-white/30 dark:hover:bg-red-500/10"
                      >
                        {isDeleting
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />
                        }
                      </button>
                    </div>

                    {/* Lista de aulas */}
                    <div
                      className="overflow-hidden transition-all duration-300"
                      style={{ maxHeight: isExpanded ? '9999px' : '0px' }}
                    >
                      <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-white/5 dark:border-white/5">
                        {module.lessons.map((lesson, lessonIndex) => {
                          const uploadPct = uploadProgress[lesson.id];
                          const isActivelyUploading = uploadPct !== undefined;
                          const isEditingLesson = editingLesson?.id === lesson.id;
                          return (
                            <div
                              key={lesson.id}
                              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/10">
                                {lesson.status === 'ready' ? (
                                  <Play className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                                ) : lesson.status === 'error' ? (
                                  <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                                ) : (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {isEditingLesson ? (
                                    <div className="flex w-full items-center gap-2">
                                      <input
                                        value={editingLesson.title}
                                        onChange={(e) => setEditingLesson({ id: lesson.id, title: e.target.value })}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') { e.preventDefault(); saveLessonTitle(module.id, lesson.id); }
                                          if (e.key === 'Escape') setEditingLesson(null);
                                        }}
                                        autoFocus
                                        className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-900 outline-none focus:border-[var(--brand-primary)] dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => saveLessonTitle(module.id, lesson.id)}
                                        disabled={!editingLesson.title.trim() || savingLessonId === lesson.id}
                                        className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 disabled:opacity-50 dark:border-white/10 dark:text-slate-300"
                                      >
                                        {savingLessonId === lesson.id ? '...' : 'Salvar'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingLesson(null)}
                                        className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:border-white/10 dark:text-slate-300"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  ) : (
                                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                      {lesson.title}
                                    </p>
                                  )}
                                  <StatusBadge status={lesson.status} isUploading={isActivelyUploading} />
                                  {!lesson.is_active && lesson.status === 'ready' && (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-white/10 dark:text-white/40">
                                      Oculta
                                    </span>
                                  )}
                                </div>
                                {lesson.duration_secs && (
                                  <p className="text-[11px] text-slate-400 dark:text-white/30">
                                    {formatDuration(lesson.duration_secs)}
                                  </p>
                                )}
                                {/* Barra de progresso do upload */}
                                {isActivelyUploading && (
                                  <div className="mt-1.5 space-y-0.5">
                                    <MiniBar pct={uploadPct} color="var(--brand-primary)" height={6} glow />
                                    <p className="text-[10px] text-slate-400 dark:text-white/30">
                                      {uploadPct < 100
                                        ? `${uploadPct}% enviado`
                                        : 'Aguardando confirmação do servidor…'
                                      }
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="flex shrink-0 items-center gap-1">
                                <button
                                  type="button"
                                  title="Mover para cima"
                                  onClick={() => moveLesson(module.id, lesson.id, -1)}
                                  disabled={lessonIndex === 0 || reorderingLessonId === lesson.id}
                                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40 dark:text-white/30 dark:hover:bg-white/10 dark:hover:text-white/70"
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  title="Mover para baixo"
                                  onClick={() => moveLesson(module.id, lesson.id, 1)}
                                  disabled={lessonIndex === module.lessons.length - 1 || reorderingLessonId === lesson.id}
                                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40 dark:text-white/30 dark:hover:bg-white/10 dark:hover:text-white/70"
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  title="Editar aula"
                                  onClick={() => setEditingLesson({ id: lesson.id, title: lesson.title })}
                                  disabled={savingLessonId === lesson.id}
                                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40 dark:text-white/30 dark:hover:bg-white/10 dark:hover:text-white/70"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                {lesson.status === 'ready' && (
                                  <button
                                    type="button"
                                    title={lesson.is_active ? 'Ocultar dos alunos' : 'Mostrar para alunos'}
                                    onClick={() => toggleLesson(module.id, lesson)}
                                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-white/30 dark:hover:bg-white/10 dark:hover:text-white/70"
                                  >
                                    {lesson.is_active
                                      ? <Eye className="h-4 w-4" />
                                      : <EyeOff className="h-4 w-4" />}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  title="Excluir aula"
                                  onClick={() => deleteLesson(module.id, lesson.id)}
                                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-white/30 dark:hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* Formulário nova aula */}
                        {newLessonForm?.moduleId === module.id ? (
                          <div className="space-y-2 px-4 py-3">
                            <input
                              value={newLessonForm.title}
                              onChange={(e) => setNewLessonForm((f) => f ? { ...f, title: e.target.value } : f)}
                              onKeyDown={(e) => e.key === 'Enter' && handleCreateLesson()}
                              placeholder="Título da aula"
                              autoFocus
                              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[var(--brand-primary)] dark:border-white/10 dark:bg-slate-950"
                            />
                            <textarea
                              value={newLessonForm.description}
                              onChange={(e) => setNewLessonForm((f) => f ? { ...f, description: e.target.value } : f)}
                              placeholder="Descrição (opcional)"
                              rows={2}
                              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand-primary)] dark:border-white/10 dark:bg-slate-950"
                            />
                            <div className="flex gap-2">
                              <BrandButton
                                onClick={handleCreateLesson}
                                disabled={!newLessonForm.title.trim() || creatingLesson}
                                hex={org.brand_primary}
                                className="px-3 py-2 text-[13px]"
                              >
                                {creatingLesson
                                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Criando…</>
                                  : <><Upload className="h-3.5 w-3.5" /> Criar e fazer upload</>
                                }
                              </BrandButton>
                              <button
                                type="button"
                                onClick={() => setNewLessonForm(null)}
                                disabled={creatingLesson}
                                className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50 dark:border-white/10 dark:text-slate-300"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          hasLibrary && (
                            <div className="px-4 py-2.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setNewLessonForm({ moduleId: module.id, title: '', description: '' })
                                }
                                className="flex w-full items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-500 transition-colors hover:border-[var(--brand-primary)] dark:border-white/15 dark:text-white/40"
                                style={{ '--tw-text-opacity': 1 } as React.CSSProperties}
                                onMouseEnter={(e) => { e.currentTarget.style.color = readableBrandText(org.brand_primary, 'var(--brand-primary)', 46); }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = ''; }}
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Adicionar aula
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </ElevatedCard>
                );
              })}
            </RevealItem>
          )}
        </RevealGroup>
      </div>
    </PartnerLayout>
  );
}
