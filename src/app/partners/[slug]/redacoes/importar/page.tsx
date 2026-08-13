'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { ESSAY_TYPE_CONFIGS, type EssayType } from '@/lib/essay-types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ArrowLeft, Upload, FileText, X, CheckCircle2, User, Search,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface StudentHit {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

type ImportStatus = 'corrected' | 'pending';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ESSAY_TYPES: { value: EssayType; label: string }[] = [
  { value: 'enem',   label: 'ENEM' },
  { value: 'ufu',    label: 'UFU' },
  { value: 'ueg',    label: 'UEG' },
  { value: 'fuvest', label: 'FUVEST' },
  { value: 'vunesp', label: 'VUNESP' },
  { value: 'geral',  label: 'Geral' },
];

const IMPORT_STATUS_OPTIONS: { value: ImportStatus; label: string }[] = [
  { value: 'corrected', label: 'Corrigida' },
  { value: 'pending',   label: 'Pendente de correção' },
];

function initCompetencyScores(type: EssayType): number[] {
  const comps = ESSAY_TYPE_CONFIGS[type]?.competencies ?? [];
  return comps.map(() => 0);
}

function makeEmptyForm() {
  return {
    theme: '',
    essayType: 'enem' as EssayType,
    historicalDate: '',
    totalScore: '',
    generalComment: '',
    importStatus: 'corrected' as ImportStatus,
    competencyScores: initCompetencyScores('enem'),
    file: null as File | null,
    selectedStudent: null as StudentHit | null,
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ImportarRedacaoPage() {
  const { org } = useOrg();

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState(makeEmptyForm);

  // Derived
  const typeConfig = ESSAY_TYPE_CONFIGS[form.essayType];
  const isGeral = form.essayType === 'geral';
  const hasCompetencies = !isGeral && typeConfig.competencies.length > 0;
  const showScores = form.importStatus === 'corrected';
  const maxScore = typeConfig.total_max;

  // ── Students select ────────────────────────────────────────────────────────
  const [students, setStudents] = useState<StudentHit[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const studentComboRef = useRef<HTMLDivElement>(null);

  // ── File ───────────────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);

  // When essay type changes, reset competency scores
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      competencyScores: initCompetencyScores(prev.essayType),
      totalScore: '',
    }));
  }, [form.essayType]);

  // Auto-compute total from competencies (corrected non-geral)
  useEffect(() => {
    if (!showScores || isGeral || !hasCompetencies) return;
    const sum = form.competencyScores.reduce((a, b) => a + b, 0);
    setForm((prev) => ({ ...prev, totalScore: String(sum) }));
  }, [form.competencyScores, showScores, isGeral, hasCompetencies]);

  // ── Students select ────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    async function loadStudents() {
      setStudentsLoading(true);
      try {
        const res = await fetch(`/api/partners/${org.slug}/students/select`, { cache: 'no-store' });
        const data = await res.json().catch(() => null) as { students?: StudentHit[]; error?: string } | null;
        if (!mounted) return;
        if (!res.ok) {
          throw new Error(data?.error || 'Não foi possível carregar alunos.');
        }
        setStudents(data?.students ?? []);
      } catch (err) {
        if (mounted) toast.error(err instanceof Error ? err.message : 'Não foi possível carregar alunos.');
      } finally {
        if (mounted) setStudentsLoading(false);
      }
    }
    void loadStudents();
    return () => {
      mounted = false;
    };
  }, [org.slug]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((student) => {
      const name = (student.full_name || '').toLowerCase();
      const email = (student.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [students, studentSearch]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [studentSearch, studentDropdownOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (studentComboRef.current && !studentComboRef.current.contains(e.target as Node)) {
        setStudentDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectStudent(student: StudentHit) {
    setForm((prev) => ({ ...prev, selectedStudent: student }));
    setStudentSearch('');
    setStudentDropdownOpen(false);
  }

  function clearStudent() {
    setForm((prev) => ({ ...prev, selectedStudent: null }));
    setStudentSearch('');
  }

  function handleStudentSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setStudentDropdownOpen(true);
      setHighlightedIndex((i) => Math.min(i + 1, filteredStudents.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const student = filteredStudents[highlightedIndex];
      if (student) selectStudent(student);
    } else if (e.key === 'Escape') {
      setStudentDropdownOpen(false);
    }
  }

  // ── File ───────────────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > 20 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo: 20 MB.');
      return;
    }
    setForm((prev) => ({ ...prev, file: f }));
  }

  function removeFile() {
    setForm((prev) => ({ ...prev, file: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.selectedStudent) {
      toast.error('Selecione um aluno.');
      return;
    }
    if (!form.theme.trim() || form.theme.trim().length < 3) {
      toast.error('Informe o tema da redação (mínimo 3 caracteres).');
      return;
    }

    if (showScores) {
      if (!isGeral && hasCompetencies) {
        const allFilled = form.competencyScores.every((s) => s >= 0);
        if (!allFilled) {
          toast.error('Preencha todas as notas por competência.');
          return;
        }
      } else {
        const scoreNum = parseInt(form.totalScore, 10);
        if (isNaN(scoreNum) || scoreNum < 0) {
          toast.error('Informe uma nota total válida (>= 0).');
          return;
        }
        if (scoreNum > maxScore) {
          toast.error(`Nota máxima para ${typeConfig.label} é ${maxScore}.`);
          return;
        }
      }
    }

    setSubmitting(true);

    const fd = new FormData();
    fd.append('student_id', form.selectedStudent.id);
    fd.append('theme', form.theme.trim());
    fd.append('essay_type', form.essayType);
    fd.append('status', form.importStatus);
    if (form.historicalDate) fd.append('historical_date', form.historicalDate);
    if (form.generalComment.trim()) fd.append('general_comment', form.generalComment.trim());

    if (showScores) {
      if (!isGeral && hasCompetencies) {
        const scores = typeConfig.competencies.map((_, i) => ({
          competency: i + 1,
          score: form.competencyScores[i] ?? 0,
        }));
        fd.append('competency_scores', JSON.stringify(scores));
        // total_score is computed server-side from competency sum
      } else if (isGeral) {
        fd.append('total_score', form.totalScore);
      }
    }

    if (form.file) fd.append('file', form.file);

    try {
      const res = await fetch(`/api/partners/${org.slug}/essays/import`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? 'Erro ao importar redação.');
        return;
      }
      toast.success('Redação importada com sucesso!');
      // Reset form and stay on page (bulk import flow)
      setForm(makeEmptyForm());
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const studentInitials = form.selectedStudent?.full_name
    ?.split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() ?? '';

  return (
    <ModuleGuard permKey="redacoes_enabled">
      <PartnerLayout>
        <div className="mx-auto max-w-2xl px-4 py-8">
          {/* Cabeçalho */}
          <div className="mb-8 flex items-center gap-3">
            <Link
              href={`/partners/${org.slug}/redacoes`}
              className="flex items-center justify-center rounded-xl border border-slate-200 p-2 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Importar Redação
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Registre uma redação física já corrigida anteriormente à plataforma.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ── Aluno ──────────────────────────────────────────────── */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Aluno
              </h2>
              {form.selectedStudent ? (
                <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-500/30 dark:bg-violet-500/10">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                    {studentInitials || <User className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                      {form.selectedStudent.full_name ?? '—'}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {form.selectedStudent.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearStudent}
                    className="rounded-lg p-1 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div ref={studentComboRef} className="space-y-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value);
                        setStudentDropdownOpen(true);
                      }}
                      onFocus={() => setStudentDropdownOpen(true)}
                      onKeyDown={handleStudentSearchKeyDown}
                      disabled={studentsLoading || students.length === 0}
                      placeholder={
                        studentsLoading
                          ? 'Carregando alunos...'
                          : students.length === 0
                            ? 'Nenhum aluno cadastrado'
                            : 'Buscar aluno por nome ou email...'
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                    />
                    {studentDropdownOpen && !studentsLoading && students.length > 0 && (
                      <div className="absolute z-10 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                        {filteredStudents.length === 0 ? (
                          <p className="px-4 py-3 text-sm text-slate-400 dark:text-slate-500">
                            Nenhum aluno encontrado para &quot;{studentSearch}&quot;.
                          </p>
                        ) : (
                          filteredStudents.map((student, i) => (
                            <button
                              key={student.id}
                              type="button"
                              onClick={() => selectStudent(student)}
                              onMouseEnter={() => setHighlightedIndex(i)}
                              className={cn(
                                'flex w-full flex-col items-start gap-0.5 px-4 py-2 text-left transition',
                                i === highlightedIndex && 'bg-violet-50 dark:bg-violet-500/10',
                              )}
                            >
                              <span className={cn(
                                'truncate text-sm font-medium',
                                i === highlightedIndex
                                  ? 'text-violet-700 dark:text-violet-300'
                                  : 'text-slate-800 dark:text-white',
                              )}>
                                {student.full_name || student.email || 'Aluno sem nome'}
                              </span>
                              {student.email && (
                                <span className="truncate text-xs text-slate-400 dark:text-slate-500">
                                  {student.email}
                                </span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {!studentsLoading && students.length > 0 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {studentSearch
                        ? `${filteredStudents.length} aluno${filteredStudents.length === 1 ? '' : 's'} encontrado${filteredStudents.length === 1 ? '' : 's'}.`
                        : `${students.length} aluno${students.length === 1 ? '' : 's'} cadastrado${students.length === 1 ? '' : 's'} — digite para buscar por nome ou email.`}
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* ── Detalhes da redação ────────────────────────────────── */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Detalhes
              </h2>
              <div className="space-y-4">
                {/* Tema */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Tema <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.theme}
                    onChange={(e) => setForm((prev) => ({ ...prev, theme: e.target.value }))}
                    placeholder="Ex.: A persistência da violência contra a mulher no Brasil"
                    maxLength={500}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                  />
                </div>

                {/* Tipo de vestibular + Data (mobile: stacked) */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Vestibular <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.essayType}
                      onChange={(e) => setForm((prev) => ({ ...prev, essayType: e.target.value as EssayType }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {ESSAY_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    {isGeral && (
                      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                        Use <strong>Geral</strong> para vestibulares não listados ou quando só há nota total disponível. Apenas a nota final será registrada.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Data da redação
                    </label>
                    <input
                      type="date"
                      value={form.historicalDate}
                      onChange={(e) => setForm((prev) => ({ ...prev, historicalDate: e.target.value }))}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Status da redação
                  </label>
                  <select
                    value={form.importStatus}
                    onChange={(e) => setForm((prev) => ({ ...prev, importStatus: e.target.value as ImportStatus }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {IMPORT_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* ── Notas (apenas quando corrigida) ───────────────────── */}
            {showScores && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Notas
                </h2>

                {/* Competências (obrigatórias para tipos não-geral) */}
                {hasCompetencies && (
                  <div className="mb-4 space-y-3">
                    {typeConfig.competencies.map((label, i) => {
                      const opts = typeConfig.score_options[i] ?? [];
                      return (
                        <div key={i} className="flex items-start gap-3">
                          <span className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                            {i + 1}
                          </span>
                          <p className="min-w-0 flex-1 break-words text-sm text-slate-700 dark:text-slate-300">
                            {label}
                          </p>
                          <select
                            value={form.competencyScores[i] ?? 0}
                            onChange={(e) => {
                              const updated = [...form.competencyScores];
                              updated[i] = parseInt(e.target.value, 10);
                              setForm((prev) => ({ ...prev, competencyScores: updated }));
                            }}
                            className="w-24 flex-shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          >
                            {opts.map((v) => (
                              <option key={v} value={v}>{v}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Nota total */}
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Nota total{isGeral && <span className="text-red-500"> *</span>}
                      <span className="ml-1.5 font-normal text-slate-400">(máx. {maxScore})</span>
                    </label>
                    <input
                      type="number"
                      value={form.totalScore}
                      onChange={(e) => setForm((prev) => ({ ...prev, totalScore: e.target.value }))}
                      readOnly={hasCompetencies}
                      min={0}
                      max={maxScore}
                      placeholder="0"
                      className={cn(
                        'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white',
                        hasCompetencies && 'cursor-not-allowed opacity-60',
                      )}
                    />
                    {hasCompetencies && (
                      <p className="mt-1 text-xs text-slate-400">Calculado automaticamente a partir das notas por competência.</p>
                    )}
                  </div>
                  {form.totalScore !== '' && !isNaN(parseInt(form.totalScore, 10)) && (
                    <div className="w-24 flex-shrink-0">
                      <div className="mb-1 text-right text-xs text-slate-400">
                        {Math.round((parseInt(form.totalScore, 10) / maxScore) * 100)}%
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <div
                          className="h-full rounded-full bg-violet-500 transition-all"
                          style={{ width: `${Math.min(100, (parseInt(form.totalScore, 10) / maxScore) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Comentário */}
                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Comentário geral{' '}
                    <span className="font-normal text-slate-400">(opcional)</span>
                  </label>
                  <textarea
                    value={form.generalComment}
                    onChange={(e) => setForm((prev) => ({ ...prev, generalComment: e.target.value }))}
                    placeholder="Observações gerais sobre a redação..."
                    rows={3}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                  />
                </div>
              </section>
            )}

            {/* ── Arquivo ────────────────────────────────────────────── */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Arquivo digitalizado
              </h2>
              <p className="mb-4 text-xs text-slate-400 dark:text-slate-500">
                Opcional — PDF, DOCX, DOC, JPEG, PNG ou WEBP. Máximo 20 MB.
              </p>

              {form.file ? (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                  <FileText className="h-5 w-5 flex-shrink-0 text-violet-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-white">{form.file.name}</p>
                    <p className="text-xs text-slate-400">{(form.file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="rounded-lg p-1 text-slate-400 transition hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-8 transition hover:border-violet-300 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-violet-500 dark:hover:bg-violet-500/10"
                >
                  <Upload className="h-6 w-6 text-slate-400" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Clique para selecionar o arquivo
                  </span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
            </section>

            {/* ── Ações (mobile: coluna invertida — Importar primeiro) ─ */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Link
                href={`/partners/${org.slug}/redacoes`}
                className="flex items-center justify-center rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={submitting || !form.selectedStudent}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition',
                  submitting || !form.selectedStudent
                    ? 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                    : 'bg-violet-600 text-white hover:bg-violet-700',
                )}
              >
                {submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Importando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Importar Redação
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </PartnerLayout>
    </ModuleGuard>
  );
}
