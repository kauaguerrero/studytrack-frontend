'use client';

import React, { useState, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { reportError } from '@/lib/reportError';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export type ReportErrorCategory =
  | 'estrutural'
  | 'conteudo'
  | 'resposta'
  | 'outro';

const CATEGORY_OPTIONS: { label: string; value: ReportErrorCategory }[] = [
  { label: 'Erro no enunciado', value: 'conteudo' },
  { label: 'Resposta incorreta', value: 'resposta' },
  { label: 'Problema de formatação', value: 'estrutural' },
  { label: 'Imagens mal formatadas', value: 'estrutural' },
  { label: 'Outro', value: 'outro' },
];

const MAX_DESCRIPTION = 2000;

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionId: string;
  authToken: string | null;
  questionSnapshot?: unknown;
  onSuccess?: () => void;
}

function compactQuestionSnapshot(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return snapshot ?? null;
  }

  const source = snapshot as Record<string, unknown>;
  return {
    id: source.id ?? null,
    external_id: source.external_id ?? null,
    subject: source.subject ?? null,
    discipline: source.discipline ?? null,
    exam_year: source.exam_year ?? null,
    difficulty: source.difficulty ?? null,
    bank: source.bank ?? null,
    context: source.context ?? null,
    statement: source.statement ?? source.alternatives_intro ?? null,
    images: source.images ?? null,
    correct_option: source.correct_option ?? source.correct_alternative ?? null,
    alternatives: Array.isArray(source.alternatives)
      ? source.alternatives.map((alternative) => {
          if (!alternative || typeof alternative !== 'object') return alternative;
          const alt = alternative as Record<string, unknown>;
          return {
            letter: alt.letter ?? alt.label ?? null,
            text: alt.text ?? null,
            image: alt.image ?? alt.file ?? null,
          };
        })
      : null,
  };
}

function buildTechnicalContext(questionSnapshot: unknown, pathname: string, searchParams: ReturnType<typeof useSearchParams>) {
  const query = searchParams.toString();
  const route = query ? `${pathname}?${query}` : pathname;
  const element = document.documentElement;
  const resolvedTheme = element.classList.contains('dark') ? 'dark' : 'light';

  return {
    route,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
    },
    userAgent: navigator.userAgent,
    theme: {
      resolved: resolvedTheme,
      preferredColorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    },
    payload_snapshot: compactQuestionSnapshot(questionSnapshot),
  };
}

export function ReportDialog({
  open,
  onOpenChange,
  questionId,
  authToken,
  questionSnapshot,
  onSuccess,
}: ReportDialogProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState<ReportErrorCategory | null>(null);
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep(1);
    setCategory(null);
    setDescription('');
    setError(null);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) reset();
      onOpenChange(next);
    },
    [onOpenChange, reset]
  );

  const handleCategorySelect = (value: ReportErrorCategory) => {
    setCategory(value);
    setError(null);
    setStep(2);
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!category || !authToken) {
      setError('Sessão inválida. Faça login novamente.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
      const res = await fetch(`${apiUrl}/api/questions/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          question_id: questionId,
          error_category: category,
          description: description.trim() || undefined,
          technical_context: buildTechnicalContext(questionSnapshot, pathname, searchParams),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          (data as { error?: string }).error ||
            (res.status === 429
              ? 'Muitos reports. Tente novamente em alguns minutos.'
              : res.status === 409
                ? 'Você já reportou esta questão.'
                : 'Não foi possível enviar. Tente novamente.')
        );
        setIsLoading(false);
        return;
      }

      setStep(3);
      toast.success('Report enviado! Obrigado por contribuir.');
      onSuccess?.();
    } catch (err) {
      void reportError("ReportDialogError", String(err));
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-2xl border-slate-200 shadow-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-900">
            {step === 1 && 'Qual o tipo de erro?'}
            {step === 2 && 'Detalhes (opcional)'}
            {step === 3 && 'Report enviado'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Selecione a opção que melhor descreve o problema.'}
            {step === 2 && 'Adicione mais informações para nos ajudar a corrigir.'}
            {step === 3 && 'Obrigado! Nossa equipe vai analisar em breve.'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="grid gap-2 py-2">
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={`${opt.value}-${opt.label}`}
                type="button"
                onClick={() => handleCategorySelect(opt.value)}
                className="flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-4 text-left font-medium text-slate-700 transition-all hover:border-blue-300 hover:bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <AlertCircle className="h-5 w-5 shrink-0 text-slate-400" />
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <Textarea
              placeholder="Ex.: Na alternativa B, o texto está cortado..."
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
              rows={4}
              className="resize-none rounded-xl border-slate-200 bg-slate-50/50 text-slate-800 placeholder:text-slate-400"
              disabled={isLoading}
            />
            <p className="text-xs text-slate-400">
              {description.length}/{MAX_DESCRIPTION}
            </p>
            {error && (
              <p className="flex items-center gap-2 text-sm text-red-600" role="alert">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-xl border-slate-200"
                onClick={handleBack}
                disabled={isLoading}
              >
                Voltar
              </Button>
              <Button
                type="button"
                className="flex-[2] rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar report'
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center py-6">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <p className="text-center text-slate-600">
              Seu report foi registrado. A questão será revisada pela nossa equipe.
            </p>
            <Button
              type="button"
              className="mt-6 rounded-xl bg-slate-900 px-6 hover:bg-slate-800"
              onClick={handleCloseSuccess}
            >
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
