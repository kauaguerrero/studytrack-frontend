'use client';

// Turmas da escola (plano Cenas, fase 2): criar, renomear, arquivar e
// matricular alunos. Turma é arquivada, nunca apagada; cada aluno tem no
// máximo uma turma ativa.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Archive, ArchiveRestore, Loader2, Pencil, Plus, Search, Users, X } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { RevealGroup, RevealItem, ElevatedCard, SectionTitle, BrandButton } from '@/components/partners/founder-ui';
import {
  CLASS_GOAL_LABELS,
  classesFetch,
  useOrgClasses,
  type ClassGoal,
  type OrgClass,
} from '@/lib/org-classes';

interface StudentRow {
  id: string;
  full_name: string | null;
  email: string | null;
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
const labelCls = 'mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300';

function formatDate(iso: string | null) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

async function loadAllStudents(slug: string): Promise<StudentRow[]> {
  const out: StudentRow[] = [];
  for (let page = 1; page <= 30; page += 1) {
    const data = await classesFetch<{ students: StudentRow[]; total: number }>(
      slug, `/students?page=${page}&limit=100&sort=full_name&order=asc`);
    out.push(...(data.students ?? []));
    if (out.length >= (data.total ?? 0) || !(data.students ?? []).length) break;
  }
  return out;
}

function ClassForm({
  initial,
  saving,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<OrgClass>;
  saving: boolean;
  onSubmit: (data: { name: string; goal: ClassGoal; exam_date: string | null }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [goal, setGoal] = useState<ClassGoal>(initial?.goal ?? 'ENEM');
  const [examDate, setExamDate] = useState(initial?.exam_date ?? '');
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_180px_170px_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({ name: name.trim(), goal, exam_date: examDate || null });
      }}
    >
      <div>
        <label className={labelCls} htmlFor="class-name">Nome</label>
        <input id="class-name" className={inputCls} value={name} maxLength={60}
          onChange={(e) => setName(e.target.value)} placeholder="Ex: Pré-Med manhã" autoFocus />
      </div>
      <div>
        <label className={labelCls} htmlFor="class-goal">Objetivo</label>
        <select id="class-goal" className={inputCls} value={goal} onChange={(e) => setGoal(e.target.value as ClassGoal)}>
          {(Object.keys(CLASS_GOAL_LABELS) as ClassGoal[]).map((g) => (
            <option key={g} value={g}>{CLASS_GOAL_LABELS[g]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls} htmlFor="class-exam">Data da prova</label>
        <input id="class-exam" type="date" className={inputCls} value={examDate}
          onChange={(e) => setExamDate(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="rounded-full border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
          Cancelar
        </button>
        <BrandButton type="submit" disabled={saving || !name.trim()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
        </BrandButton>
      </div>
    </form>
  );
}

export default function TurmasPage() {
  const { org } = useOrg();
  const slug = org.slug;
  const [showArchived, setShowArchived] = useState(false);
  const { classes, loading, error, reload } = useOrgClasses(slug, { includeArchived: showArchived, enabled: !org.is_mock });
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [movingId, setMovingId] = useState<string | null>(null);

  const activeClasses = useMemo(() => classes.filter((c) => !c.archived_at), [classes]);

  const loadStudents = useCallback(async () => {
    if (org.is_mock) { setStudentsLoading(false); return; }
    setStudentsLoading(true);
    try {
      const [list, asg] = await Promise.all([
        loadAllStudents(slug),
        classesFetch<{ assignments: Record<string, string> }>(slug, '/classes/assignments'),
      ]);
      setStudents(list);
      setAssignments(asg.assignments ?? {});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar alunos.');
    } finally {
      setStudentsLoading(false);
    }
  }, [slug, org.is_mock]);

  useEffect(() => { void loadStudents(); }, [loadStudents]);

  async function saveClass(data: { name: string; goal: ClassGoal; exam_date: string | null }, id?: string) {
    setSaving(true);
    try {
      await classesFetch(slug, id ? `/classes/${id}` : '/classes', {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(data),
      });
      toast.success(id ? 'Turma atualizada' : 'Turma criada');
      setCreating(false);
      setEditingId(null);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar turma.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleArchive(c: OrgClass) {
    const archiving = !c.archived_at;
    if (archiving && !window.confirm(
      `Arquivar "${c.name}"? Os ${c.student_count ?? 0} alunos saem da turma (o histórico fica guardado).`)) return;
    try {
      await classesFetch(slug, `/classes/${c.id}/${archiving ? 'archive' : 'unarchive'}`, { method: 'POST' });
      toast.success(archiving ? 'Turma arquivada' : 'Turma reativada');
      await Promise.all([reload(), archiving ? loadStudents() : Promise.resolve()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao arquivar turma.');
    }
  }

  async function moveStudent(studentId: string, classId: string) {
    setMovingId(studentId);
    try {
      if (classId) {
        await classesFetch(slug, `/classes/${classId}/members`, {
          method: 'POST', body: JSON.stringify({ user_ids: [studentId] }),
        });
      } else {
        await classesFetch(slug, '/classes/members/remove', {
          method: 'POST', body: JSON.stringify({ user_ids: [studentId] }),
        });
      }
      setAssignments((prev) => {
        const next = { ...prev };
        if (classId) next[studentId] = classId;
        else delete next[studentId];
        return next;
      });
      void reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao mover aluno.');
    } finally {
      setMovingId(null);
    }
  }

  const visibleStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return students.filter((s) => {
      const current = assignments[s.id] ?? '';
      if (filterClass === 'none' && current) return false;
      if (filterClass !== 'all' && filterClass !== 'none' && current !== filterClass) return false;
      if (!term) return true;
      return (s.full_name ?? '').toLowerCase().includes(term) || (s.email ?? '').toLowerCase().includes(term);
    });
  }, [students, assignments, search, filterClass]);

  const withoutClass = students.filter((s) => !assignments[s.id]).length;

  return (
    <PartnerLayout variant="founder">
      <div className="min-h-full -mx-4 -mt-4 px-4 pt-4 pb-10 md:-mx-8 md:-mt-8 md:px-8 md:pt-8">
        <RevealGroup className="mx-auto max-w-5xl space-y-5">
          <RevealItem>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">Turmas</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Separe os alunos por turma para mandar simulados, avisos e materiais só para quem precisa.
                </p>
              </div>
              {!creating && (
                <BrandButton hex={org.brand_primary} onClick={() => { setCreating(true); setEditingId(null); }}>
                  <Plus className="h-4 w-4" /> Nova turma
                </BrandButton>
              )}
            </div>
          </RevealItem>

          {creating && (
            <RevealItem>
              <ElevatedCard className="p-4">
                <ClassForm saving={saving} onSubmit={(d) => void saveClass(d)} onCancel={() => setCreating(false)} />
              </ElevatedCard>
            </RevealItem>
          )}

          <RevealItem>
            <SectionTitle
              kicker="Turmas"
              title={showArchived ? 'Todas as turmas' : 'Turmas ativas'}
              hex={org.brand_primary}
              action={(
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
                  Mostrar arquivadas
                </label>
              )}
            />
            {loading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando turmas…</div>
            ) : error && !classes.length ? (
              <p className="py-6 text-sm text-slate-500">{error}</p>
            ) : !classes.length ? (
              <ElevatedCard className="p-6 text-center">
                <Users className="mx-auto h-6 w-6 text-slate-400" />
                <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Nenhuma turma ainda</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Sem turmas, todo conteúdo vale para todos os alunos da escola.
                </p>
              </ElevatedCard>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {classes.map((c) => (
                  <ElevatedCard key={c.id} className={`p-4 ${c.archived_at ? 'opacity-60' : ''}`}>
                    {editingId === c.id ? (
                      <ClassForm initial={c} saving={saving}
                        onSubmit={(d) => void saveClass(d, c.id)} onCancel={() => setEditingId(null)} />
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-bold text-slate-900 dark:text-white">{c.name}</p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {CLASS_GOAL_LABELS[c.goal]}
                            {c.exam_date ? ` · prova em ${formatDate(c.exam_date)}` : ''}
                            {c.archived_at ? ' · arquivada' : ''}
                          </p>
                          <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {c.student_count ?? 0} {c.student_count === 1 ? 'aluno' : 'alunos'}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {!c.archived_at && (
                            <button type="button" aria-label={`Editar ${c.name}`} onClick={() => { setEditingId(c.id); setCreating(false); }}
                              className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          <button type="button" aria-label={c.archived_at ? `Reativar ${c.name}` : `Arquivar ${c.name}`}
                            onClick={() => void toggleArchive(c)}
                            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                            {c.archived_at ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </ElevatedCard>
                ))}
              </div>
            )}
          </RevealItem>

          {activeClasses.length > 0 && (
            <RevealItem>
              <SectionTitle kicker="Alunos" title="Quem está em cada turma" hex={org.brand_primary} />
              <ElevatedCard className="p-4">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input className={`${inputCls} pl-9`} placeholder="Buscar aluno por nome ou e-mail"
                      value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar aluno" />
                    {search && (
                      <button type="button" aria-label="Limpar busca" onClick={() => setSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400"><X className="h-4 w-4" /></button>
                    )}
                  </div>
                  <select className={`${inputCls} sm:w-56`} value={filterClass} onChange={(e) => setFilterClass(e.target.value)}
                    aria-label="Filtrar por turma">
                    <option value="all">Todos os alunos</option>
                    <option value="none">Sem turma ({withoutClass})</option>
                    {activeClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <p className="mb-2 text-[11px] text-slate-500 dark:text-slate-400">
                  Para importar vários de uma vez, use a coluna <strong>turma</strong> no CSV de Adicionar Alunos.
                </p>
                {studentsLoading ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando alunos…</div>
                ) : !visibleStudents.length ? (
                  <p className="py-4 text-sm text-slate-500">Nenhum aluno encontrado.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {visibleStudents.map((s) => (
                      <li key={s.id} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{s.full_name || 'Sem nome'}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{s.email}</p>
                        </div>
                        <div className="flex items-center gap-2 sm:w-56">
                          {movingId === s.id && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />}
                          <select className={inputCls} value={assignments[s.id] ?? ''} disabled={movingId === s.id}
                            onChange={(e) => void moveStudent(s.id, e.target.value)}
                            aria-label={`Turma de ${s.full_name || s.email}`}>
                            <option value="">Sem turma</option>
                            {activeClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </ElevatedCard>
            </RevealItem>
          )}
        </RevealGroup>
      </div>
    </PartnerLayout>
  );
}
