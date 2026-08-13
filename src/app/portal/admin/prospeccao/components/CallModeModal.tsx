'use client';

import { useRef, useState, useEffect } from 'react';
import { Mic, Pause, Play, Square, Loader2, Phone } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Lead } from '../types';

type RecordState = 'idle' | 'requesting_mic' | 'recording' | 'paused' | 'uploading' | 'error';

const POST_CALL_OPTIONS = [
  { value: 'quer_proposta', label: 'Quer proposta' },
  { value: 'sem_interesse', label: 'Sem interesse' },
  { value: 'retornar_depois', label: 'Retornar depois' },
  { value: 'agendou_videochamada', label: 'Agendou videochamada' },
];

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

interface CallModeModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onCallSaved: () => void;
}

export function CallModeModal({ lead, isOpen, onClose, onCallSaved }: CallModeModalProps) {
  const [state, setState] = useState<RecordState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [postCallStatus, setPostCallStatus] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

  useEffect(() => {
    if (!isOpen) {
      stopTimer();
      cleanupStream();
      setState('idle');
      setElapsed(0);
      setPostCallStatus('');
      setErrorMsg('');
    }
  }, [isOpen]);

  function startTimer() {
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function cleanupStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }

  async function handleStartRecording() {
    setState('requesting_mic');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType =
        ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) =>
          MediaRecorder.isTypeSupported(t)
        ) ?? '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setState('recording');
      startTimer();
    } catch {
      setState('error');
      setErrorMsg('Permissão de microfone negada. Verifique as configurações do navegador.');
    }
  }

  function handlePause() {
    mediaRecorderRef.current?.pause();
    stopTimer();
    setState('paused');
  }

  function handleResume() {
    mediaRecorderRef.current?.resume();
    startTimer();
    setState('recording');
  }

  async function handleStop() {
    stopTimer();
    const finalElapsed = elapsedRef.current;
    const recorder = mediaRecorderRef.current!;

    await new Promise<void>((resolve) => {
      recorder.addEventListener('stop', () => resolve(), { once: true });
      recorder.stop();
    });
    streamRef.current?.getTracks().forEach((t) => t.stop());

    const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
    setState('uploading');
    await uploadCall(blob, finalElapsed);
  }

  async function uploadCall(blob: Blob, durationSeconds: number) {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sessão expirada — faça login novamente');

      const ext = blob.type.includes('mp4')
        ? 'mp4'
        : blob.type.includes('ogg')
          ? 'ogg'
          : 'webm';
      const formData = new FormData();
      formData.append('audio', blob, `recording.${ext}`);
      formData.append('duration_seconds', String(Math.round(durationSeconds)));

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000';
      const res = await fetch(`${apiUrl}/api/admin/prospeccao/leads/${lead!.id}/calls`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      const callId: string | undefined = data.call?.id;
      const txStatus: string | undefined = data.call?.transcription_status;

      // PATCH do status pós-call se o usuário selecionou enquanto o upload rodava
      const statusAtClose = postCallStatus;
      if (statusAtClose && callId) {
        await fetch(`/api/admin/prospeccao/leads/${lead!.id}/calls/${callId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ post_call_status: statusAtClose }),
        }).catch(() => {});
      }

      toast.success(
        txStatus === 'done' ? 'Gravado e transcrito com sucesso' : 'Gravado com sucesso'
      );
      onCallSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Erro ao salvar gravação: ${msg}`);
      setState('error');
    }
  }

  function handleDialogClose(open: boolean) {
    if (!open && state !== 'uploading') {
      cleanupStream();
      stopTimer();
      onClose();
    }
  }

  const displayName = lead ? lead.nome_fantasia || lead.razao_social : '';

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-violet-500" />
            Modo Call
          </DialogTitle>
          {displayName && (
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
              {displayName}
            </p>
          )}
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 py-4">
          {/* Timer */}
          {(state === 'recording' || state === 'paused' || state === 'uploading') && (
            <p
              className={`text-3xl font-mono font-bold tabular-nums ${
                state === 'recording'
                  ? 'text-red-500'
                  : 'text-slate-400 dark:text-zinc-500'
              }`}
            >
              {formatTimer(elapsed)}
            </p>
          )}

          {/* Idle */}
          {state === 'idle' && (
            <button onClick={handleStartRecording} className="flex flex-col items-center gap-2 group">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800 group-hover:bg-violet-50 dark:group-hover:bg-violet-500/10 transition-colors">
                <Mic className="w-9 h-9 text-slate-400 group-hover:text-violet-500 transition-colors" />
              </span>
              <span className="text-sm font-semibold text-slate-500 dark:text-zinc-400">
                Iniciar gravação
              </span>
            </button>
          )}

          {/* Requesting mic */}
          {state === 'requesting_mic' && (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
              <p className="text-sm text-slate-500">Aguardando permissão do microfone...</p>
            </div>
          )}

          {/* Recording / Paused controls */}
          {(state === 'recording' || state === 'paused') && (
            <div className="flex items-center gap-5">
              <span
                className={`h-3 w-3 rounded-full ${
                  state === 'recording'
                    ? 'bg-red-500 animate-pulse'
                    : 'bg-slate-300 dark:bg-zinc-600'
                }`}
              />
              <button
                onClick={state === 'recording' ? handlePause : handleResume}
                title={state === 'recording' ? 'Pausar' : 'Retomar'}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
              >
                {state === 'recording' ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={handleStop}
                title="Parar e salvar"
                className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors shadow-md"
              >
                <Square className="w-5 h-5 fill-current" />
              </button>
            </div>
          )}

          {/* Uploading */}
          {state === 'uploading' && (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
              <p className="text-sm text-slate-500 dark:text-zinc-400">
                Salvando e transcrevendo...
              </p>
            </div>
          )}

          {/* Post-call status select — aparece durante o upload para o usuário preencher enquanto espera */}
          {state === 'uploading' && (
            <div className="w-full">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400 mb-1.5">
                O que aconteceu na ligação?
              </label>
              <select
                value={postCallStatus}
                onChange={(e) => setPostCallStatus(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
              >
                <option value="">Selecionar (opcional)...</option>
                {POST_CALL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Error */}
          {state === 'error' && (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-red-500">{errorMsg || 'Erro ao salvar gravação'}</p>
              <button
                onClick={() => {
                  setState('idle');
                  setErrorMsg('');
                }}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Tentar novamente
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
