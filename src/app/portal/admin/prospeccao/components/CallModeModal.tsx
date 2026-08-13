'use client';

import { useRef, useState, useEffect } from 'react';
import { Mic, Pause, Play, Square, Loader2, Phone, Upload, X, FileAudio } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Lead } from '../types';

type Mode        = 'record' | 'upload';
type RecordState = 'idle' | 'requesting_mic' | 'recording' | 'paused' | 'uploading' | 'error';
type UploadPhase = 'idle' | 'selected' | 'uploading' | 'error';

const POST_CALL_OPTIONS = [
  { value: 'quer_proposta',       label: 'Quer proposta' },
  { value: 'sem_interesse',       label: 'Sem interesse' },
  { value: 'retornar_depois',     label: 'Retornar depois' },
  { value: 'agendou_videochamada', label: 'Agendou videochamada' },
];

const MAX_UPLOAD_BYTES = 250 * 1024 * 1024; // 250 MB

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface CallModeModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onCallSaved: () => void;
}

export function CallModeModal({ lead, isOpen, onClose, onCallSaved }: CallModeModalProps) {
  // ── gravação ──────────────────────────────────────────────────────────────
  const [state, setState]               = useState<RecordState>('idle');
  const [errorMsg, setErrorMsg]         = useState('');
  const [elapsed, setElapsed]           = useState(0);
  const [postCallStatus, setPostCallStatus] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const streamRef        = useRef<MediaStream | null>(null);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef       = useRef(0);

  // ── upload ────────────────────────────────────────────────────────────────
  const [mode, setMode]                     = useState<Mode>('record');
  const [uploadFile, setUploadFile]         = useState<File | null>(null);
  const [uploadPhase, setUploadPhase]       = useState<UploadPhase>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError]       = useState('');
  const [uploadStatus, setUploadStatus]     = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { elapsedRef.current = elapsed; }, [elapsed]);

  useEffect(() => {
    if (!isOpen) {
      stopTimer();
      cleanupStream();
      setState('idle');
      setElapsed(0);
      setPostCallStatus('');
      setErrorMsg('');
      setMode('record');
      setUploadFile(null);
      setUploadPhase('idle');
      setUploadProgress(0);
      setUploadError('');
      setUploadStatus('');
    }
  }, [isOpen]);

  // ── helpers de gravação ───────────────────────────────────────────────────

  function startTimer() {
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
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
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setState('recording');
      startTimer();
    } catch {
      setState('error');
      setErrorMsg('Permissão de microfone negada. Verifique as configurações do navegador.');
    }
  }

  function handlePause()  { mediaRecorderRef.current?.pause();  stopTimer();  setState('paused');    }
  function handleResume() { mediaRecorderRef.current?.resume(); startTimer(); setState('recording'); }

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
    await uploadRecording(blob, finalElapsed);
  }

  async function uploadRecording(blob: Blob, durationSeconds: number) {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sessão expirada — faça login novamente');

      const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm';
      const formData = new FormData();
      formData.append('audio', blob, `recording.${ext}`);
      formData.append('duration_seconds', String(Math.round(durationSeconds)));
      formData.append('source', 'recording');

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

      if (postCallStatus && callId) {
        await fetch(`/api/admin/prospeccao/leads/${lead!.id}/calls/${callId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ post_call_status: postCallStatus }),
        }).catch(() => {});
      }

      toast.success(txStatus === 'done' ? 'Gravado e transcrito com sucesso' : 'Gravado com sucesso');
      onCallSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Erro ao salvar gravação: ${msg}`);
      setState('error');
    }
  }

  // ── helpers de upload ─────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError(`Arquivo muito grande (${formatBytes(file.size)}). Limite: 250 MB (≈ 1h30).`);
      setUploadPhase('error');
      return;
    }
    setUploadFile(file);
    setUploadError('');
    setUploadPhase('selected');
  }

  async function handleUploadSubmit() {
    if (!uploadFile) return;
    setUploadPhase('uploading');
    setUploadProgress(0);

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sessão expirada — faça login novamente');

      const formData = new FormData();
      formData.append('audio', uploadFile, uploadFile.name);
      formData.append('source', 'upload');

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000';

      const result = await new Promise<{ call: { id: string; transcription_status: string } }>(
        (resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${apiUrl}/api/admin/prospeccao/leads/${lead!.id}/calls`);
          xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);

          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try { resolve(JSON.parse(xhr.responseText)); }
              catch { reject(new Error('Resposta inválida do servidor')); }
            } else {
              try {
                const body = JSON.parse(xhr.responseText);
                reject(new Error((body as { error?: string }).error ?? `HTTP ${xhr.status}`));
              } catch {
                reject(new Error(`HTTP ${xhr.status}`));
              }
            }
          };
          xhr.onerror = () => reject(new Error('Falha de rede ao enviar o arquivo'));
          xhr.send(formData);
        }
      );

      const { id: callId, transcription_status: txStatus } = result.call;

      if (uploadStatus && callId) {
        await fetch(`/api/admin/prospeccao/leads/${lead!.id}/calls/${callId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ post_call_status: uploadStatus }),
        }).catch(() => {});
      }

      const msg =
        txStatus === 'done'
          ? 'Áudio enviado e transcrito com sucesso'
          : 'Áudio enviado. Transcrição em andamento — aparecerá em instantes.';
      toast.success(msg, { duration: txStatus === 'processing' ? 6000 : 4000 });
      onCallSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setUploadError(msg);
      setUploadPhase('error');
    }
  }

  // ── dialog close ──────────────────────────────────────────────────────────

  function handleDialogClose(open: boolean) {
    if (!open && state !== 'uploading' && uploadPhase !== 'uploading') {
      cleanupStream();
      stopTimer();
      onClose();
    }
  }

  const displayName = lead ? lead.nome_fantasia || lead.razao_social : '';
  const isRecordBusy = state !== 'idle' && state !== 'error';

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-violet-500" />
            Modo Call
          </DialogTitle>
          {displayName && (
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5 truncate">{displayName}</p>
          )}
        </DialogHeader>

        {/* Toggle de modo — visível apenas quando não há ação em andamento */}
        {!isRecordBusy && uploadPhase === 'idle' && (
          <div className="flex rounded-xl border border-slate-200 dark:border-zinc-700 overflow-hidden text-sm font-medium">
            <button
              onClick={() => setMode('record')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${
                mode === 'record'
                  ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400'
                  : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              Gravar agora
            </button>
            <button
              onClick={() => { setMode('upload'); setUploadPhase('idle'); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 border-l border-slate-200 dark:border-zinc-700 transition-colors ${
                mode === 'upload'
                  ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400'
                  : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Enviar arquivo
            </button>
          </div>
        )}

        {/* ── MODO GRAVAÇÃO ────────────────────────────────────────────── */}
        {mode === 'record' && (
          <div className="flex flex-col items-center gap-5 py-4">
            {(state === 'recording' || state === 'paused' || state === 'uploading') && (
              <p className={`text-3xl font-mono font-bold tabular-nums ${
                state === 'recording' ? 'text-red-500' : 'text-slate-400 dark:text-zinc-500'
              }`}>
                {formatTimer(elapsed)}
              </p>
            )}

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

            {state === 'requesting_mic' && (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
                <p className="text-sm text-slate-500">Aguardando permissão do microfone...</p>
              </div>
            )}

            {(state === 'recording' || state === 'paused') && (
              <div className="flex items-center gap-5">
                <span className={`h-3 w-3 rounded-full ${
                  state === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-slate-300 dark:bg-zinc-600'
                }`} />
                <button
                  onClick={state === 'recording' ? handlePause : handleResume}
                  title={state === 'recording' ? 'Pausar' : 'Retomar'}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  {state === 'recording' ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
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

            {state === 'uploading' && (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
                <p className="text-sm text-slate-500 dark:text-zinc-400">Salvando e transcrevendo...</p>
              </div>
            )}

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
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}

            {state === 'error' && (
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="text-sm text-red-500">{errorMsg || 'Erro ao salvar gravação'}</p>
                <button
                  onClick={() => { setState('idle'); setErrorMsg(''); }}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Tentar novamente
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── MODO UPLOAD ──────────────────────────────────────────────── */}
        {mode === 'upload' && (
          <div className="flex flex-col gap-4 py-2">

            {/* Seletor de arquivo */}
            {uploadPhase === 'idle' && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.ogg,.m4a,.webm,.mp4,.aac,.flac"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-3 py-8 rounded-xl border-2 border-dashed border-slate-200 dark:border-zinc-700 hover:border-violet-400 dark:hover:border-violet-500 hover:bg-violet-50/40 dark:hover:bg-violet-500/5 transition-colors group"
                >
                  <FileAudio className="w-10 h-10 text-slate-300 dark:text-zinc-600 group-hover:text-violet-400 transition-colors" />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-600 dark:text-zinc-300">
                      Clique para selecionar
                    </p>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
                      MP3, WAV, OGG, M4A, WEBM — até 250 MB (≈ 1h30)
                    </p>
                  </div>
                </button>
              </>
            )}

            {/* Arquivo selecionado */}
            {uploadPhase === 'selected' && uploadFile && (
              <>
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                  <FileAudio className="w-5 h-5 shrink-0 text-violet-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-zinc-200 truncate">
                      {uploadFile.name}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-zinc-500">
                      {formatBytes(uploadFile.size)}
                    </p>
                  </div>
                  <button
                    onClick={() => { setUploadFile(null); setUploadPhase('idle'); }}
                    className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400 mb-1.5">
                    O que aconteceu na ligação?
                  </label>
                  <select
                    value={uploadStatus}
                    onChange={(e) => setUploadStatus(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
                  >
                    <option value="">Selecionar (opcional)...</option>
                    {POST_CALL_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleUploadSubmit}
                  className="w-full h-10 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
                >
                  Enviar e transcrever
                </button>
              </>
            )}

            {/* Progresso do upload */}
            {uploadPhase === 'uploading' && (
              <div className="flex flex-col items-center gap-4 py-4">
                <Loader2 className="w-9 h-9 text-violet-500 animate-spin" />
                <div className="w-full">
                  <div className="flex justify-between text-xs text-slate-500 dark:text-zinc-400 mb-1">
                    <span>Enviando...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  {uploadFile && (
                    <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1.5 truncate text-center">
                      {uploadFile.name}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Erro no upload */}
            {uploadPhase === 'error' && (
              <div className="flex flex-col items-center gap-3 text-center py-2">
                <p className="text-sm text-red-500">{uploadError || 'Erro ao enviar o arquivo'}</p>
                <button
                  onClick={() => { setUploadFile(null); setUploadPhase('idle'); setUploadError(''); }}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Tentar novamente
                </button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
