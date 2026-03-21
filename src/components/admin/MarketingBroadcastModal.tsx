'use client';

import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Megaphone, X, Sparkles, Loader2, AlertCircle, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const MAX_FEATURES_LEN = 900;
const MIN_FEATURES_LEN = 10;

export interface MarketingBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SegmentValue = 'HOT' | 'WARM' | 'COLD' | 'ALL';

const SEGMENT_OPTIONS: { value: SegmentValue; label: string }[] = [
  { value: 'HOT', label: '🔥 HOT — usuários mais engajados' },
  { value: 'WARM', label: '🌡️ WARM — engajamento médio' },
  { value: 'COLD', label: '🧊 COLD — baixo engajamento' },
  { value: 'ALL', label: '👥 Todos os usuários' },
];

function segmentLabel(seg: SegmentValue): string {
  return SEGMENT_OPTIONS.find((o) => o.value === seg)?.label ?? seg;
}

export interface BroadcastResult {
  total_found: number;
  sent: number;
  errors: number;
  skipped: number;
  dry_run: boolean;
  segment: string;
  only_active_window: boolean;
  paid_count: number;
  free_count: number;
}

type Step = 'form' | 'confirm' | 'result';

async function postBroadcast(
  token: string,
  body: {
    features_text: string;
    segment: SegmentValue;
    only_active_window: boolean;
    dry_run: boolean;
  }
): Promise<BroadcastResult> {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
  const res = await fetch(`${base}/api/admin/broadcast/marketing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data?.error === 'string'
        ? data.error
        : 'Falha ao chamar o broadcast de marketing';
    throw new Error(msg);
  }
  return data as BroadcastResult;
}

export default function MarketingBroadcastModal({
  isOpen,
  onClose,
}: MarketingBroadcastModalProps) {
  const [step, setStep] = useState<Step>('form');
  const [featuresText, setFeaturesText] = useState('');
  const [segment, setSegment] = useState<SegmentValue>('ALL');
  const [onlyActiveWindow, setOnlyActiveWindow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [confirmTotalFound, setConfirmTotalFound] = useState(0);

  const reset = useCallback(() => {
    setStep('form');
    setFeaturesText('');
    setSegment('ALL');
    setOnlyActiveWindow(false);
    setLoading(false);
    setError(null);
    setResult(null);
    setConfirmTotalFound(0);
  }, []);

  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen, reset]);

  const trimmed = featuresText.trim();
  const len = featuresText.length;
  const featuresValid =
    trimmed.length >= MIN_FEATURES_LEN && len <= MAX_FEATURES_LEN;

  function handleClose() {
    reset();
    onClose();
  }

  async function getSessionToken(): Promise<string> {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sessão expirada. Entre novamente.');
    return session.access_token;
  }

  async function handleDryRun() {
    setError(null);
    if (!featuresValid) {
      setError(
        `Descreva as novidades com entre ${MIN_FEATURES_LEN} e ${MAX_FEATURES_LEN} caracteres.`
      );
      return;
    }
    setLoading(true);
    try {
      const token = await getSessionToken();
      const data = await postBroadcast(token, {
        features_text: trimmed,
        segment,
        only_active_window: onlyActiveWindow,
        dry_run: true,
      });
      setResult(data);
      setStep('result');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendNowClick() {
    setError(null);
    if (!trimmed) {
      setError('Preencha a descrição das novidades.');
      return;
    }
    if (!featuresValid) {
      setError(
        `Use entre ${MIN_FEATURES_LEN} e ${MAX_FEATURES_LEN} caracteres na descrição.`
      );
      return;
    }
    setLoading(true);
    try {
      const token = await getSessionToken();
      const preview = await postBroadcast(token, {
        features_text: trimmed,
        segment,
        only_active_window: onlyActiveWindow,
        dry_run: true,
      });
      setConfirmTotalFound(preview.total_found);
      setStep('confirm');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmSend() {
    setError(null);
    setLoading(true);
    try {
      const token = await getSessionToken();
      const data = await postBroadcast(token, {
        features_text: trimmed,
        segment,
        only_active_window: onlyActiveWindow,
        dry_run: false,
      });
      setResult(data);
      setStep('result');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  const sendDisabled = !trimmed || loading;

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-w-lg w-[calc(100%-2rem)] p-0 gap-0 overflow-hidden rounded-2xl max-h-[min(90vh,720px)] flex flex-col sm:max-w-lg">
        <div
          className="h-[3px] flex-shrink-0"
          style={{ background: 'linear-gradient(90deg, #f59e0b, #f59e0b40)' }}
        />

        <div className="px-5 sm:px-6 pt-4 pb-3 border-b border-zinc-200 dark:border-zinc-800/60 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                <Megaphone className="w-4 h-4 text-amber-500" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Envio de Marketing
                </DialogTitle>
                <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5">
                  Template WhatsApp — novidades de lançamento
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all flex-shrink-0"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-5 sm:px-6 py-4 overflow-y-auto flex-1 min-h-0 space-y-4">
          {error && (
            <div
              className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-300"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 'form' && (
            <>
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                  <Sparkles className="w-3 h-3" />
                  Descreva as novidades <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={featuresText}
                  onChange={(e) =>
                    setFeaturesText(
                      e.target.value.slice(0, MAX_FEATURES_LEN)
                    )
                  }
                  placeholder="Ex: ✨ Plano Personalizado pelo WhatsApp — diga o que quer estudar e o plano se adapta na hora"
                  rows={5}
                  disabled={loading}
                  className="w-full bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 resize-y min-h-[120px] focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all disabled:opacity-60"
                />
                <div className="flex justify-between items-center mt-1.5 text-xs">
                  <span
                    className={
                      trimmed.length > 0 && trimmed.length < MIN_FEATURES_LEN
                        ? 'text-amber-600 dark:text-amber-400 font-medium'
                        : 'text-zinc-500'
                    }
                  >
                    Mínimo {MIN_FEATURES_LEN} caracteres
                  </span>
                  <span
                    className={
                      len > MAX_FEATURES_LEN * 0.95
                        ? 'text-amber-600 dark:text-amber-400 font-medium'
                        : 'text-zinc-500'
                    }
                  >
                    {len} / {MAX_FEATURES_LEN}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                  Segmento de usuários
                </p>
                <div className="space-y-2" role="radiogroup" aria-label="Segmento">
                  {SEGMENT_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-3 cursor-pointer rounded-xl border px-3 py-2.5 text-sm transition-all ${
                        segment === opt.value
                          ? 'border-amber-500/50 bg-amber-500/10 dark:bg-amber-500/10'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                      } ${loading ? 'pointer-events-none opacity-60' : ''}`}
                    >
                      <input
                        type="radio"
                        name="marketing-segment"
                        value={opt.value}
                        checked={segment === opt.value}
                        onChange={() => setSegment(opt.value)}
                        className="h-4 w-4 accent-amber-600"
                      />
                      <span className="text-zinc-800 dark:text-zinc-200 leading-snug">
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-start justify-between gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-3">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Apenas usuários com janela ativa (Meta)
                    </p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="rounded-md p-0.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
                          aria-label="Sobre a janela de 24 horas da Meta"
                        >
                          <Info className="w-4 h-4 shrink-0" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-[280px] text-left text-xs leading-relaxed p-3 bg-zinc-900 text-zinc-100 border border-zinc-700"
                      >
                        A Meta permite mensagens de texto livre apenas quando o usuário interagiu nas
                        últimas 24h. Para marketing, o template é sempre usado — mas usuários com
                        janela ativa tendem a ter maior taxa de resposta.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    Filtra usuários que enviaram mensagem nas últimas 24h. Fora dessa janela, apenas
                    templates aprovados podem ser enviados.
                  </p>
                </div>
                <Switch
                  checked={onlyActiveWindow}
                  onCheckedChange={setOnlyActiveWindow}
                  disabled={loading}
                  className="flex-shrink-0 mt-0.5"
                />
              </div>
            </>
          )}

          {step === 'confirm' && (
            <div className="space-y-4 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              <p>
                Você está prestes a enviar para{' '}
                <strong className="text-zinc-900 dark:text-zinc-100">
                  {confirmTotalFound}
                </strong>{' '}
                usuários.
              </p>
              <p>
                <span className="text-zinc-500">Segmento:</span>{' '}
                {segmentLabel(segment)}
              </p>
              <p>
                <span className="text-zinc-500">Janela Meta (24h):</span>{' '}
                {onlyActiveWindow ? 'sim' : 'não'}
              </p>
              <p className="font-medium text-zinc-900 dark:text-zinc-100 pt-1">
                Tem certeza?
              </p>
            </div>
          )}

          {step === 'result' && result && (
            <Card className="border-zinc-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/50">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {result.dry_run ? 'Resultado da simulação' : 'Resultado do envio'}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-500">Total encontrado</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {result.total_found}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-500">Enviados com sucesso</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {result.sent}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-500">Erros</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {result.errors}
                  </span>
                </div>
                {result.skipped > 0 && (
                  <div className="flex justify-between gap-2">
                    <span className="text-zinc-500">Ignorados</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {result.skipped}
                    </span>
                  </div>
                )}
                <div className="flex justify-between gap-2 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                  <span className="text-zinc-500">Pagantes</span>
                  <span className="font-semibold">{result.paid_count}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-500">Free</span>
                  <span className="font-semibold">{result.free_count}</span>
                </div>
                <div className="pt-2">
                  <span
                    className={`inline-flex text-xs font-bold px-2.5 py-1 rounded-full ${
                      result.dry_run
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {result.dry_run ? 'Dry run (simulação)' : 'Envio real'}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="px-5 sm:px-6 pb-5 pt-2 border-t border-zinc-200 dark:border-zinc-800 flex-shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          {step === 'form' && (
            <>
              <button
                type="button"
                onClick={handleDryRun}
                disabled={!featuresValid || loading}
                className="text-sm font-semibold px-4 py-2.5 rounded-xl border-2 border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                Simular envio
              </button>
              <button
                type="button"
                onClick={handleSendNowClick}
                disabled={sendDisabled || !featuresValid}
                className="text-sm font-bold px-4 py-2.5 rounded-xl text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                style={{
                  background:
                    sendDisabled || !featuresValid ? '#6366f160' : '#6366f1',
                }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                Enviar agora
              </button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setError(null);
                }}
                disabled={loading}
                className="text-sm font-medium px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                disabled={loading}
                className="text-sm font-bold px-4 py-2.5 rounded-xl text-white bg-amber-600 hover:bg-amber-500 transition-all disabled:opacity-40 inline-flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                Confirmar envio
              </button>
            </>
          )}

          {step === 'result' && (
            <button
              type="button"
              onClick={() => {
                setStep('form');
                setResult(null);
                setError(null);
              }}
              className="text-sm font-semibold px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 w-full sm:w-auto"
            >
              Voltar ao formulário
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { MarketingBroadcastModal };
