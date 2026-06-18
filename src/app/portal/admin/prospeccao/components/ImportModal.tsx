'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, AlertTriangle, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { apiStartImport, apiGetImportJob } from '../hooks/useLeads';
import type { ImportJob } from '../types';

const SEARCH_TERMS = [
  'cursinho pré-vestibular',
  'pré-vestibular vestibular',
  'cursinho vestibular',
];

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImportDone: () => void;
}

type Phase = 'config' | 'running' | 'done' | 'error';

export function ImportModal({ open, onClose, onImportDone }: ImportModalProps) {
  const [phase, setPhase] = useState<Phase>('config');
  const [job, setJob] = useState<ImportJob | null>(null);
  const [starting, setStarting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  useEffect(() => {
    return () => stopPolling();
  }, []);

  // Reset when modal reopens
  useEffect(() => {
    if (open) {
      setPhase('config');
      setJob(null);
      setStarting(false);
      stopPolling();
    }
  }, [open]);

  async function handleStart() {
    setStarting(true);
    try {
      const { job_id } = await apiStartImport(SEARCH_TERMS);
      setPhase('running');

      const poll = async () => {
        try {
          const updated = await apiGetImportJob(job_id);
          setJob(updated);
          if (updated.status === 'done') {
            stopPolling();
            setPhase('done');
            onImportDone();
          } else if (updated.status === 'error') {
            stopPolling();
            setPhase('error');
          }
        } catch {
          // Silently retry — don't abort polling on transient errors
        }
      };

      void poll();
      intervalRef.current = setInterval(() => void poll(), 3000);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao iniciar importação');
      setStarting(false);
    }
  }

  function handleClose() {
    if (phase === 'running') return; // Block close during import
    stopPolling();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)] rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <MapPin className="w-4 h-4 text-violet-500" />
            Importar via Google Maps
          </DialogTitle>
        </DialogHeader>

        {/* Config phase */}
        {phase === 'config' && (
          <div className="px-6 py-5 space-y-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-zinc-400 mb-2">
                Buscas no Google Maps
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SEARCH_TERMS.map((term) => (
                  <span
                    key={term}
                    className="rounded-full bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-300"
                  >
                    {term}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-2">
                Varredura em todos os 27 estados — até 100 resultados por busca/estado.
              </p>
            </div>

            <div className="flex gap-2.5 items-start rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-3.5 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <p className="font-semibold">Atenção antes de importar</p>
                <p>Serão consumidos créditos Apify (Google Maps Scraper).</p>
                <p>Leads já existentes na base <strong>não serão duplicados</strong>.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleStart}
                disabled={starting}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 disabled:opacity-50 transition-all"
              >
                {starting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Iniciando...</>
                ) : (
                  <><MapPin className="w-4 h-4" />Buscar no Google Maps</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Running phase */}
        {phase === 'running' && (
          <div className="px-6 py-8 space-y-5">
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-zinc-100">
                  Importando leads...
                </p>
                {job?.current_keyword && (
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    Varrendo: <span className="font-semibold text-violet-600 dark:text-violet-400">{job.current_keyword}</span>
                    {job.keywords_total > 0 && (
                      <> · keyword {job.keywords_done}/{job.keywords_total}</>
                    )}
                  </p>
                )}
              </div>
            </div>

            <Progress
              value={job?.progress_pct ?? 0}
              className="h-2"
            />

            {job && (
              <p className="text-center text-xs text-slate-400 dark:text-zinc-500">
                <span className="font-semibold text-slate-700 dark:text-zinc-200">{job.leads_found}</span> leads encontrados
              </p>
            )}

            <p className="text-[11px] text-center text-slate-400 dark:text-zinc-500">
              Não feche esta janela durante a importação
            </p>
          </div>
        )}

        {/* Done phase */}
        {phase === 'done' && job && (
          <div className="px-6 py-8 space-y-5">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10">
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-zinc-100">
                  Importação concluída
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{job.leads_imported}</span> leads importados
                  {job.leads_skipped > 0 && (
                    <> · <span className="font-semibold">{job.leads_skipped}</span> já existiam na base</>
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Error phase */}
        {phase === 'error' && (
          <div className="px-6 py-8 space-y-5">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-500/10">
                <XCircle className="w-7 h-7 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-zinc-100">
                  Erro na importação
                </p>
                {job?.error && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">{job.error}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleClose}
                className="flex-1 rounded-xl border border-slate-200 dark:border-zinc-700 py-2.5 text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => { setPhase('config'); setJob(null); }}
                className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700 py-2.5 text-sm font-semibold text-white transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
