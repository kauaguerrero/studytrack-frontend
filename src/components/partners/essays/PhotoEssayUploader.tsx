'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageIcon, Loader2, RotateCcw, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrokenPencilIllustration } from '@/components/ui/broken-pencil-illustration';

type UploadState = 'idle' | 'transcribing' | 'review' | 'confirming' | 'error';

interface PhotoEssayUploaderProps {
  slug: string;
  theme: string;
  essayType: string;
  promptId?: string;
  onSuccess: (essayId: string) => void;
}

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const UPLOAD_TARGET_BYTES = 3.5 * 1024 * 1024; // margem segura abaixo do limite de 4.5MB do Vercel
const MAX_DIMENSION = 1920;
const TRANSCRIPTION_TIMEOUT_MS = 90_000;
const CONFIRM_TIMEOUT_MS = 90_000;

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    if (file.size <= UPLOAD_TARGET_BYTES) {
      resolve(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        URL.revokeObjectURL(objectUrl);

        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // tenta qualidade 0.85 primeiro, se ainda for grande usa 0.70
        canvas.toBlob(
          (blob85) => {
            if (blob85 && blob85.size <= UPLOAD_TARGET_BYTES) {
              resolve(new File([blob85], 'redacao.jpg', { type: 'image/jpeg' }));
              return;
            }
            canvas.toBlob(
              (blob70) => {
                resolve(new File([blob70 ?? blob85 ?? file], 'redacao.jpg', { type: 'image/jpeg' }));
              },
              'image/jpeg',
              0.70,
            );
          },
          'image/jpeg',
          0.85,
        );
      } catch {
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // fallback: envia o arquivo original
    };

    img.src = objectUrl;
  });
}

// Navegadores modernos já aplicam a rotação do EXIF ao decodificar pro <img>/
// canvas, então width/height aqui refletem a orientação "como se vê" —
// mesma leitura que o preview mostra pro aluno.
function checkPortraitOrientation(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img.width <= img.height);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(true); // não bloqueia por falha de leitura — backend valida de novo
    };
    img.src = objectUrl;
  });
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

const SCENES = [
  {
    label: '❌ Foto muito inclinada',
    statusText: 'incline menos o celular',
    viewfinderColor: '#ef4444',
    paperRotate: 25,
    paperScale: 1,
    shadow: false,
    badgeIcon: '✕',
    badgeBg: '#ef4444',
    badgeLabel: 'Errado',
    good: false,
  },
  {
    label: '❌ Folha cortada — câmera muito perto',
    statusText: 'afaste a câmera',
    viewfinderColor: '#ef4444',
    paperRotate: 0,
    paperScale: 1.65,
    shadow: false,
    badgeIcon: '✕',
    badgeBg: '#ef4444',
    badgeLabel: 'Errado',
    good: false,
  },
  {
    label: '❌ Sombra sobre o papel',
    statusText: 'melhore a iluminação',
    viewfinderColor: '#ef4444',
    paperRotate: 0,
    paperScale: 1,
    shadow: true,
    badgeIcon: '✕',
    badgeBg: '#ef4444',
    badgeLabel: 'Errado',
    good: false,
  },
  {
    label: '✅ Perfeito! Foto bem enquadrada',
    statusText: 'pronto para fotografar',
    viewfinderColor: '#22c55e',
    paperRotate: 0,
    paperScale: 1,
    shadow: false,
    badgeIcon: '✓',
    badgeBg: '#22c55e',
    badgeLabel: 'Certo!',
    good: true,
  },
] as const;

export function PhotoEssayUploader({
  slug,
  theme,
  essayType,
  promptId,
  onSuccess,
}: PhotoEssayUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  // Arquivo mantido em memória do estado idle até o confirming — nunca pedimos ao usuário selecionar duas vezes
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fileError, setFileError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Modal de instruções — abre na primeira vez na sessão
  const [showModal, setShowModal] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !sessionStorage.getItem('photoEssayModalSeen');
  });
  const [currentScene, setCurrentScene] = useState(0);
  const [badgeVisible, setBadgeVisible] = useState(false);
  const [flashVisible, setFlashVisible] = useState(false);

  const charCount = transcription.trim().length;
  const isValidText = charCount >= 100 && charCount <= 5000;

  const counterClass =
    charCount > 5000
      ? 'text-red-600 dark:text-red-400'
      : charCount >= 4500
        ? 'text-amber-600 dark:text-amber-300'
        : charCount >= 100
          ? 'text-emerald-600 dark:text-emerald-300'
          : 'text-slate-500 dark:text-slate-400';

  // Lock de scroll enquanto o modal está aberto
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showModal]);

  // Ciclo de cenas a cada 3.2s
  useEffect(() => {
    if (!showModal) return;
    const interval = setInterval(() => {
      setCurrentScene(s => (s + 1) % 4);
    }, 3200);
    return () => clearInterval(interval);
  }, [showModal]);

  // Badge e flash por cena
  useEffect(() => {
    if (!showModal) return;
    setBadgeVisible(false);
    setFlashVisible(false);
    const scene = SCENES[currentScene];
    if (scene.good) {
      let innerTimer: ReturnType<typeof setTimeout>;
      const t = setTimeout(() => {
        setFlashVisible(true);
        innerTimer = setTimeout(() => {
          setFlashVisible(false);
          setBadgeVisible(true);
        }, 110);
      }, 700);
      return () => {
        clearTimeout(t);
        clearTimeout(innerTimer);
      };
    }
    const t = setTimeout(() => setBadgeVisible(true), 700);
    return () => clearTimeout(t);
  }, [currentScene, showModal]);

  function closeModal() {
    sessionStorage.setItem('photoEssayModalSeen', '1');
    setShowModal(false);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError('');

    if (!VALID_MIME_TYPES.includes(file.type)) {
      setFileError('Envie uma foto no formato JPG, PNG ou WEBP.');
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setFileError('A imagem não pode ultrapassar 15 MB. Comprima ou fotografe novamente.');
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }

    const isPortrait = await checkPortraitOrientation(file);
    if (!isPortrait) {
      setFileError('A foto parece estar na horizontal. Fotografe a redação na vertical, com a folha em pé.');
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(url);
  }

  function resetToIdle() {
    setUploadState('idle');
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setTranscription('');
    setErrorMessage('');
    setFileError('');
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleTranscribe() {
    if (!selectedFile) return;
    setUploadState('transcribing');

    try {
      const fileToUpload = await compressImage(selectedFile);
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('theme', theme);
      formData.append('essay_type', essayType);

      const res = await fetchWithTimeout(`/api/partners/${slug}/essays/upload-image`, {
        method: 'POST',
        body: formData,
      }, TRANSCRIPTION_TIMEOUT_MS);

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setUploadState('error');
        setErrorMessage(data?.error || 'Erro ao transcrever a imagem.');
        return;
      }

      setTranscription(data?.transcription ?? '');
      setUploadState('review');
    } catch (error) {
      setUploadState('error');
      setErrorMessage(
        error instanceof DOMException && error.name === 'AbortError'
          ? 'A transcrição demorou mais do que o esperado. Tente novamente.'
          : 'Não foi possível conectar ao servidor. Tente novamente.',
      );
    }
  }

  async function handleConfirm() {
    if (!selectedFile || !isValidText) return;
    setUploadState('confirming');

    try {
      const fileToUpload = await compressImage(selectedFile);
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('theme', theme);
      formData.append('essay_type', essayType);
      formData.append('confirmed_text', transcription.trim());
      if (promptId) formData.append('prompt_id', promptId);

      const res = await fetchWithTimeout(`/api/partners/${slug}/essays/upload-image/confirm`, {
        method: 'POST',
        body: formData,
      }, CONFIRM_TIMEOUT_MS);

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setUploadState('error');
        setErrorMessage(data?.error || 'Erro ao enviar a redação.');
        return;
      }

      onSuccess(data?.essay_id ?? '');
    } catch (error) {
      setUploadState('error');
      setErrorMessage(
        error instanceof DOMException && error.name === 'AbortError'
          ? 'O envio demorou mais do que o esperado. Tente novamente.'
          : 'Não foi possível conectar ao servidor. Tente novamente.',
      );
    }
  }

  // ─── Modal de instruções ───────────────────────────────────────────────────
  const scene = SCENES[currentScene];

  const modal = showModal ? (
    <>
      <style>{`
        @keyframes _peuBadgeIn {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        ._peu-badge { animation: _peuBadgeIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both; }
      `}</style>

      {/* z-50: fullscreen no mobile, overlay centralizado no desktop */}
      <div className="fixed inset-0 z-50 sm:bg-black/60 sm:flex sm:items-center sm:justify-center">
        <div
          className={cn(
            'bg-white dark:bg-slate-900 flex flex-col overflow-hidden',
            /* mobile: fullscreen, arredondado apenas no topo */
            'absolute inset-0 rounded-t-[16px]',
            /* desktop: card centralizado */
            'sm:static sm:inset-auto sm:max-w-[400px] sm:w-full sm:rounded-[16px] sm:max-h-[90vh]',
          )}
        >
          {/* Área rolável */}
          <div className="flex-1 overflow-y-auto flex flex-col items-center gap-5 px-5 pt-7 pb-2">

            <div className="text-center">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Como fotografar sua redação
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Veja os exemplos antes de fotografar
              </p>
            </div>

            {/* Frame do celular — 180×280 mobile / 210×320 desktop */}
            <div className="relative flex-shrink-0 w-[180px] h-[280px] sm:w-[210px] sm:h-[320px]">

              {/* Corpo do celular */}
              <div
                className="absolute inset-0 rounded-[24px]"
                style={{ background: '#1e293b', boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}
              />

              {/* Notch */}
              <div
                className="absolute top-[10px] left-1/2 -translate-x-1/2 z-10"
                style={{ width: 44, height: 9, background: '#0f172a', borderRadius: 4 }}
              />

              {/* Tela */}
              <div
                className="absolute overflow-hidden"
                style={{ top: 14, bottom: 14, left: 9, right: 9, background: '#dce8dc', borderRadius: 16 }}
              >
                {/* Flash branco (cena 4) */}
                {flashVisible && (
                  <div className="absolute inset-0 z-10" style={{ background: 'white', borderRadius: 16 }} />
                )}

                {/* Papel manuscrito simulado */}
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                  <div
                    className="relative overflow-hidden"
                    style={{
                      width: '78%',
                      height: '83%',
                      background: '#f9fafb',
                      borderRadius: 3,
                      boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
                      transform: `rotate(${scene.paperRotate}deg) scale(${scene.paperScale})`,
                      transition: 'transform 0.35s ease',
                    }}
                  >
                    {/* Linhas horizontais */}
                    {Array.from({ length: 13 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          position: 'absolute',
                          left: '6%',
                          right: '6%',
                          top: `${10 + i * 6.5}%`,
                          height: 1,
                          background: '#cbd5e1',
                        }}
                      />
                    ))}

                    {/* Sombra (cena 3) */}
                    {scene.shadow && (
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            'linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.08) 55%, transparent 100%)',
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Viewfinder — cantos marcados */}
                {(['tl', 'tr', 'bl', 'br'] as const).map(c => (
                  <div
                    key={c}
                    style={{
                      position: 'absolute',
                      width: 18,
                      height: 18,
                      ...(c === 'tl' && {
                        top: 18, left: 10,
                        borderTop: `2.5px solid ${scene.viewfinderColor}`,
                        borderLeft: `2.5px solid ${scene.viewfinderColor}`,
                      }),
                      ...(c === 'tr' && {
                        top: 18, right: 10,
                        borderTop: `2.5px solid ${scene.viewfinderColor}`,
                        borderRight: `2.5px solid ${scene.viewfinderColor}`,
                      }),
                      ...(c === 'bl' && {
                        bottom: 28, left: 10,
                        borderBottom: `2.5px solid ${scene.viewfinderColor}`,
                        borderLeft: `2.5px solid ${scene.viewfinderColor}`,
                      }),
                      ...(c === 'br' && {
                        bottom: 28, right: 10,
                        borderBottom: `2.5px solid ${scene.viewfinderColor}`,
                        borderRight: `2.5px solid ${scene.viewfinderColor}`,
                      }),
                    }}
                  />
                ))}

                {/* Badge com animação scale 0→1 */}
                {badgeVisible && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[5]">
                    <div
                      className="_peu-badge"
                      style={{
                        background: scene.badgeBg,
                        borderRadius: 7,
                        padding: '5px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      <span style={{ fontSize: 14, color: 'white', fontWeight: 700, lineHeight: 1 }}>
                        {scene.badgeIcon}
                      </span>
                      <span style={{ fontSize: 9, color: 'white', fontWeight: 600, lineHeight: 1 }}>
                        {scene.badgeLabel}
                      </span>
                    </div>
                  </div>
                )}

                {/* Barra de status */}
                <div
                  className="absolute bottom-0 left-0 right-0 text-center"
                  style={{ background: 'rgba(0,0,0,0.48)', padding: '4px 6px' }}
                >
                  <span style={{ fontSize: 8.5, color: 'white', letterSpacing: 0.3 }}>
                    {scene.statusText}
                  </span>
                </div>
              </div>
            </div>

            {/* Label descritivo da cena */}
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 text-center">
              {scene.label}
            </p>

            {/* Dots indicadores */}
            <div className="flex gap-2">
              {SCENES.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    transition: 'background 0.3s',
                    background: i === currentScene ? '#185FA5' : '#e2e8f0',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Botão fixo no fundo */}
          <div
            className="sticky bottom-0 bg-white dark:bg-slate-900 px-5 pt-3"
            style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
          >
            <button
              type="button"
              onClick={closeModal}
              className="w-full min-h-[44px] rounded-xl text-sm font-semibold text-white transition hover:brightness-105"
              style={{ background: '#185FA5' }}
            >
              Entendi, vou fotografar agora
            </button>
          </div>
        </div>
      </div>
    </>
  ) : null;

  // ─── Estado: idle ──────────────────────────────────────────────────────────
  if (uploadState === 'idle') {
    return (
      <>
        {modal}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-6">
          <label className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center cursor-pointer transition hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600 dark:hover:bg-slate-900">
            <ImageIcon className="h-10 w-10 text-slate-400" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Tire uma foto clara da sua redação e faça upload
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              JPG, PNG ou WEBP · a imagem será otimizada automaticamente
            </span>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>

          {fileError && (
            <p className="text-sm text-red-600 dark:text-red-400">{fileError}</p>
          )}

          {previewUrl && selectedFile && (
            <div className="space-y-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Pré-visualização da redação"
                className="max-h-52 w-full rounded-xl border border-slate-200 object-contain dark:border-slate-700"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedFile.name} · {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={!selectedFile || !!fileError}
            onClick={handleTranscribe}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <ImageIcon className="h-4 w-4" />
            Transcrever redação
          </button>
        </div>
      </>
    );
  }

  // ─── Estado: transcribing ──────────────────────────────────────────────────
  if (uploadState === 'transcribing') {
    return (
      <>
        {modal}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-6">
          {previewUrl && (
            <div className="space-y-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Pré-visualização da redação"
                className="max-h-52 w-full rounded-xl border border-slate-200 object-contain dark:border-slate-700"
              />
              {selectedFile && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedFile.name} · {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                </p>
              )}
            </div>
          )}
          <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-500 dark:text-slate-400" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Transcrevendo sua redação… isso pode levar até 30 segundos.
            </p>
          </div>
        </div>
      </>
    );
  }

  // ─── Estado: review ────────────────────────────────────────────────────────
  if (uploadState === 'review') {
    return (
      <>
        {modal}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-6">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Revise o texto abaixo e corrija qualquer erro antes de enviar.
          </p>

          {previewUrl && (
            <details className="rounded-xl border border-slate-200 dark:border-slate-800">
              <summary className="cursor-pointer px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 select-none">
                Visualizar foto enviada
              </summary>
              <div className="p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Foto da redação"
                  className="max-w-full rounded-lg border border-slate-200 dark:border-slate-800"
                />
              </div>
            </details>
          )}

          <div className="space-y-1">
            <div className="flex items-center justify-end">
              <span className={cn('text-sm font-medium', counterClass)}>
                {charCount} / 5000 caracteres
              </span>
            </div>
            <textarea
              value={transcription}
              onChange={(e) => setTranscription(e.target.value)}
              className="min-h-[380px] w-full resize-y rounded-xl border border-slate-300 bg-white p-4 text-sm leading-relaxed text-slate-900 outline-none transition focus:border-[var(--brand-primary)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={resetToIdle}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              <RotateCcw className="h-4 w-4" />
              Tentar novamente
            </button>

            <button
              type="button"
              disabled={!isValidText}
              onClick={handleConfirm}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              <Send className="h-4 w-4" />
              Confirmar e Enviar
            </button>
          </div>
        </div>
      </>
    );
  }

  // ─── Estado: confirming ────────────────────────────────────────────────────
  if (uploadState === 'confirming') {
    return (
      <>
        {modal}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-6">
          <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-500 dark:text-slate-400" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Enviando redação…
            </p>
          </div>
        </div>
      </>
    );
  }

  // ─── Estado: error ─────────────────────────────────────────────────────────
  return (
    <>
      {modal}
      <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8">
        <BrokenPencilIllustration className="mb-1 h-auto w-48 sm:w-56" />
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-red-500 dark:text-red-400">
          Algo deu errado
        </p>
        <p className="font-display mt-1.5 max-w-sm text-base font-bold text-slate-900 dark:text-white">
          {errorMessage || 'Ocorreu um erro inesperado.'}
        </p>
        <button
          type="button"
          onClick={resetToIdle}
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          <RotateCcw className="h-4 w-4" />
          Tentar novamente
        </button>
      </div>
    </>
  );
}
