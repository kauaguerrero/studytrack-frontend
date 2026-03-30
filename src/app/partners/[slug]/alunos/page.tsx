'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  UserPlus, Search, ChevronLeft, ChevronRight, ExternalLink,
  ArrowUpDown,
} from 'lucide-react';
import { toast } from 'sonner';

interface Student {
  id: string;
  full_name: string;
  email: string;
  plan_tier: string;
  last_activity_date: string | null;
  joined_organization_at: string | null;
  questions_today: number;
  questions_week: number;
  questions_month: number;
  simulados_month: number;
  accuracy_pct: number | null;
}

const PLAN_LABELS: Record<string, string> = {
  b2b_student: 'Básico',
  b2b_pro: 'Pro',
};

const PAGE_SIZE = 50;

type SortField = 'last_activity_date' | 'full_name' | 'joined_organization_at';

export default function AlunosPage() {
  const { org } = useOrg();
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [sort, setSort] = useState<SortField>('last_activity_date');
  const [removing, setRemoving] = useState<string | null>(null);
  const [updatingPlan, setUpdatingPlan] = useState<string | null>(null);

  const fetchStudents = useCallback(async (p: number, s: string, plan: string, sortField: SortField) => {
    setLoading(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    const params = new URLSearchParams({
      page: String(p),
      limit: String(PAGE_SIZE),
      sort: sortField,
      order: 'desc',
    });
    if (s) params.set('search', s);

    try {
      const res = await fetch(`${api}/api/partners/${org.slug}/students?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        let list: Student[] = data.students ?? [];
        if (plan !== 'all') list = list.filter((s) => s.plan_tier === plan);
        setStudents(list);
        setTotal(data.total ?? list.length);
      }
    } catch (err) {
      console.error('[Alunos] erro ao buscar:', err);
    } finally {
      setLoading(false);
    }
  }, [org.slug]);

  useEffect(() => {
    fetchStudents(page, search, planFilter, sort);
  }, [page, search, planFilter, sort, fetchStudents]);

  async function handlePlanChange(studentId: string, newPlan: string) {
    setUpdatingPlan(studentId);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    try {
      const res = await fetch(`${api}/api/partners/${org.slug}/students/${studentId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan_tier: newPlan }),
      });
      if (res.ok) {
        setStudents((prev) =>
          prev.map((s) => s.id === studentId ? { ...s, plan_tier: newPlan } : s)
        );
        toast.success('Plano atualizado.');
      } else {
        toast.error('Erro ao atualizar plano.');
      }
    } catch {
      toast.error('Erro de conexão.');
    } finally {
      setUpdatingPlan(null);
    }
  }

  async function handleRemove(studentId: string, name: string) {
    if (!confirm(`Remover "${name}" da organização? A conta do aluno não será deletada.`)) return;
    setRemoving(studentId);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    try {
      const res = await fetch(`${api}/api/partners/${org.slug}/students/${studentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        setStudents((prev) => prev.filter((s) => s.id !== studentId));
        setTotal((t) => t - 1);
        toast.success(`${name} removido da organização.`);
      } else {
        toast.error('Erro ao remover aluno.');
      }
    } catch {
      toast.error('Erro de conexão.');
    } finally {
      setRemoving(null);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <PartnerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Alunos</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {loading ? '...' : `${total} aluno${total !== 1 ? 's' : ''} cadastrado${total !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Button asChild style={{ backgroundColor: 'var(--brand-primary)' }} className="text-white gap-2">
            <Link href={`/partners/${org.slug}/alunos/convidar`}>
              <UserPlus className="h-4 w-4" />
              Adicionar Alunos
            </Link>
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nome..."
                  className="pl-9"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSearch(searchInput);
                      setPage(1);
                    }
                  }}
                  onBlur={() => {
                    setSearch(searchInput);
                    setPage(1);
                  }}
                />
              </div>
              <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filtrar plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os planos</SelectItem>
                  <SelectItem value="b2b_student">Básico</SelectItem>
                  <SelectItem value="b2b_pro">Pro</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(v) => { setSort(v as SortField); setPage(1); }}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_activity_date">Últ. atividade</SelectItem>
                  <SelectItem value="full_name">Nome A–Z</SelectItem>
                  <SelectItem value="joined_organization_at">Data de entrada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left text-xs text-slate-500">
                    <th className="px-4 py-3 font-medium">Aluno</th>
                    <th className="px-4 py-3 font-medium text-center">Plano</th>
                    <th className="px-4 py-3 font-medium text-center">Hoje</th>
                    <th className="px-4 py-3 font-medium text-center">Semana</th>
                    <th className="px-4 py-3 font-medium text-center">Mês</th>
                    <th className="px-4 py-3 font-medium text-center">Simulados</th>
                    <th className="px-4 py-3 font-medium text-center">Acertos%</th>
                    <th className="px-4 py-3 font-medium text-center">Últ. atividade</th>
                    <th className="px-4 py-3 font-medium text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    [...Array(8)].map((_, i) => (
                      <tr key={i}>
                        {[...Array(9)].map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <Skeleton className="h-4 w-full" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-400 text-sm">
                        {search ? `Nenhum aluno encontrado para "${search}".` : 'Nenhum aluno cadastrado ainda.'}
                      </td>
                    </tr>
                  ) : (
                    students.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900 dark:text-white">{s.full_name || '—'}</p>
                          <p className="text-xs text-slate-400">{s.email}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Select
                            value={s.plan_tier}
                            onValueChange={(v) => handlePlanChange(s.id, v)}
                            disabled={updatingPlan === s.id}
                          >
                            <SelectTrigger className="h-7 w-24 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="b2b_student">Básico</SelectItem>
                              <SelectItem value="b2b_pro">Pro</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3 text-center font-medium">{s.questions_today}</td>
                        <td className="px-4 py-3 text-center font-medium">{s.questions_week}</td>
                        <td className="px-4 py-3 text-center">{s.questions_month}</td>
                        <td className="px-4 py-3 text-center">{s.simulados_month}</td>
                        <td className="px-4 py-3 text-center">
                          {s.accuracy_pct != null ? (
                            <span className={s.accuracy_pct >= 60 ? 'text-emerald-600 font-medium' : 'text-rose-500 font-medium'}>
                              {s.accuracy_pct}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-slate-500">
                          {s.last_activity_date ?? 'Nunca'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                              <Link href={`/partners/${org.slug}/alunos/${s.id}`} title="Ver perfil">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              disabled={removing === s.id}
                              onClick={() => handleRemove(s.id, s.full_name)}
                              title="Remover da org"
                            >
                              ×
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-xs text-slate-500">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PartnerLayout>
  );
}
