'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { ESSAY_TYPE_CONFIGS, type EssayType } from '@/lib/essay-types';
import { ArrowLeft, Upload, FileText, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface ImportedEssay {
  id: string;
  theme: string | null;
  essay_type: string | null;
  status: string | null;
  total_score: number | null;
  submitted_at: string;
  historical_date: string | null;
  historical_file_url: string | null;
  student: { id: string; full_name: string | null; email: string | null } | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function essayTypeLabel(type: string | null): string {
  if (!type) return '—';
  return ESSAY_TYPE_CONFIGS[type as EssayType]?.label ?? type.toUpperCase();
}

export default function MinhasImportacoesPage() {
  const { org } = useOrg();
  const [essays, setEssays] = useState<ImportedEssay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/partners/${org.slug}/essays/my-imports`);
        if (!res.ok) throw new Error('Falha ao carregar importações.');
        const data = await res.json() as { essays: ImportedEssay[] };
        setEssays(data.essays ?? []);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao carregar importações.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [org.slug]);

  return (
    <ModuleGuard permKey="redacoes_enabled">
      <PartnerLayout>
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Link
              href={`/partners/${org.slug}/redacoes/importar`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Minhas Importações</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Redações históricas que você importou</p>
            </div>
            <div className="ml-auto">
              <Link
                href={`/partners/${org.slug}/redacoes/importar`}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Upload className="h-4 w-4" />
                Importar nova
              </Link>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Carregando...</div>
            ) : essays.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-12 text-center">
                <FileText className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma redação importada ainda.</p>
                <Link
                  href={`/partners/${org.slug}/redacoes/importar`}
                  className="mt-1 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Upload className="h-4 w-4" />
                  Importar redação
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {/* Table header — desktop */}
                <div className="hidden grid-cols-[1fr_8rem_6rem_5rem_3rem] gap-4 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 sm:grid">
                  <span>Aluno / Tema</span>
                  <span>Tipo</span>
                  <span>Data original</span>
                  <span>Nota</span>
                  <span />
                </div>
                {essays.map((essay) => (
                  <div
                    key={essay.id}
                    className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[1fr_8rem_6rem_5rem_3rem] sm:items-center sm:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {essay.student?.full_name ?? essay.student?.email ?? 'Aluno'}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {essay.theme ?? '—'}
                      </p>
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-300 sm:text-sm">
                      {essayTypeLabel(essay.essay_type)}
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      {formatDate(essay.historical_date)}
                    </span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {essay.total_score !== null && essay.total_score !== undefined ? essay.total_score : '—'}
                    </span>
                    <div className="flex items-center gap-1">
                      {essay.historical_file_url && (
                        <a
                          href={essay.historical_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                          title="Ver arquivo"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PartnerLayout>
    </ModuleGuard>
  );
}
