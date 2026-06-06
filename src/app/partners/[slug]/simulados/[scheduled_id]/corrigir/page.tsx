'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import {
  Upload, ChevronLeft, CheckCircle2, AlertCircle,
  Loader2, UserCheck, User, RotateCcw, ClipboardList, AlertTriangle,
  PartyPopper, ArrowRight,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
type Step = 'upload' | 'review' | 'student';

interface StudentOption {
  id: string;
  full_name: string | null;
}

interface SuccessData {
  score: number;
  total: number;
  studentName: string;
  submissionId: string;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;
type Letter = typeof LETTERS[number];

const SLIDE = {
  initial:    { opacity: 0, x: 32 },
  animate:    { opacity: 1, x: 0 },
  exit:       { opacity: 0, x: -32 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
};

function scoreColor(pct: number) {
  if (pct >= 70) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-500 dark:text-red-400';
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function CorrigirGabaritoPage() {
  const { slug, scheduled_id } = useParams<{ slug: string; scheduled_id: string }>();
  const router = useRouter();

  const [step, setStep] = useState<Step>('upload');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [printedExamId, setPrintedExamId] = useState<string | null>(null);
  const [readingLoading, setReadingLoading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);

  // Step 2 — answers
  const [answers, setAnswers] = useState<Record<string, Letter | null>>({});
  const [totalQuestions, setTotalQuestions] = useState(0);

  // Step 3 — student
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [isExternal, setIsExternal] = useState(false);
  const [externalName, setExternalName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Success screen
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Auth helper ──
  async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? '';
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
    const isMultipart = options.body instanceof FormData;
    return fetch(`${api}${url}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(!isMultipart ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers ?? {}),
      },
    });
  }

  // ── Resolve printed_exam_id on mount ──
  useEffect(() => {
    if (!scheduled_id) return;
    const stored = sessionStorage.getItem(`printed_exam_id:${scheduled_id}`);
    if (stored) {
      setPrintedExamId(stored);
    } else {
      void createPrintedExam();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduled_id]);

  async function createPrintedExam() {
    try {
      const simRes = await fetchWithAuth(`/api/partners/${slug}/scheduled-simulados`);
      if (!simRes.ok) return;
      const simData = await simRes.json();
      const sim = (simData.scheduled_simulados ?? []).find(
        (s: { id: string }) => s.id === scheduled_id,
      );
      if (!sim) return;

      const createRes = await fetchWithAuth(`/api/partners/${slug}/printed-exams`, {
        method: 'POST',
        body: JSON.stringify({
          title: sim.title,
          config: sim.config,
          scheduled_simulado_id: scheduled_id,
        }),
      });
      if (!createRes.ok) return;
      const { printed_exam_id } = await createRes.json();
      if (printed_exam_id) {
        setPrintedExamId(printed_exam_id);
        sessionStorage.setItem(`printed_exam_id:${scheduled_id}`, printed_exam_id);
        setTotalQuestions(sim.config?.qty ?? 0);
      }
    } catch {
      // silently fail — user will see error when trying to read
    }
  }

  // ── Load students ──
  useEffect(() => {
    if (step !== 'student' || students.length > 0) return;
    void loadStudents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function loadStudents() {
    setStudentsLoading(true);
    try {
      const res = await fetchWithAuth(`/api/partners/${slug}/students`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students ?? data.alunos ?? []);
      }
    } catch {
      // non-critical
    } finally {
      setStudentsLoading(false);
    }
  }

  // ── Image selection ──
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setReadError(null);
  }

  // ── Step 1 → Step 2: call read-gabarito ──
  async function handleReadGabarito() {
    if (!imageFile || !printedExamId) {
      toast.error('Selecione uma imagem antes de continuar');
      return;
    }
    setReadingLoading(true);
    setReadError(null);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      const res = await fetchWithAuth(
        `/api/partners/${slug}/printed-exams/${printedExamId}/read-gabarito`,
        { method: 'POST', body: formData },
      );
      const data = await res.json();
      if (!res.ok) {
        setReadError(data.error ?? 'Não foi possível ler o gabarito.');
        return;
      }
      const raw: Record<string, string | null> = data.answers ?? {};
      const parsed: Record<string, Letter | null> = {};
      const keys = Object.keys(raw).sort((a, b) => Number(a) - Number(b));
      for (const k of keys) {
        const v = raw[k];
        parsed[k] = (v && LETTERS.includes(v as Letter)) ? (v as Letter) : null;
      }
      setAnswers(parsed);
      setTotalQuestions(keys.length || totalQuestions);
      setStep('review');
    } catch {
      setReadError('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setReadingLoading(false);
    }
  }

  // ── Step 3: submit result ──
  async function handleLancarNota() {
    if (!printedExamId) return;
    if (!isExternal && !selectedStudent) {
      toast.error('Selecione um aluno ou ative a opção de aluno externo');
      return;
    }
    if (isExternal && !externalName.trim()) {
      toast.error('Informe o nome do aluno externo');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetchWithAuth(
        `/api/partners/${slug}/printed-exams/${printedExamId}/results`,
        {
          method: 'POST',
          body: JSON.stringify({
            answers,
            student_id:    isExternal ? null : selectedStudent?.id,
            external_name: isExternal ? externalName.trim() : null,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Erro ao lançar nota');
        return;
      }
      const sub = data.submission ?? {};
      setSuccessData({
        score:        sub.score  ?? 0,
        total:        sub.total_questions ?? Object.keys(answers).length,
        studentName:  isExternal ? externalName.trim() : (selectedStudent?.full_name ?? 'Aluno'),
        submissionId: sub.id ?? '',
      });
    } catch {
      toast.error('Erro de conexão ao lançar nota');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCorrigirProximo() {
    setSuccessData(null);
    setStep('upload');
    setImageFile(null);
    setImagePreview(null);
    setAnswers({});
    setSelectedStudent(null);
    setExternalName('');
    setIsExternal(false);
    setStudentSearch('');
  }

  // ── Derived ──
  const filteredStudents = students.filter((s) =>
    !studentSearch.trim() ||
    (s.full_name ?? '').toLowerCase().includes(studentSearch.toLowerCase()),
  );
  const nullCount    = Object.values(answers).filter((v) => v === null).length;
  const answeredCount = Object.values(answers).filter((v) => v !== null).length;
  const totalCount   = totalQuestions || Object.keys(answers).length;

  // ── Success screen ─────────────────────────────────────────────────────────
  if (successData) {
    const pct = totalCount > 0 ? Math.round((successData.score / successData.total) * 100) : 0;
    return (
      <PartnerLayout>
        <div className="min-h-full -mx-4 -mt-4 px-4 pt-4 pb-10 md:-mx-8 md:-mt-8 md:px-8 md:pt-8 flex items-center justify-center">
          <motion.div
            className="w-full max-w-md"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="space-y-5 rounded-3xl border border-emerald-200 bg-white p-5 text-center shadow-xl dark:border-emerald-700/40 dark:bg-slate-900 sm:p-8">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 18 }}
                className="flex justify-center"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                  <PartyPopper className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
              </motion.div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">
                  Nota Lançada
                </p>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {successData.studentName}
                </h2>
              </div>

              <div className="flex flex-col items-center justify-center gap-4 py-2 sm:flex-row sm:gap-6">
                <div className="text-center">
                  <p className={`text-4xl font-black tabular-nums ${scoreColor(pct)}`}>
                    {successData.score}<span className="text-xl text-slate-400">/{successData.total}</span>
                  </p>
                  <p className="text-xs font-semibold text-slate-400 mt-1">Acertos</p>
                </div>
                <div className="h-10 w-px bg-slate-200 dark:bg-slate-700" />
                <div className="text-center">
                  <p className={`text-4xl font-black tabular-nums ${scoreColor(pct)}`}>{pct}%</p>
                  <p className="text-xs font-semibold text-slate-400 mt-1">Aproveitamento</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCorrigirProximo}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition hover:brightness-110"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  <RotateCcw className="h-4 w-4" /> Corrigir próximo
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/partners/${slug}/simulados/${scheduled_id}/resultados`)}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ArrowRight className="h-4 w-4" /> Ver todos os resultados
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </PartnerLayout>
    );
  }

  // ── Main wizard ────────────────────────────────────────────────────────────
  return (
    <PartnerLayout>
      <div className="min-h-full -mx-4 -mt-4 px-4 pt-4 pb-10 md:-mx-8 md:-mt-8 md:px-8 md:pt-8">
        {/* Header */}
        <div className="mb-6 flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push(`/partners/${slug}/simulados`)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--brand-primary)]">
              Correção por Câmera
            </p>
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-white sm:text-xl">
              Lançar Nota — Gabarito Impresso
            </h1>
          </div>
        </div>

        {/* Step indicator */}
        <div className="mb-6 flex w-full items-center overflow-x-auto pb-1">
          {(['upload', 'review', 'student'] as Step[]).map((s, i) => (
            <div key={s} className="flex shrink-0 items-center gap-2">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-extrabold transition-colors sm:h-7 sm:w-7 ${
                  step === s
                    ? 'bg-[var(--brand-primary)] text-white'
                    : s === 'upload' || (s === 'review' && step === 'student')
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                }`}
              >
                {(step === 'review' && s === 'upload') || (step === 'student' && s !== 'student') ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              <span className={`hidden text-xs font-semibold sm:block ${step === s ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                {s === 'upload' ? 'Foto' : s === 'review' ? 'Revisar' : 'Aluno'}
              </span>
              {i < 2 && <div className="h-px w-6 bg-slate-200 dark:bg-slate-700" />}
            </div>
          ))}
        </div>

        <div className="max-w-2xl">
          <AnimatePresence mode="wait">

            {/* ── STEP 1: UPLOAD ──────────────────────────────────────────── */}
            {step === 'upload' && (
              <motion.div key="upload" {...SLIDE} className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5">
                  <p className="mb-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                    Fotografe o gabarito preenchido pelo aluno
                  </p>
                  <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                    Certifique-se de que as bolhas estão nítidas e bem iluminadas.
                  </p>

                  {imagePreview ? (
                    <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagePreview} alt="Gabarito" className="w-full object-contain max-h-72" />
                      <button
                        type="button"
                        onClick={() => { setImageFile(null); setImagePreview(null); setReadError(null); }}
                      className="absolute right-2 top-2 flex min-h-11 items-center gap-1.5 rounded-lg bg-white/90 px-3 py-2 text-xs font-semibold text-slate-600 shadow transition-colors hover:bg-white dark:bg-slate-800/90 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <RotateCcw className="h-3 w-3" /> Trocar foto
                      </button>
                    </div>
                  ) : (
                    <div
                      className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 transition hover:border-[var(--brand-primary)] dark:border-slate-600 dark:bg-slate-800/40 sm:min-h-[220px] sm:p-8"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); setReadError(null); }
                      }}
                    >
                      <Upload className="h-8 w-8 text-slate-300 dark:text-slate-500" />
                      <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                        Arraste a foto aqui ou clique para selecionar
                      </p>
                    </div>
                  )}

                  {/* Botão de seleção */}
                  <div className="mt-4">
                    <input ref={fileInputRef}   type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Upload className="h-4 w-4" /> Selecionar arquivo
                    </button>
                  </div>

                  {readError && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-3">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                      <p className="text-sm text-red-700 dark:text-red-300">{readError}</p>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleReadGabarito}
                  disabled={!imageFile || readingLoading}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  {readingLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Lendo gabarito com IA...</>
                  ) : (
                    <><ClipboardList className="h-4 w-4" /> Ler Gabarito</>
                  )}
                </button>
              </motion.div>
            )}

            {/* ── STEP 2: REVIEW ──────────────────────────────────────────── */}
            {step === 'review' && (
              <motion.div key="review" {...SLIDE} className="space-y-0">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Revise as respostas lidas</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Corrija manualmente qualquer leitura incorreta antes de continuar.
                      </p>
                    </div>
                    {nullCount > 0 && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                        <AlertTriangle className="h-3 w-3" />
                        {nullCount} ilegível{nullCount > 1 ? 'is' : ''}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {Array.from({ length: totalQuestions || Object.keys(answers).length }, (_, i) => {
                      const key = String(i + 1);
                      const val = answers[key] ?? null;
                      const isNull = val === null;
                      return (
                        <div
                          key={key}
                          className={`rounded-xl border p-2 ${isNull ? 'border-amber-300 bg-amber-50/50 dark:border-amber-500/50 dark:bg-amber-500/10' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                              Q{key}
                            </p>
                            {isNull && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                          </div>
                          <div className="grid grid-cols-5 gap-1">
                            {LETTERS.map((l) => (
                              <button
                                key={l}
                                type="button"
                                onClick={() => setAnswers((prev) => ({ ...prev, [key]: l }))}
                                className={`flex h-11 min-w-0 items-center justify-center rounded-md text-xs font-extrabold transition-colors sm:h-8 ${
                                  val === l
                                    ? 'text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                                style={val === l ? { backgroundColor: 'var(--brand-primary)' } : {}}
                              >
                                {l}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sticky footer on mobile */}
                <div className="sticky bottom-0 -mx-4 border-t border-slate-100 bg-white/95 px-4 pb-2 pt-3 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95 sm:static sm:mx-0 sm:mt-4 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:backdrop-blur-none dark:sm:bg-transparent">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setStep('upload')}
                      className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <ChevronLeft className="h-4 w-4" /> Refazer foto
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep('student')}
                      className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
                      style={{ backgroundColor: 'var(--brand-primary)' }}
                    >
                      Confirmar Respostas <ChevronLeft className="h-4 w-4 rotate-180" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: STUDENT ─────────────────────────────────────────── */}
            {step === 'student' && (
              <motion.div key="student" {...SLIDE} className="space-y-4">
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Selecione o aluno</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Associe este resultado a um aluno cadastrado ou informe um nome externo.
                    </p>
                  </div>

                  {/* Toggle externo — pill style */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!isExternal}
                      onClick={() => { setIsExternal(false); setExternalName(''); }}
                      className={`flex min-h-11 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-colors ${!isExternal ? 'text-white shadow' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                      style={!isExternal ? { backgroundColor: 'var(--brand-primary)' } : {}}
                    >
                      <UserCheck className="h-3.5 w-3.5" /> Aluno cadastrado
                    </button>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isExternal}
                      onClick={() => { setIsExternal(true); setSelectedStudent(null); }}
                      className={`flex min-h-11 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-colors ${isExternal ? 'text-white shadow' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                      style={isExternal ? { backgroundColor: 'var(--brand-primary)' } : {}}
                    >
                      <User className="h-3.5 w-3.5" /> Aluno externo
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {isExternal ? (
                      <motion.div key="external" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                        <input
                          value={externalName}
                          onChange={(e) => setExternalName(e.target.value)}
                          placeholder="Nome completo do aluno externo"
                          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--brand-primary)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </motion.div>
                    ) : (
                      <motion.div key="internal" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2">
                        <input
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          placeholder="Buscar aluno pelo nome..."
                          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--brand-primary)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                        {studentsLoading ? (
                          <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando alunos...
                          </div>
                        ) : (
                          <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredStudents.length === 0 ? (
                              <p className="px-3 py-3 text-xs text-slate-400">Nenhum aluno encontrado.</p>
                            ) : filteredStudents.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => setSelectedStudent(s)}
                                className={`flex min-h-11 w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${selectedStudent?.id === s.id ? 'bg-slate-50 dark:bg-slate-800/80' : ''}`}
                              >
                                <div
                                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${selectedStudent?.id === s.id ? 'text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                                  style={selectedStudent?.id === s.id ? { backgroundColor: 'var(--brand-primary)' } : {}}
                                >
                                  {selectedStudent?.id === s.id ? <UserCheck className="h-3.5 w-3.5" /> : (s.full_name ?? 'A').charAt(0).toUpperCase()}
                                </div>
                                <span className="truncate font-medium text-slate-900 dark:text-slate-100">
                                  {s.full_name ?? 'Aluno sem nome'}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Resumo das respostas */}
                <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Respostas confirmadas
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-extrabold tabular-nums text-slate-900 dark:text-white">
                      {answeredCount}/{totalCount}
                    </span>
                    {nullCount > 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="h-2.5 w-2.5" /> {nullCount} em branco
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setStep('review')}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="h-4 w-4" /> Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleLancarNota}
                    disabled={submitting || (!isExternal && !selectedStudent) || (isExternal && !externalName.trim())}
                    className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                    style={{ backgroundColor: 'var(--brand-primary)' }}
                  >
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Lançando...</>
                    ) : (
                      <><CheckCircle2 className="h-4 w-4" /> Lançar Nota</>
                    )}
                  </button>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => router.push(`/partners/${slug}/simulados`)}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-xs font-semibold text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    Ver todos os resultados
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PartnerLayout>
  );
}
