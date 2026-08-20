'use client';

import { useEffect, useRef, useState } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { useRouter } from 'next/navigation';
import { MOCK_SIMULADOS } from '../../../../../studytrack-tutorial-mock';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { QuestionRichText } from '@/components/questions/QuestionRichText';
import PersonalizedSimuladoWizard from '@/app/partners/[slug]/simulados/PersonalizedSimuladoWizard';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { readableBrandText, onBrandText } from '@/lib/brand-color';
import {
  RevealGroup, RevealItem, ElevatedCard, SectionTitle, BrandButton, BrandPill,
} from '@/components/partners/founder-ui';
import {
  Plus, ChevronDown, Trophy, Users, BarChart2, BarChart3,
  CalendarDays, Pencil, Trash2, Play, Timer, BookOpen, X, SlidersHorizontal,
  Shuffle, ListChecks, Monitor, Printer, FileText, ClipboardList, Download,
  MapPin, Camera,
} from 'lucide-react';

// ── Tipos ──────────────────────────────────────────────────────────────────
interface SimuladoConfig {
  format: string;
  bank: string;
  subject: string | null;
  difficulty: string;
  qty: number;
  time_limit_secs: number | null;
  question_ids?: string[] | null;
  fixed_question_ids?: string[] | null;
  custom_question_ids?: string[] | null;
  pool_question_ids?: string[] | null;
  weights?: Record<string, number> | null;
  allow_retry?: boolean;
  same_for_all_students?: boolean;
  ueg_weight_group?: 'I' | 'II' | 'III' | null;
  instructions?: string | null;
}

interface ScheduledSimulado {
  id: string;
  title: string;
  config: SimuladoConfig;
  starts_at: string;
  ends_at: string | null;
  status: 'scheduled' | 'active' | 'ended';
  created_at: string;
  fixed_question_ids?: string[] | null;
  modality?: 'online' | 'printed' | 'hybrid';
  location_name?: string | null;
  location_address?: string | null;
  metrics: {
    total_sessions: number;
    completed_sessions: number;
    unique_students: number;
    avg_score_pct: number | null;
    best_score_pct: number | null;
    worst_score_pct: number | null;
  };
}

interface RankingEntry {
  position: number;
  student_id: string;
  full_name: string | null;
  avatar_url: string | null;
  score: number;
  total_questions: number;
  score_pct: number;
  estimated_note?: number | null;
  weighted_applied?: boolean;
  weighted_mode?: string | null;
  time_taken_secs: number | null;
  tri_score: number | null;
}

interface QuestionDistributionItem {
  question_id: string;
  position: number;
  subject: string | null;
  discipline: string | null;
  difficulty?: string | null;
  context: string | null;
  statement: string | null;
  alternatives: Array<{ letter?: string; label?: string; text?: string; image?: string | null; file?: string | null }>;
  images: Array<string | { url?: string; src?: string; file?: string }>;
  correct_option: string | null;
  attempts: number;
  correct_count: number;
  omitted_count: number;
  omission_pct: number;
  avg_time_secs?: number | null;
  accuracy_pct: number;
  option_distribution: Record<string, number>;
}

interface StudentAnalyticsItem {
  position: number;
  student_id: string;
  full_name: string | null;
  avatar_url: string | null;
  score: number;
  total_questions: number;
  score_pct: number;
  raw_score_pct?: number;
  weighted_score_pct?: number | null;
  time_taken_secs: number | null;
  completed_at: string | null;
  best_subject?: { name: string; correct: number; total: number; pct: number } | null;
  worst_subject?: { name: string; correct: number; total: number; pct: number } | null;
}

interface SimuladoAnalytics {
  weighted_applied?: boolean;
  kpis: {
    participants: number;
    sessions_total: number;
    completion_rate_pct: number;
    avg_score_pct: number;
    median_score_pct: number;
    best_score_pct: number;
    worst_score_pct: number;
  };
  question_distribution: QuestionDistributionItem[];
  students: StudentAnalyticsItem[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const BANK_LABELS: Record<string, string> = {
  ENEM: 'ENEM', UFU: 'UFU', UEG: 'UEG', UFG: 'UFG', Todas: 'Todas as bancas',
};
const DIFFICULTY_LABELS: Record<string, string> = {
  facil: 'Fácil', medio: 'Médio', dificil: 'Difícil', misto: 'Misto',
};
const FORMAT_LABELS: Record<string, string> = {
  custom: 'Personalizado', linguagens: 'Linguagens', humanas: 'Humanas',
  natureza: 'Ciências da Natureza', matematica: 'Matemática',
  dia1: 'Dia 1 ENEM', dia2: 'Dia 2 ENEM', completo: 'Completo',
};

// Formatos disponíveis por banca
const FORMATS_BY_BANK: Record<string, string[]> = {
  ENEM:  ['custom', 'linguagens', 'humanas', 'natureza', 'matematica', 'dia1', 'dia2', 'completo'],
  UFU:   ['custom', 'linguagens', 'humanas', 'natureza', 'matematica', 'completo'],
  UEG:   ['custom', 'linguagens', 'humanas', 'natureza', 'matematica', 'completo'],
  UFG:   ['custom', 'linguagens', 'humanas', 'natureza', 'matematica', 'completo'],
  Todas: ['custom'],
};

// Quantidade fixa de questões por banca/formato (espelha o backend)
const BLOCK_QTY: Record<string, Record<string, number>> = {
  ENEM: { linguagens: 45, humanas: 45, natureza: 45, matematica: 45, dia1: 90, dia2: 90, completo: 180 },
  UFU:  { linguagens: 20, humanas: 20, natureza: 15, matematica: 10, completo: 65 },
  UEG:  { linguagens: 13, humanas: 13, natureza: 13, matematica: 13, completo: 52 },
  UFG:  { linguagens: 24, humanas: 24, natureza: 24, matematica: 24, completo: 96 },
};

const COMPLETE_DISTRIBUTION_HINTS: Record<string, string[]> = {
  UFU: [
    'Português 10, Literatura 5, Língua Estrangeira 5 (Inglês, Espanhol e Francês)',
    'Matemática 10',
    'Biologia 5, Física 5, Química 5',
    'Geografia 5, História 5, Filosofia 5, Sociologia 5',
    'Total 65 questões objetivas',
  ],
  UEG: [
    'Linguagens 13 (Português, Literatura, Língua Estrangeira, Artes, Ed. Física e TIC)',
    'Matemática 13',
    'Natureza 13 (Biologia, Física e Química)',
    'Humanas 13 (História, Geografia, Filosofia e Sociologia)',
    'Total 52 questões objetivas',
  ],
  UFG: [
    'Linguagens 24 (aproximação na plataforma: Língua Portuguesa)',
    'Matemática 24',
    'Natureza 24 (Biologia, Física e Química)',
    'Humanas 24 (História, Geografia, Filosofia e Sociologia)',
    'Total 96 questões objetivas',
  ],
};

function resolveQty(bank: string, format: string): number | null {
  return BLOCK_QTY[bank]?.[format] ?? null; // null = custom, qty editável
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  });
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m} min`;
}

function pctToPoints(pct: number): number {
  return Number((pct * 10).toFixed(1));
}

function pctToUegPoints(pct: number): number {
  return Number(((pct / 100) * 130).toFixed(1));
}

function StatusBadge({ status }: { status: ScheduledSimulado['status'] }) {
  const map = {
    scheduled: { label: 'Agendado', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
    active:    { label: 'Ativo',    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
    ended:     { label: 'Encerrado', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  };
  const { label, cls } = map[status];
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cls}`}>{label}</span>;
}

// ── Formulário de criação/edição ─────────────────────────────────────────────
const EMPTY_FORM = {
  title: '',
  bank: 'ENEM',
  format: 'custom',
  subject: '',
  difficulty: 'misto',
  qty: 10,
  time_limit_secs: '',
  starts_at: '',
  ends_at: '',
  weights: {} as Record<string, number>,
  allow_retry: true,
  same_for_all_students: false,
  ueg_weight_group: null as 'I' | 'II' | 'III' | null,
  instructions: '',
  modality: 'online' as 'online' | 'printed' | 'hybrid',
  location_name: '',
  location_address: '',
};

const UEG_GROUP_PRESETS: Record<'I' | 'II' | 'III', Record<string, number>> = {
  I: { Linguagens: 2.5, Matemática: 4, Natureza: 2.5, Humanas: 1 },
  II: { Linguagens: 3, Matemática: 3, Natureza: 3, Humanas: 1 },
  III: { Linguagens: 4, Matemática: 2, Natureza: 1, Humanas: 3 },
};

const UEG_GROUP_COURSES: Record<'I' | 'II' | 'III', string> = {
  I: 'Engenharia Agrícola, Engenharia Civil, Química Industrial',
  II: 'Agronomia, Biomedicina, Ciências Biológicas, Educação Física, Farmácia, Fisioterapia, Medicina Veterinária, Zootecnia',
  III: 'Arquitetura e Urbanismo e demais cursos do grupo III no edital',
};

const WEIGHT_KEYS_BY_BANK: Record<string, string[]> = {
  ENEM: ['Linguagens', 'Humanas', 'Natureza', 'Matemática'],
  UFU: [
    'Língua Portuguesa', 'Literatura', 'Língua Estrangeira', 'Matemática',
    'Biologia', 'Física', 'Química', 'Geografia', 'História', 'Filosofia', 'Sociologia',
  ],
  UEG: ['Linguagens', 'Matemática', 'Natureza', 'Humanas'],
  UFG: ['Linguagens', 'Matemática', 'Natureza', 'Humanas'],
  Todas: [],
};

// ── Componente principal ──────────────────────────────────────────────────────
export default function SimuladosFounderClient({ slug }: { slug: string }) {
  const { org } = useOrg();
  const router = useRouter();
  const [simulados, setSimulados] = useState<ScheduledSimulado[]>([]);
  const [printedSubmissionCounts, setPrintedSubmissionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showPersonalizedWizard, setShowPersonalizedWizard] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showReviewApproval, setShowReviewApproval] = useState(false);
  const [saveProgressLabel, setSaveProgressLabel] = useState('');
  const [expandedRanking, setExpandedRanking] = useState<string | null>(null);
  const [rankings, setRankings] = useState<Record<string, RankingEntry[]>>({});
  const [loadingRanking, setLoadingRanking] = useState<string | null>(null);
  const [rankingMeta, setRankingMeta] = useState<Record<string, { weighted_ranking?: boolean }>>({});
  const [expandedAnalytics, setExpandedAnalytics] = useState<string | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState<string | null>(null);
  const [analyticsMap, setAnalyticsMap] = useState<Record<string, SimuladoAnalytics>>({});
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionDistributionItem | null>(null);
  const [weightsModalOpen, setWeightsModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [printingSimuladoId, setPrintingSimuladoId] = useState<string | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<'online' | 'impressa' | null>(null);
  const [typeSelectorStep, setTypeSelectorStep] = useState<1 | 2>(1);
  const [printedExamId, setPrintedExamId] = useState<string | null>(null);
  const [downloadingPrint, setDownloadingPrint] = useState<'prova' | 'gabarito' | null>(null);
  const [noQuestionsError, setNoQuestionsError] = useState(false);
  const [distributionShortfall, setDistributionShortfall] = useState<{
    expected: number;
    found: number;
    by_subject?: Record<string, { expected: number; found: number }>;
  } | null>(null);

  async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? '';
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
    return fetch(`${api}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers ?? {}),
      },
    });
  }

  async function loadSimulados() {
    if (org.is_mock) {
      setSimulados(MOCK_SIMULADOS as unknown as ScheduledSimulado[]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/partners/${slug}/scheduled-simulados`);
      if (!res.ok) {
        toast.error('Não foi possível carregar os simulados');
        return;
      }
      const data = await res.json();
      const scheduled = data.scheduled_simulados ?? [];
      setSimulados(scheduled);
      void loadPrintedSubmissionCounts(scheduled);
    } catch {
      toast.error('Erro ao buscar simulados');
    } finally {
      setLoading(false);
    }
  }

  async function loadPrintedSubmissionCounts(scheduled: ScheduledSimulado[]) {
    const printedOrHybrid = scheduled.filter((sim) => sim.modality === 'printed' || sim.modality === 'hybrid');
    if (printedOrHybrid.length === 0) {
      setPrintedSubmissionCounts({});
      return;
    }

    const entries = await Promise.all(
      printedOrHybrid.map(async (sim) => {
        try {
          const examsRes = await fetchWithAuth(`/api/partners/${slug}/printed-exams?scheduled_simulado_id=${sim.id}`);
          if (!examsRes.ok) return [sim.id, 0] as const;
          const examsData = await examsRes.json();
          const printedExams: Array<{ id: string }> = examsData.printed_exams ?? [];
          if (printedExams.length === 0) return [sim.id, 0] as const;

          const counts = await Promise.all(
            printedExams.map(async (exam) => {
              const resultsRes = await fetchWithAuth(`/api/partners/${slug}/printed-exams/${exam.id}/results`);
              if (!resultsRes.ok) return 0;
              const resultsData = await resultsRes.json();
              return (resultsData.submissions ?? []).length;
            }),
          );
          return [sim.id, counts.reduce((sum, count) => sum + count, 0)] as const;
        } catch {
          return [sim.id, 0] as const;
        }
      }),
    );

    setPrintedSubmissionCounts(Object.fromEntries(entries));
  }

  useEffect(() => { loadSimulados(); }, [slug]);

  async function loadRanking(simId: string) {
    if (rankings[simId]) {
      const next = expandedRanking === simId ? null : simId;
      setExpandedRanking(next);
      if (next) setExpandedAnalytics(null);
      return;
    }
    setLoadingRanking(simId);
    try {
      const res = await fetchWithAuth(`/api/partners/${slug}/scheduled-simulados/${simId}/ranking`);
      if (!res.ok) return;
      const data = await res.json();
      setRankings((prev) => ({ ...prev, [simId]: data.ranking ?? [] }));
      setRankingMeta((prev) => ({ ...prev, [simId]: { weighted_ranking: Boolean(data.weighted_ranking) } }));
      setExpandedRanking(simId);
      setExpandedAnalytics(null);
    } finally {
      setLoadingRanking(null);
    }
  }

  async function loadAnalytics(simId: string) {
    if (analyticsMap[simId]) {
      const next = expandedAnalytics === simId ? null : simId;
      setExpandedAnalytics(next);
      if (next) setExpandedRanking(null);
      return;
    }
    setLoadingAnalytics(simId);
    try {
      const res = await fetchWithAuth(`/api/partners/${slug}/scheduled-simulados/${simId}/analytics`);
      if (!res.ok) return;
      const data = await res.json();
      setAnalyticsMap((prev) => ({ ...prev, [simId]: data }));
      setExpandedAnalytics(simId);
      setExpandedRanking(null);
    } finally {
      setLoadingAnalytics(null);
    }
  }

  function resetTypeSelectorState() {
    setShowTypeSelector(false);
    setDeliveryMode(null);
    setTypeSelectorStep(1);
  }

  async function handleSaveImpresso() {
    if (!form.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    setSaving(true);
    setSaveProgressLabel('Selecionando questões para a prova impressa...');
    try {
      const config = {
        format: form.format,
        bank: form.bank,
        subject: form.subject || null,
        difficulty: form.difficulty,
        qty: Number(form.qty),
      };
      const res = await fetchWithAuth(`/api/partners/${slug}/printed-exams`, {
        method: 'POST',
        body: JSON.stringify({ title: form.title.trim(), config }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Erro ao criar prova impressa');
        return;
      }
      setPrintedExamId(json.printed_exam_id);
      setShowForm(false);
      setShowReviewApproval(false);
      setForm(EMPTY_FORM);
    } finally {
      setSaving(false);
      setSaveProgressLabel('');
    }
  }

  async function downloadPrintedPdf(type: 'prova' | 'gabarito') {
    if (!printedExamId) return;
    setDownloadingPrint(type);
    try {
      const res = await fetchWithAuth(
        `/api/partners/${slug}/printed-exams/${printedExamId}/${type}.pdf`,
      );
      if (!res.ok) {
        toast.error('Erro ao gerar PDF');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingPrint(null);
    }
  }

  function resolveScheduledQuestionIds(sim: ScheduledSimulado): string[] {
    if (Array.isArray(sim.fixed_question_ids) && sim.fixed_question_ids.length > 0) {
      return sim.fixed_question_ids.map(String).filter(Boolean);
    }
    return [];
  }

  function filenameFromDisposition(disposition: string | null, fallback: string): string {
    const match = disposition?.match(/filename="?([^";]+)"?/i);
    return match?.[1] || fallback;
  }

  async function downloadBlobResponse(res: Response, fallbackName: string) {
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filenameFromDisposition(res.headers.get('Content-Disposition'), fallbackName);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handlePrintScheduledSimulado(sim: ScheduledSimulado) {
    setPrintingSimuladoId(sim.id);
    try {
      const questionIds = resolveScheduledQuestionIds(sim);
      const createBody = questionIds.length > 0
        ? { title: sim.title, question_ids: questionIds, scheduled_simulado_id: sim.id, config: sim.config }
        : { title: sim.title, config: sim.config, scheduled_simulado_id: sim.id };

      const createRes = await fetchWithAuth(`/api/partners/${slug}/printed-exams`, {
        method: 'POST',
        body: JSON.stringify(createBody),
      });
      const created = await createRes.json();
      if (!createRes.ok) {
        throw new Error(created.error || 'Erro ao criar prova impressa.');
      }

      const printedId = created.printed_exam_id;
      if (!printedId) {
        throw new Error('Prova impressa criada sem identificador.');
      }

      const provaRes = await fetchWithAuth(`/api/partners/${slug}/printed-exams/${printedId}/prova.pdf`);
      if (!provaRes.ok) throw new Error('Erro ao baixar PDF da prova.');
      await downloadBlobResponse(provaRes, `prova_${sim.title}.pdf`);

      const gabaritoRes = await fetchWithAuth(`/api/partners/${slug}/printed-exams/${printedId}/gabarito.pdf`);
      if (!gabaritoRes.ok) throw new Error('Erro ao baixar PDF do gabarito.');
      await downloadBlobResponse(gabaritoRes, `gabarito_${sim.title}.pdf`);

      const gabaritoOficialRes = await fetchWithAuth(`/api/partners/${slug}/printed-exams/${printedId}/gabarito-oficial.pdf`);
      if (!gabaritoOficialRes.ok) throw new Error('Erro ao baixar PDF do gabarito oficial.');
      await downloadBlobResponse(gabaritoOficialRes, `gabarito_oficial_${sim.title}.pdf`);

      toast.success('PDF da prova, gabarito e gabarito oficial baixados.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível imprimir o simulado.');
    } finally {
      setPrintingSimuladoId(null);
    }
  }

  async function handleSaveWithAutoQuestions() {
    setNoQuestionsError(false);
    setDistributionShortfall(null);
    setForm((f) => ({ ...f, subject: '', difficulty: 'misto' }));
    await handleSave({ overrideSubject: '', overrideDifficulty: 'misto' });
  }

  async function handleSaveWithPartial() {
    setDistributionShortfall(null);
    await handleSave({ forcePartial: true });
  }

  async function handleSave(overrides?: { overrideSubject?: string; overrideDifficulty?: string; forcePartial?: boolean }) {
    if (!form.title.trim() || !form.starts_at) {
      toast.error('Título e data de início são obrigatórios');
      return;
    }
    setNoQuestionsError(false);
    setDistributionShortfall(null);
    setSaving(true);
    setSaveProgressLabel(form.same_for_all_students && !overrides ? 'Selecionando questões para a turma...' : 'Salvando simulado...');
    try {
      const config: SimuladoConfig = {
        format: form.format,
        bank: form.bank,
        subject: overrides?.overrideSubject !== undefined ? (overrides.overrideSubject || null) : (form.subject || null),
        difficulty: overrides?.overrideDifficulty ?? form.difficulty,
        qty: Number(form.qty),
        time_limit_secs: form.time_limit_secs ? Number(form.time_limit_secs) * 60 : null,
        weights: Object.keys(form.weights || {}).length > 0
          ? Object.fromEntries(
              Object.entries(form.weights).filter(([, v]) => Number(v) > 0)
            )
          : null,
        allow_retry: form.allow_retry,
        same_for_all_students: form.same_for_all_students,
        ueg_weight_group: form.bank === 'UEG' ? (form.ueg_weight_group ?? null) : null,
        instructions: form.instructions?.trim() ? form.instructions.trim() : null,
      };

      const body = {
        title: form.title,
        config,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        modality: form.modality,
        location_name: (form.modality === 'printed' || form.modality === 'hybrid') ? (form.location_name.trim() || null) : null,
        location_address: (form.modality === 'printed' || form.modality === 'hybrid') ? (form.location_address.trim() || null) : null,
        ...(overrides?.forcePartial ? { force_partial: true } : {}),
      };

      const url = editingId
        ? `/api/partners/${slug}/scheduled-simulados/${editingId}`
        : `/api/partners/${slug}/scheduled-simulados`;
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetchWithAuth(url, { method, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) {
        if (json.code === 'NO_QUESTIONS_FOUND_FOR_SAME_FOR_ALL') {
          setNoQuestionsError(true);
          return;
        }
        if (json.code === 'INSUFFICIENT_QUESTIONS_FOR_DISTRIBUTION') {
          setDistributionShortfall(json.shortfall ?? { expected: 0, found: 0 });
          return;
        }
        toast.error(json.error ?? 'Erro ao salvar');
        return;
      }

      toast.success(editingId ? 'Simulado atualizado' : 'Simulado criado');
      setSaveProgressLabel('Concluído.');
      const createdOrUpdated = json?.scheduled_simulado;
      if (createdOrUpdated) {
        const next: ScheduledSimulado = {
          ...createdOrUpdated,
          metrics: createdOrUpdated.metrics ?? {
            total_sessions: 0,
            completed_sessions: 0,
            unique_students: 0,
            avg_score_pct: null,
            best_score_pct: null,
            worst_score_pct: null,
          },
        };
        setSimulados((prev) => {
          const idx = prev.findIndex((s) => s.id === next.id);
          if (idx >= 0) {
            const clone = [...prev];
            clone[idx] = { ...clone[idx], ...next };
            return clone;
          }
          return [next, ...prev];
        });
      }
      setShowForm(false);
      setShowReviewApproval(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadSimulados();
    } finally {
      setSaving(false);
      setSaveProgressLabel('');
    }
  }

  async function handleDelete(sim: ScheduledSimulado) {
    setDeleting(true);
    try {
      const force = sim.status === 'ended';
      const res = await fetchWithAuth(
        `/api/partners/${slug}/scheduled-simulados/${sim.id}${force ? '?force=true' : ''}`,
        { method: 'DELETE' }
      );
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(
          json.action === 'ended'
            ? 'Simulado encerrado'
            : json.action === 'deleted_forced'
              ? 'Simulado excluído permanentemente'
              : 'Simulado excluído'
        );
        setConfirmDeleteId(null);
        await loadSimulados();
      } else {
        toast.error(json.error ?? 'Erro ao excluir');
      }
    } finally {
      setDeleting(false);
    }
  }

  function openEdit(sim: ScheduledSimulado) {
    setEditingId(sim.id);
      setForm({
      title: sim.title,
      bank: sim.config.bank,
      format: sim.config.format,
      subject: sim.config.subject ?? '',
      difficulty: sim.config.difficulty,
      qty: sim.config.qty,
        time_limit_secs: sim.config.time_limit_secs ? String(sim.config.time_limit_secs / 60) : '',
        starts_at: sim.starts_at.slice(0, 16),
        ends_at: sim.ends_at ? sim.ends_at.slice(0, 16) : '',
        weights: sim.config.weights ?? {},
        allow_retry: sim.config.allow_retry ?? true,
        same_for_all_students: sim.config.same_for_all_students ?? false,
        ueg_weight_group: (sim.config.ueg_weight_group as 'I' | 'II' | 'III' | null) ?? null,
        instructions: sim.config.instructions ?? '',
        modality: sim.modality ?? 'online',
        location_name: sim.location_name ?? '',
        location_address: sim.location_address ?? '',
      });
      setShowForm(true);
  }

  const inputCls = 'h-10 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-[var(--brand-primary)]';
  const labelCls = 'block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1';
  const kpiCard = 'rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5';

  return (
    <PartnerLayout>
      <div className="edificar-page-canvas min-h-full -mx-4 -mt-4 px-4 pt-4 pb-8 md:-mx-8 md:-mt-8 md:px-8 md:pt-8 [--partner-surface-base:#ffffff] dark:[--partner-surface-base:#0f172a]">
        <RevealGroup className="edificar-page-frame space-y-5 p-3 md:p-4">

          {/* Header */}
          <RevealItem>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <SectionTitle kicker="Avaliações" title="Simulados da Turma" hex={org.brand_primary} />
                <p className="-mt-2 text-sm text-slate-500 dark:text-white/50">
                  Agende e acompanhe simulados para seus alunos.
                </p>
              </div>
              {!showForm && (
                <BrandButton
                  onClick={() => { setShowTypeSelector(true); setEditingId(null); setForm(EMPTY_FORM); }}
                  hex={org.brand_primary}
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4" />
                  Novo Simulado
                </BrandButton>
              )}
            </div>
          </RevealItem>

          {/* Formulário */}
          {showForm && (
            <div className="fixed inset-0 z-[95] bg-black/55 backdrop-blur-[2px]">
              <div className="h-full w-full overflow-y-auto md:flex md:items-center md:justify-center md:p-6">
                <div className="flex min-h-full w-full flex-col overflow-hidden bg-white dark:bg-slate-950 md:min-h-0 md:max-h-[92vh] md:max-w-5xl md:rounded-3xl md:border md:border-slate-200 md:dark:border-slate-800 md:shadow-2xl">
                  <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800 md:px-6 md:py-5">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--brand-primary)' }}>
                        {editingId ? 'Editar simulado' : 'Novo simulado'}
                      </p>
                      <h2 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white sm:text-xl">Configuração do Simulado</h2>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Defina banca, formato, período e regras da turma.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
                      className="min-h-11 shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Fechar
                    </button>
                  </div>

                  <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 md:px-6">

              {/* Título */}
              <div>
                <label className={labelCls}>Título</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Simulado de Linguagens — Semana 3"
                  className={inputCls}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* Banca */}
                <div>
                  <label className={labelCls}>Banca</label>
                  <select
                    value={form.bank}
                    onChange={(e) => {
                      const bank = e.target.value;
                      const formats = FORMATS_BY_BANK[bank] ?? ['custom'];
                      const fmt = formats.includes(form.format) ? form.format : 'custom';
                      const fixed = resolveQty(bank, fmt);
                      setForm((f) => ({ ...f, bank, format: fmt, qty: fixed ?? f.qty }));
                    }}
                    className={inputCls}
                  >
                    {Object.entries(BANK_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* Formato */}
                <div>
                  <label className={labelCls}>Formato</label>
                  <select
                    value={form.format}
                    onChange={(e) => {
                      const fmt = e.target.value;
                      const fixed = resolveQty(form.bank, fmt);
                      setForm((f) => ({ ...f, format: fmt, qty: fixed ?? f.qty }));
                    }}
                    className={inputCls}
                  >
                    {(FORMATS_BY_BANK[form.bank] ?? ['custom']).map((k) => (
                      <option key={k} value={k}>{FORMAT_LABELS[k]}</option>
                    ))}
                  </select>
                </div>

                {/* Dificuldade */}
                <div>
                  <label className={labelCls}>Dificuldade</label>
                  <select value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))} className={inputCls}>
                    {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* Quantidade — bloqueada para formatos com qty fixa */}
                <div>
                  <label className={labelCls}>
                    Questões
                    {resolveQty(form.bank, form.format) !== null && (
                      <span className="ml-1 normal-case font-normal text-slate-400">(fixo pela banca)</span>
                    )}
                  </label>
                  <input
                    type="number"
                    min={5} max={180}
                    value={form.qty}
                    readOnly={resolveQty(form.bank, form.format) !== null}
                    onChange={(e) => {
                      if (resolveQty(form.bank, form.format) !== null) return;
                      setForm((f) => ({ ...f, qty: Number(e.target.value) }));
                    }}
                    className={`${inputCls} ${resolveQty(form.bank, form.format) !== null ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}`}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => setWeightsModalOpen(true)}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] dark:border-slate-700 dark:text-slate-300 sm:w-auto"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Definir Pesos (Opcional)
                </button>
                {Object.keys(form.weights || {}).length > 0 && (
                  <p className="text-xs text-slate-500">
                    {Object.keys(form.weights).length} peso(s) definido(s)
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Permitir refazer simulado</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Quando desativado, o aluno só poderá concluir este simulado uma vez.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(form.allow_retry)}
                    onClick={() => setForm((f) => ({ ...f, allow_retry: !f.allow_retry }))}
                    className={`relative inline-flex h-11 w-14 shrink-0 items-center rounded-full transition-colors focus:outline-none ${form.allow_retry ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${form.allow_retry ? 'translate-x-8' : 'translate-x-1.5'}`}
                    />
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Mesmo simulado para toda a turma</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Ativado: todos recebem o mesmo conjunto de questões. Desativado: cada aluno recebe um conjunto próprio.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(form.same_for_all_students)}
                    onClick={() => setForm((f) => ({ ...f, same_for_all_students: !f.same_for_all_students }))}
                    className={`relative inline-flex h-11 w-14 shrink-0 items-center rounded-full transition-colors focus:outline-none ${form.same_for_all_students ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${form.same_for_all_students ? 'translate-x-8' : 'translate-x-1.5'}`}
                    />
                  </button>
                </div>
              </div>

              <div>
                <label className={labelCls}>Instruções do Simulado (Opcional)</label>
                <textarea
                  value={form.instructions ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                  placeholder="Ex: Foque em gestão de tempo. Pule questões longas e retorne no final."
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-[var(--brand-primary)]"
                />
              </div>

              {/* Modalidade */}
              <div>
                <label className={labelCls}>Modalidade</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {([
                    { value: 'online',   label: 'Online',    Icon: Monitor },
                    { value: 'printed',  label: 'Presencial', Icon: Printer },
                    { value: 'hybrid',   label: 'Híbrido',   Icon: MapPin  },
                  ] as const).map(({ value: m, label, Icon }) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, modality: m, ...(m === 'online' ? { location_name: '', location_address: '' } : {}) }))}
                      className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-colors ${form.modality === m ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 text-[var(--brand-primary)]' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'}`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {label}
                    </button>
                  ))}
                </div>
                {form.modality === 'hybrid' && (
                  <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Híbrido: alunos podem realizar online OU presencialmente. O resultado presencial prevalece.
                  </p>
                )}
              </div>

              <AnimatePresence>
                {(form.modality === 'printed' || form.modality === 'hybrid') && (
                  <motion.div
                    key="location-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/30 p-3">
                      <div>
                        <label className={labelCls}>
                          <MapPin className="inline h-3 w-3 mr-1" />
                          Local
                        </label>
                        <input
                          value={form.location_name}
                          onChange={(e) => setForm((f) => ({ ...f, location_name: e.target.value }))}
                          placeholder="Ex: Sala 3 — Bloco B"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Endereço (opcional)</label>
                        <input
                          value={form.location_address}
                          onChange={(e) => setForm((f) => ({ ...f, location_address: e.target.value }))}
                          placeholder="Ex: Rua das Flores, 123"
                          className={inputCls}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* Matéria — só para custom */}
                {form.format === 'custom' && (
                  <div>
                    <label className={labelCls}>Matéria (opcional)</label>
                    <input
                      value={form.subject}
                      onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                      placeholder="Ex: Matemática"
                      className={inputCls}
                    />
                  </div>
                )}

                {/* Tempo limite */}
                <div>
                  <label className={labelCls}>Tempo limite (min, opcional)</label>
                  <input
                    type="number"
                    min={5}
                    value={form.time_limit_secs}
                    onChange={(e) => setForm((f) => ({ ...f, time_limit_secs: e.target.value }))}
                    placeholder="Ex: 90"
                    className={inputCls}
                  />
                </div>

                {/* Início */}
                <div>
                  <label className={labelCls}>Início</label>
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                    className={inputCls}
                  />
                </div>

                {/* Fim */}
                <div>
                  <label className={labelCls}>Fim (opcional)</label>
                  <input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              {form.format === 'completo' && COMPLETE_DISTRIBUTION_HINTS[form.bank] && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Distribuição estimada do completo ({form.bank})
                  </p>
                  <div className="mt-2 space-y-1">
                    {COMPLETE_DISTRIBUTION_HINTS[form.bank].map((line) => (
                      <p key={line} className="text-xs text-slate-600 dark:text-slate-300">
                        • {line}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowReviewApproval(true)}
                  disabled={saving}
                  className="min-h-11 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition disabled:opacity-50"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  {editingId ? 'Revisar e salvar' : 'Revisar e criar'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
                  className="min-h-11 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
              </div>
              {saving && (
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-300 pt-1">
                  {saveProgressLabel || 'Processando...'}
                </p>
              )}
                  </div>

                  <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 px-5 py-3 md:px-6 bg-slate-50/80 dark:bg-slate-900/50">
                    <div className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                      <span className="min-w-0">Fluxo com revisão e aprovação antes de publicar.</span>
                      <span className="shrink-0">{form.bank} · {FORMAT_LABELS[form.format] ?? form.format}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showTypeSelector && (
            <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px]">
              <div className="flex h-full items-center justify-center p-4">
                <div className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6">

                  {/* ── STEP 1: Online ou Impresso? ─────────────────── */}
                  {typeSelectorStep === 1 && (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--brand-primary)' }}>
                            Novo simulado
                          </p>
                          <h2 className="mt-1 text-xl font-extrabold text-slate-900">Como este simulado será aplicado?</h2>
                          <p className="mt-1 text-sm text-slate-500">Escolha o modo de aplicação antes de configurar o simulado.</p>
                        </div>
                        <button type="button" onClick={resetTypeSelectorState} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-600">
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => { setDeliveryMode('online'); setTypeSelectorStep(2); }}
                          className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-slate-300"
                        >
                          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                            <Monitor className="h-5 w-5" />
                          </div>
                          <h3 className="text-base font-bold text-slate-900">Online</h3>
                          <p className="mt-2 text-sm text-slate-500">Os alunos respondem pelo app. Correção e resultados automáticos.</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setDeliveryMode('impressa'); setTypeSelectorStep(2); }}
                          className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-slate-300"
                        >
                          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                            <Printer className="h-5 w-5" />
                          </div>
                          <h3 className="text-base font-bold text-slate-900">Impresso</h3>
                          <p className="mt-2 text-sm text-slate-500">Gera PDF da prova e do gabarito para aplicação em sala, no papel.</p>
                        </button>
                      </div>
                    </>
                  )}

                  {/* ── STEP 2: Aleatório ou Personalizado? (igual ao atual) ─── */}
                  {typeSelectorStep === 2 && (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setTypeSelectorStep(1)}
                              className="min-h-11 rounded-lg px-1 text-xs font-semibold text-slate-400 hover:text-slate-600"
                            >
                              ← Voltar
                            </button>
                            <span className="text-xs text-slate-300">|</span>
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
                              style={{ backgroundColor: deliveryMode === 'impressa' ? '#FEF3C7' : '#EFF6FF',
                                       color: deliveryMode === 'impressa' ? '#92400E' : '#1D4ED8' }}>
                              {deliveryMode === 'impressa' ? <Printer className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                              {deliveryMode === 'impressa' ? 'Impresso' : 'Online'}
                            </span>
                          </div>
                          <h2 className="mt-2 text-xl font-extrabold text-slate-900">Escolha o tipo de criação</h2>
                          <p className="mt-1 text-sm text-slate-500">Use o fluxo automático ou monte questão por questão.</p>
                        </div>
                        <button type="button" onClick={resetTypeSelectorState} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-600">
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => {
                            resetTypeSelectorState();
                            setShowForm(true);
                            setEditingId(null);
                            setForm(EMPTY_FORM);
                          }}
                          className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-slate-300"
                        >
                          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                            <Shuffle className="h-5 w-5" />
                          </div>
                          <h3 className="text-base font-bold text-slate-900">Simulado Aleatório</h3>
                          <p className="mt-2 text-sm text-slate-500">O sistema seleciona questões automaticamente com base nas configurações de banca, formato e dificuldade.</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            resetTypeSelectorState();
                            setShowPersonalizedWizard(true);
                          }}
                          className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-slate-300"
                        >
                          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                            <ListChecks className="h-5 w-5" />
                          </div>
                          <h3 className="text-base font-bold text-slate-900">Simulado Personalizado</h3>
                          <p className="mt-2 text-sm text-slate-500">Monte questão por questão: escolha do banco, gere com IA ou crie do zero.</p>
                        </button>
                      </div>
                    </>
                  )}

                </div>
              </div>
            </div>
          )}

          {/* ── PAINEL DE DOWNLOAD (impresso criado com sucesso) ───────── */}
          {printedExamId && (
            <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px]">
              <div className="flex h-full items-center justify-center p-4">
                <div className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-600">Prova gerada</p>
                      <h2 className="mt-1 text-xl font-extrabold text-slate-900">Download dos arquivos</h2>
                      <p className="mt-1 text-sm text-slate-500">Baixe o PDF da prova para distribuir e o gabarito para os alunos responderem.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setPrintedExamId(null); setDeliveryMode(null); }}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-6 space-y-3">
                    <button
                      type="button"
                      onClick={() => downloadPrintedPdf('prova')}
                      disabled={downloadingPrint !== null}
                      className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-[var(--brand-primary)] disabled:opacity-60"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm" style={{ color: 'var(--brand-primary)' }}>
                        {downloadingPrint === 'prova' ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <FileText className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900">PDF da Prova</p>
                        <p className="text-xs text-slate-500">Questões e alternativas para distribuir aos alunos</p>
                      </div>
                      <Download className="h-4 w-4 shrink-0 text-slate-400" />
                    </button>

                    <button
                      type="button"
                      onClick={() => downloadPrintedPdf('gabarito')}
                      disabled={downloadingPrint !== null}
                      className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-[var(--brand-primary)] disabled:opacity-60"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm" style={{ color: 'var(--brand-primary)' }}>
                        {downloadingPrint === 'gabarito' ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <ClipboardList className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900">PDF do Gabarito</p>
                        <p className="text-xs text-slate-500">Folha de respostas com bolhas para o aluno marcar</p>
                      </div>
                      <Download className="h-4 w-4 shrink-0 text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showPersonalizedWizard && (
            <PersonalizedSimuladoWizard
              slug={slug}
              onClose={() => setShowPersonalizedWizard(false)}
              onCreated={() => {
                setShowPersonalizedWizard(false);
                void loadSimulados();
              }}
              printedMode={deliveryMode === 'impressa'}
              onCreatedPrinted={(id) => {
                setShowPersonalizedWizard(false);
                setPrintedExamId(id);
              }}
            />
          )}

          {/* Lista de simulados */}
          <RevealItem>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((k) => (
                <div key={k} className="h-32 animate-pulse rounded-[20px] bg-slate-200 dark:bg-white/10" />
              ))}
            </div>
          ) : simulados.length === 0 ? (
            <ElevatedCard>
              <div className="p-10 text-center">
                <BookOpen className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-white/20" />
                <p className="text-sm text-slate-500 dark:text-white/50">
                  Nenhum simulado agendado ainda.
                </p>
              </div>
            </ElevatedCard>
          ) : (
            <div className="space-y-4">
              {simulados.map((sim) => (
                <ElevatedCard
                  key={sim.id}
                  accentColor={sim.status === 'active' ? '#10b981' : sim.status === 'ended' ? '#94a3b8' : org.brand_primary}
                  className={sim.status === 'ended' ? 'opacity-75' : undefined}
                >
                  <div className="p-4 sm:p-5">
                    {/* Header do card */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={sim.status} />
                          <h2 className="text-base font-bold text-slate-900 dark:text-white">
                            {sim.title}
                          </h2>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3.5 w-3.5" />
                            {BANK_LABELS[sim.config.bank] ?? sim.config.bank} ·{' '}
                            {sim.config.qty}q · {DIFFICULTY_LABELS[sim.config.difficulty] ?? sim.config.difficulty}
                          </span>
                          {sim.config.format !== 'custom' && (
                            <span>{FORMAT_LABELS[sim.config.format] ?? sim.config.format}</span>
                          )}
                          {sim.config.subject && <span>{sim.config.subject}</span>}
                          {sim.config.time_limit_secs && (
                            <span className="flex items-center gap-1">
                              <Timer className="h-3.5 w-3.5" />
                              {formatDuration(sim.config.time_limit_secs)}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            Início: {formatDateTime(sim.starts_at)}
                          </span>
                          {sim.ends_at && (
                            <span>Fim: {formatDateTime(sim.ends_at)}</span>
                          )}
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        {confirmDeleteId === sim.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {sim.metrics.completed_sessions > 0 ? 'Encerrar?' : 'Excluir?'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDelete(sim)}
                              disabled={deleting}
                              className="rounded-lg px-2.5 py-1 text-xs font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors"
                            >
                              {deleting ? '...' : 'Sim'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={deleting}
                              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <>
                            {sim.status !== 'scheduled' && (
                              <button
                                type="button"
                                onClick={() => router.push(`/partners/${slug}/simulados/${sim.id}/corrigir`)}
                              className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800"
                                title="Corrigir gabaritos"
                              >
                                <Camera className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => void handlePrintScheduledSimulado(sim)}
                              disabled={printingSimuladoId === sim.id}
                              className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-wait disabled:opacity-60 dark:hover:bg-slate-800"
                              title="Imprimir"
                            >
                              {printingSimuladoId === sim.id ? (
                                <span className="block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                <Printer className="h-4 w-4" />
                              )}
                            </button>
                            {(sim.modality === 'printed' || sim.modality === 'hybrid') && (
                              <button
                                type="button"
                                onClick={() => router.push(`/partners/${slug}/simulados/${sim.id}/resultados`)}
                                className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800"
                                title="Ver Resultados"
                              >
                                <BarChart3 className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEdit(sim)}
                              className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(sim.id)}
                              className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Métricas */}
                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {[
                        { label: 'Participantes', value: sim.metrics.unique_students + (printedSubmissionCounts[sim.id] ?? 0), icon: Users },
                        { label: 'Média de acerto', value: sim.metrics.avg_score_pct != null ? `${sim.metrics.avg_score_pct}%` : '—', icon: BarChart2 },
                        { label: 'Melhor resultado', value: sim.metrics.best_score_pct != null ? `${sim.metrics.best_score_pct}%` : '—', icon: Trophy },
                      ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="min-w-0 rounded-2xl bg-slate-50 px-3 py-2.5 dark:bg-white/5">
                          <div className="mb-1 flex items-center gap-1.5">
                            <Icon className="h-3.5 w-3.5" style={{ color: readableBrandText(org.brand_primary, 'var(--brand-primary)', 50) }} />
                            <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-white/40">{label}</p>
                          </div>
                          <p className="truncate text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Botão de ranking */}
                    {sim.metrics.completed_sessions > 0 && (
                      <div
                        className="mt-3 grid gap-2 sm:grid-cols-2"
                        style={{ ['--sim-accent' as string]: readableBrandText(org.brand_primary, 'var(--brand-primary)') }}
                      >
                        <button
                          type="button"
                          onClick={() => loadRanking(sim.id)}
                          className="flex min-h-11 items-center justify-between rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-[var(--sim-accent)] hover:text-[var(--sim-accent)] dark:border-white/10 dark:text-white/70"
                        >
                          <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4" />
                            Ranking da turma
                            {loadingRanking === sim.id && (
                              <span className="text-xs text-slate-400 animate-pulse">Carregando...</span>
                            )}
                          </div>
                          <ChevronDown
                            className="h-4 w-4 transition-transform duration-200"
                            style={{ transform: expandedRanking === sim.id ? 'rotate(180deg)' : 'rotate(0deg)' }}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => loadAnalytics(sim.id)}
                          className="flex min-h-11 items-center justify-between rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-[var(--sim-accent)] hover:text-[var(--sim-accent)] dark:border-white/10 dark:text-white/70"
                        >
                          <div className="flex items-center gap-2">
                            <BarChart2 className="h-4 w-4" />
                            Análise Detalhada
                            {loadingAnalytics === sim.id && (
                              <span className="text-xs text-slate-400 animate-pulse">Carregando...</span>
                            )}
                          </div>
                          <ChevronDown
                            className="h-4 w-4 transition-transform duration-200"
                            style={{ transform: expandedAnalytics === sim.id ? 'rotate(180deg)' : 'rotate(0deg)' }}
                          />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Ranking expandido */}
                  {expandedRanking === sim.id && rankings[sim.id] && (
                    <div className="border-t border-slate-100 dark:border-slate-800">
                      {rankingMeta[sim.id]?.weighted_ranking && (
                        <div className="px-5 py-2 text-xs font-semibold text-amber-600 dark:text-amber-300 border-b border-slate-100 dark:border-slate-800">
                          Ranking ordenado por nota estimada (pesos aplicados)
                        </div>
                      )}
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {rankings[sim.id].map((entry) => (
                          <div key={entry.student_id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                            <span className={`w-6 shrink-0 text-sm font-black tabular-nums ${
                              entry.position === 1 ? 'text-amber-500'
                                : entry.position === 2 ? 'text-slate-400'
                                  : entry.position === 3 ? 'text-amber-700'
                                    : 'text-slate-400 dark:text-slate-500'
                            }`}>
                              #{entry.position}
                            </span>
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
                              {(entry.full_name ?? 'A').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {entry.full_name ?? 'Aluno'}
                              </p>
                              <p className="text-xs text-slate-400">
                                {entry.score}/{entry.total_questions} questões
                                {entry.time_taken_secs && ` · ${formatDuration(entry.time_taken_secs)}`}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              {entry.estimated_note != null && (
                                <p className="text-[11px] font-bold text-[var(--brand-primary)]">
                                  Nota estimada {entry.estimated_note}
                                </p>
                              )}
                              <p
                                className="text-base font-extrabold tabular-nums"
                                style={{
                                  color: entry.score_pct >= 60 ? 'var(--brand-primary)' : '#ef4444',
                                }}
                              >
                                {entry.score_pct}%
                              </p>
                              {sim.config.bank === 'ENEM' && entry.tri_score && (
                                <p className="text-[10px] text-slate-400">TRI {entry.tri_score}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {expandedAnalytics === sim.id && analyticsMap[sim.id] && (
                    <div className="border-t border-slate-100 dark:border-slate-800 p-5 space-y-5">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">KPIs da turma</p>
                        {analyticsMap[sim.id].weighted_applied && (
                          <p className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-300">
                            Pesos aplicados na pontuação!
                          </p>
                        )}
                        {(() => {
                          const k = analyticsMap[sim.id].kpis;
                          const weighted = Boolean(analyticsMap[sim.id].weighted_applied);
                          const isUegWeighted = weighted && sim.config.bank === 'UEG';
                          const scoreLabel = weighted ? (isUegWeighted ? 'Nota Objetiva' : 'Nota Estimada') : 'Acerto';
                          const students = analyticsMap[sim.id].students ?? [];
                          const avgTimeSecs = students.length
                            ? Math.round(
                                students
                                  .map((s) => s.time_taken_secs || 0)
                                  .reduce((sum, v) => sum + v, 0) / students.length
                              )
                            : 0;
                          const bySubject = new Map<string, { correct: number; total: number }>();
                          for (const q of analyticsMap[sim.id].question_distribution ?? []) {
                            const key = (q.subject || q.discipline || 'Geral').trim();
                            const prev = bySubject.get(key) || { correct: 0, total: 0 };
                            prev.correct += Number(q.correct_count || 0);
                            prev.total += Number(q.attempts || 0);
                            bySubject.set(key, prev);
                          }
                          const subjectRates = Array.from(bySubject.entries())
                            .map(([name, v]) => ({
                              name,
                              correct: v.correct,
                              total: v.total,
                              pct: v.total > 0 ? Number(((v.correct / v.total) * 100).toFixed(1)) : 0,
                            }))
                            .sort((a, b) => a.pct - b.pct);
                          const lowest = subjectRates[0] || null;
                          const highest = subjectRates[subjectRates.length - 1] || null;
                          const formatScore = (pct: number) => {
                            if (!weighted) return `${pct}%`;
                            if (isUegWeighted) return `${pctToUegPoints(pct)}/130`;
                            return `${pctToPoints(pct)} pts`;
                          };
                          return (
                        <div className="mt-2 space-y-3">
                        <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
                          {[
                            { label: 'Participantes', value: analyticsMap[sim.id].kpis.participants },
                            { label: 'Conclusão', value: `${analyticsMap[sim.id].kpis.completion_rate_pct}%` },
                            { label: `Média (${scoreLabel})`, value: formatScore(k.avg_score_pct) },
                            { label: 'Tempo médio da turma', value: avgTimeSecs > 0 ? formatDuration(avgTimeSecs) : '—' },
                            { label: `Melhor (${scoreLabel})`, value: formatScore(k.best_score_pct) },
                          ].map((item) => (
                            <div key={item.label} className={kpiCard}>
                              <p className="text-[10px] uppercase tracking-wide text-slate-400">{item.label}</p>
                              <p className="text-lg font-extrabold text-slate-900 dark:text-white">{item.value}</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm">
                            <span className="font-semibold text-red-700 dark:text-red-300">Ponto de atenção:</span>{' '}
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {lowest ? `${lowest.name} (${lowest.pct}% · ${lowest.correct}/${lowest.total})` : '—'}
                            </span>
                          </div>
                          <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-sm">
                            <span className="font-semibold text-emerald-700 dark:text-emerald-300">Melhor desempenho (por matéria):</span>{' '}
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {highest ? `${highest.name} (${highest.pct}% · ${highest.correct}/${highest.total})` : '—'}
                            </span>
                          </div>
                        </div>
                        </div>
                          );
                        })()}
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Desempenho detalhado por aluno</p>
                        <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                          {(() => {
                            const weighted = Boolean(analyticsMap[sim.id].weighted_applied);
                            const isUegWeighted = weighted && sim.config.bank === 'UEG';
                            return (
                          <table className="min-w-[720px] text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500">
                              <tr>
                                <th className="px-3 py-2 text-left">#</th>
                                <th className="px-3 py-2 text-left">Aluno</th>
                                <th className="px-3 py-2 text-left">
                                  {weighted ? 'Acerto (Ponderado)' : 'Acerto'}
                                </th>
                                {weighted && (
                                  <th className="px-3 py-2 text-left">
                                    {isUegWeighted ? 'Nota Objetiva (0-130)' : 'Pontuação Ponderada (pts)'}
                                  </th>
                                )}
                                <th className="px-3 py-2 text-left">Score</th>
                                <th className="px-3 py-2 text-left">Tempo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analyticsMap[sim.id].students.map((s) => (
                                <tr key={s.student_id} className="border-t border-slate-100 dark:border-slate-800">
                                  <td className="px-3 py-2 font-bold text-slate-600">#{s.position}</td>
                                  <td className="px-3 py-2 text-slate-800 dark:text-slate-100">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="font-medium">{s.full_name ?? 'Aluno'}</span>
                                      {s.worst_subject && (
                                        <span className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:text-red-300">
                                          Ponto Fraco: {s.worst_subject.name} ({s.worst_subject.pct}%)
                                        </span>
                                      )}
                                      {s.best_subject && (
                                        <span className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                                          Ponto Forte: {s.best_subject.name} ({s.best_subject.pct}%)
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 font-semibold">
                                    {s.score_pct}%
                                    {weighted && s.raw_score_pct != null && (
                                      <span className="ml-1 text-xs font-normal text-slate-500">
                                        {isUegWeighted ? `(bruto ${s.raw_score_pct}%)` : `(bruto ${pctToPoints(s.raw_score_pct)} pts)`}
                                      </span>
                                    )}
                                  </td>
                                  {weighted && (
                                    <td className="px-3 py-2 font-semibold text-[var(--brand-primary)]">
                                      {isUegWeighted
                                        ? `${pctToUegPoints(s.weighted_score_pct ?? s.score_pct)}/130`
                                        : `${pctToPoints(s.weighted_score_pct ?? s.score_pct)} pts`}
                                    </td>
                                  )}
                                  <td className="px-3 py-2">{s.score}/{s.total_questions}</td>
                                  <td className="px-3 py-2">{s.time_taken_secs ? formatDuration(s.time_taken_secs) : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                            );
                          })()}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Distribuição de acertos por questão</p>
                        <div className="mt-2 space-y-2">
                          {[...analyticsMap[sim.id].question_distribution]
                            .sort((a, b) => {
                              if (b.accuracy_pct !== a.accuracy_pct) return b.accuracy_pct - a.accuracy_pct;
                              return a.position - b.position;
                            })
                            .map((q) => (
                            <button
                              key={q.question_id}
                              type="button"
                              onClick={() => setSelectedQuestion(q)}
                              className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 p-3 hover:border-[var(--brand-primary)] transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                  Q{q.position} · {q.subject ?? 'Geral'}
                                </p>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{q.accuracy_pct}%</p>
                              </div>
                              <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                <div
                                  className={`h-full ${q.accuracy_pct < 30 ? 'bg-red-500' : q.accuracy_pct < 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${Math.max(2, q.accuracy_pct)}%` }}
                                />
                              </div>
                              <p className="mt-1 text-[11px] text-slate-500">
                                Tentativas: {q.attempts} · Tempo médio: {q.avg_time_secs ? formatDuration(q.avg_time_secs) : '—'} · Dificuldade: {q.difficulty ?? '—'}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </ElevatedCard>
              ))}
            </div>
          )}
          </RevealItem>
        </RevealGroup>
      </div>

      {selectedQuestion && (
        <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[88vh] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Questão {selectedQuestion.position}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedQuestion.subject ?? 'Geral'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedQuestion(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[calc(88vh-80px)] p-5">
              <div>
                <div className="space-y-2">
                  <QuestionRichText
                    text={selectedQuestion.context || selectedQuestion.statement || 'Enunciado indisponível.'}
                    className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words"
                  />
                  {Array.isArray(selectedQuestion.images) && selectedQuestion.images.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedQuestion.images.map((img, idx) => {
                        const src = typeof img === 'string'
                          ? img
                          : (img?.url || img?.src || img?.file || '');
                        if (!src) return null;
                        return (
                          <img
                            key={`${src}-${idx}`}
                            src={src}
                            alt={`Imagem da questão ${selectedQuestion.position} #${idx + 1}`}
                            className="w-full max-h-[45vh] rounded-lg border border-slate-200 dark:border-slate-700 object-contain bg-slate-50 dark:bg-slate-800"
                          />
                        );
                      })}
                    </div>
                  )}
                  {Array.isArray(selectedQuestion.alternatives) && selectedQuestion.alternatives.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {selectedQuestion.alternatives.map((alt, idx) => {
                        const letter = alt.letter || alt.label || String.fromCharCode(65 + idx);
                        const imageSrc = alt.image || alt.file || null;
                        return (
                          <div key={`${letter}-${idx}`} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5">
                            <div className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words">
                              <span className="font-bold mr-1">{letter})</span>
                              <QuestionRichText text={alt.text || '—'} className="inline" />
                            </div>
                            {imageSrc && (
                              <img
                                src={imageSrc}
                                alt={`Alternativa ${letter}`}
                                className="mt-2 w-full max-h-[40vh] rounded-md border border-slate-200 dark:border-slate-700 object-contain bg-slate-50 dark:bg-slate-800"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-xs text-slate-500">Gabarito: {selectedQuestion.correct_option ?? '—'}</p>
                  <p className="text-xs text-slate-500">
                    Acerto: {selectedQuestion.accuracy_pct}% · Tempo médio: {selectedQuestion.avg_time_secs ? formatDuration(selectedQuestion.avg_time_secs) : '—'} · Dificuldade: {selectedQuestion.difficulty ?? '—'}
                  </p>
                  <div className="grid grid-cols-5 gap-2 pt-2">
                    {Object.entries(selectedQuestion.option_distribution).map(([opt, count]) => (
                      <div key={opt} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-center">
                        <p className="text-[10px] text-slate-500">{opt}</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{count}</p>
                      </div>
                    ))}
                  </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {weightsModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[88vh] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col">
            <div className="shrink-0 p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Configuração opcional</p>
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Pesos por área/matéria ({form.bank})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWeightsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
            {(WEIGHT_KEYS_BY_BANK[form.bank] ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">
                Esta banca não possui preset de pesos nesta tela.
              </p>
            ) : (
              <div className="space-y-4">
                {form.bank === 'UEG' && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Grupo de Pesos UEG</p>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(['I', 'II', 'III'] as const).map((grp) => (
                        <button
                          key={grp}
                          type="button"
                          onClick={() => setForm((f) => ({
                            ...f,
                            ueg_weight_group: grp,
                            weights: UEG_GROUP_PRESETS[grp],
                          }))}
                          className={`rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                            form.ueg_weight_group === grp
                              ? 'border-[var(--brand-primary)] text-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <p className="font-bold">Grupo {grp}</p>
                          <p className="mt-1 text-[10px] opacity-80 leading-relaxed">{UEG_GROUP_COURSES[grp]}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(WEIGHT_KEYS_BY_BANK[form.bank] ?? []).map((key) => (
                  <label key={key} className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 break-words">{key}</p>
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={form.weights?.[key] ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm((f) => ({
                          ...f,
                          weights: {
                            ...(f.weights || {}),
                            [key]: val === '' ? 0 : Number(val),
                          },
                        }));
                      }}
                      placeholder="Ex: 2.5"
                      className={`${inputCls} mt-1`}
                    />
                  </label>
                ))}
                </div>
              </div>
            )}
            </div>

            <div className="shrink-0 p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, weights: {} }))}
                className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Limpar pesos
              </button>
              <button
                type="button"
                onClick={() => setWeightsModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {showReviewApproval && (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Etapa final</p>
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">Revisar e aprovar simulado</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowReviewApproval(false); setNoQuestionsError(false); setDistributionShortfall(null); }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {saving ? (
              <div className="mt-4 space-y-3 animate-pulse">
                {form.same_for_all_students && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[var(--brand-primary)] animate-ping" />
                    {saveProgressLabel || 'Selecionando questões para a turma...'}
                  </div>
                )}
                {[80, 60, 70, 50, 65, 55].map((w, i) => (
                  <div key={i} className={`h-4 rounded-lg bg-slate-200 dark:bg-slate-700`} style={{ width: `${w}%` }} />
                ))}
              </div>
            ) : noQuestionsError ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                    Nenhuma questão encontrada para esse filtro
                  </p>
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                    A banca <strong>{BANK_LABELS[form.bank] ?? form.bank}</strong>
                    {form.subject ? `, matéria "${form.subject}"` : ''}, dificuldade{' '}
                    <strong>{DIFFICULTY_LABELS[form.difficulty] ?? form.difficulty}</strong> não retornou questões suficientes.
                  </p>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Quer preencher com questões de outro filtro ou automáticas?
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => { setNoQuestionsError(false); setShowReviewApproval(false); }}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Alterar filtros
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveWithAutoQuestions}
                    className="rounded-xl px-4 py-2 text-sm font-bold text-white"
                    style={{ backgroundColor: 'var(--brand-primary)' }}
                  >
                    Usar questões automáticas
                  </button>
                </div>
              </div>
            ) : distributionShortfall ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                    Questões insuficientes para a distribuição oficial
                  </p>
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                    O formato <strong>{FORMAT_LABELS[form.format] ?? form.format}</strong> ({BANK_LABELS[form.bank] ?? form.bank}) exige{' '}
                    <strong>{distributionShortfall.expected} questões</strong>, mas o banco tem apenas{' '}
                    <strong>{distributionShortfall.found}</strong> disponíveis com esses filtros.
                  </p>
                  {distributionShortfall.by_subject && Object.keys(distributionShortfall.by_subject).length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">Matérias com lacuna:</p>
                      {Object.entries(distributionShortfall.by_subject).map(([subj, counts]) => (
                        <div key={subj} className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
                          <span>{subj}</span>
                          <span className="font-semibold tabular-nums">
                            {counts.found}/{counts.expected}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Quer preencher com questões de outro filtro ou automáticas?
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => { setDistributionShortfall(null); setShowReviewApproval(false); }}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Alterar filtros
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveWithPartial}
                    className="rounded-xl px-4 py-2 text-sm font-bold text-white"
                    style={{ backgroundColor: 'var(--brand-primary)' }}
                  >
                    Criar com {distributionShortfall.found} questões disponíveis
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-2 text-sm">
                <p><span className="font-semibold">Título:</span> {form.title || '—'}</p>
                <p><span className="font-semibold">Banca:</span> {BANK_LABELS[form.bank] ?? form.bank}</p>
                <p><span className="font-semibold">Formato:</span> {FORMAT_LABELS[form.format] ?? form.format}</p>
                <p><span className="font-semibold">Questões:</span> {form.qty}</p>
                <p><span className="font-semibold">Dificuldade:</span> {DIFFICULTY_LABELS[form.difficulty] ?? form.difficulty}</p>
                <p><span className="font-semibold">Início:</span> {form.starts_at || '—'}</p>
                <p><span className="font-semibold">Fim:</span> {form.ends_at || '—'}</p>
                <p><span className="font-semibold">Refazer:</span> {form.allow_retry ? 'Permitido' : 'Desativado'}</p>
                <p><span className="font-semibold">Distribuição:</span> {form.same_for_all_students ? 'Mesmo simulado para todos' : 'Simulado individual por aluno'}</p>
                {form.bank === 'UEG' && (
                  <p><span className="font-semibold">Grupo UEG:</span> {form.ueg_weight_group ?? 'Não definido'}</p>
                )}
                {form.instructions?.trim() && (
                  <p><span className="font-semibold">Instruções:</span> {form.instructions.trim()}</p>
                )}
                {Object.keys(form.weights || {}).filter((k) => Number(form.weights?.[k]) > 0).length > 0 && (
                  <div className="pt-1">
                    <p className="font-semibold">Pesos aplicados:</p>
                    <div className="mt-1 space-y-1">
                      {Object.entries(form.weights || {})
                        .filter(([, v]) => Number(v) > 0)
                        .map(([k, v]) => (
                          <p key={k} className="text-xs text-slate-600 dark:text-slate-300">• {k}: {v}</p>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!saving && !noQuestionsError && (
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowReviewApproval(false); setNoQuestionsError(false); setDistributionShortfall(null); }}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
                >
                  Voltar para edição
                </button>
                <button
                  type="button"
                  onClick={() => deliveryMode === 'impressa' ? handleSaveImpresso() : handleSave()}
                  disabled={saving}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  {deliveryMode === 'impressa'
                    ? 'Gerar prova impressa'
                    : editingId ? 'Aprovar e salvar' : 'Aprovar e criar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </PartnerLayout>
  );
}
