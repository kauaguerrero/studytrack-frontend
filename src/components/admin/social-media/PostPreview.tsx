'use client';

/**
 * PostPreview
 *
 * Renderiza o post gerado e expõe ações:
 *   - Download (PNG único ou ZIP para carrossel via Puppeteer server-side)
 *   - Gerar variação
 *   - Ajustar
 *   - Salvar no histórico
 *   - Recomeçar
 */

import {
  useRef, useEffect, useCallback, useState,
} from 'react';
import {
  Download, RefreshCw, Wand2, Save, RotateCcw,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import PostCanvas from './templates/PostCanvas';
import { calcPreviewScale } from './templates/PostCanvas';
import PhotoOverlay from './templates/PhotoOverlay';
import { renderPostToHtml } from '@/lib/social-media-renderer';
import { FORMAT_DIMENSIONS } from '@/types/social-media';
import type { GeneratedPost, SocialMediaFormat } from '@/types/social-media';

interface PostPreviewProps {
  post:            GeneratedPost;
  format:          SocialMediaFormat;
  adminMaterials?: string[];
  savedPostId?:    string | null;
  onAdjust:        (text: string) => void;
  onVariation:     () => void;
  onSave:          () => Promise<void>;
  onRestart:       () => void;
  adjusting:       boolean;
  saving:          boolean;
}

export default function PostPreview({
  post, format, adminMaterials,
  savedPostId, onAdjust, onVariation, onSave, onRestart,
  adjusting, saving,
}: PostPreviewProps) {
  const containerRef      = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.35);
  const [activeSlide, setActiveSlide] = useState(0);
  const [adjustText, setAdjustText]   = useState('');
  const [downloading, setDownloading] = useState(false);
  const [showAdjust, setShowAdjust]   = useState(false);

  // Recalcula scale quando o container muda de tamanho
  useEffect(() => {
    function update() {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      setScale(calcPreviewScale(w, format, 0.8));
    }
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [format]);

  const isCarousel  = post.slides.length > 1;
  const slideCount  = post.slides.length;

  // ── Download via Puppeteer (server-side) ──────────────────

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const { width, height } = FORMAT_DIMENSIONS[format];

      if (!isCarousel) {
        const html = renderPostToHtml(post, format, 0, adminMaterials);
        const res  = await fetch('/api/admin/social-media/render', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ html, width, height }),
        });
        if (!res.ok) throw new Error(`Render failed: ${res.status}`);
        const blob = await res.blob();
        triggerBlobDownload(blob, `studytrack-${format}-slide01.png`);
      } else {
        const JSZip = (await import('jszip')).default;
        const zip   = new JSZip();

        for (let idx = 0; idx < post.slides.length; idx++) {
          const html = renderPostToHtml(post, format, idx, adminMaterials);
          const res  = await fetch('/api/admin/social-media/render', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ html, width, height }),
          });
          if (!res.ok) throw new Error(`Render slide ${idx} failed: ${res.status}`);
          const arrayBuffer = await res.arrayBuffer();
          zip.file(`studytrack-slide${String(idx + 1).padStart(2, '0')}.png`, arrayBuffer);
        }

        const blob = await zip.generateAsync({ type: 'blob' });
        triggerBlobDownload(blob, 'studytrack-carrossel.zip');
      }
    } catch (e) {
      console.error('[PostPreview] Erro no download:', e);
    } finally {
      setDownloading(false);
    }
  }, [isCarousel, format, post, adminMaterials]);

  function triggerBlobDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Área de preview */}
      <div
        ref={containerRef}
        className="flex flex-col items-center gap-4"
      >
        {/* Canvas visível (slide ativo) */}
        <div className="rounded-xl overflow-hidden shadow-lg ring-1 ring-black/10 dark:ring-white/10">
          <PostCanvas
            format={format}
            scale={scale}
            customCss={post.custom_css}
          >
            {(() => {
              const slide = post.slides[activeSlide];
              if (!slide) return null;
              return <PhotoOverlay slide={slide} format={format} adminMaterials={adminMaterials} />;
            })()}
          </PostCanvas>
        </div>

        {/* Navegação de carrossel */}
        {isCarousel && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveSlide((s) => Math.max(0, s - 1))}
              disabled={activeSlide === 0}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex gap-1.5">
              {post.slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSlide(idx)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all',
                    idx === activeSlide
                      ? 'bg-blue-600 w-4'
                      : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400'
                  )}
                />
              ))}
            </div>

            <button
              onClick={() => setActiveSlide((s) => Math.min(slideCount - 1, s + 1))}
              disabled={activeSlide === slideCount - 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronRight size={16} />
            </button>

            <span className="text-xs text-slate-400">
              {activeSlide + 1} / {slideCount}
            </span>
          </div>
        )}
      </div>

      {/* Legenda sugerida */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Legenda sugerida
        </p>
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed border border-slate-200 dark:border-slate-700">
          {post.caption}
        </div>
      </div>

      {/* Painel de ajuste (expansível) */}
      {showAdjust && (
        <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Que ajuste você quer fazer?
          </p>
          <textarea
            value={adjustText}
            onChange={(e) => setAdjustText(e.target.value)}
            placeholder='Ex: "muda a cor de fundo para azul escuro", "troca o ícone por um troféu", "encurta o headline"'
            rows={3}
            className={cn(
              'w-full rounded-lg border px-3 py-2.5 text-sm resize-none',
              'border-slate-200 dark:border-slate-700',
              'bg-white dark:bg-slate-800',
              'text-slate-800 dark:text-slate-100',
              'placeholder:text-slate-400',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            )}
          />
          <div className="flex gap-2">
            <button
              onClick={() => { onAdjust(adjustText); setAdjustText(''); setShowAdjust(false); }}
              disabled={!adjustText.trim() || adjusting}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {adjusting ? 'Ajustando...' : 'Aplicar ajuste'}
            </button>
            <button
              onClick={() => setShowAdjust(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Botões de ação */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <ActionButton
          icon={Download}
          label={downloading ? 'Baixando...' : isCarousel ? 'Baixar ZIP' : 'Baixar PNG'}
          onClick={handleDownload}
          disabled={downloading}
          primary
        />
        <ActionButton
          icon={Wand2}
          label="Ajustar"
          onClick={() => setShowAdjust((v) => !v)}
          disabled={adjusting}
        />
        <ActionButton
          icon={RefreshCw}
          label="Variação"
          onClick={onVariation}
          disabled={adjusting || saving}
        />
        {savedPostId ? (
          <ActionButton
            icon={RotateCcw}
            label="Recomeçar"
            onClick={onRestart}
          />
        ) : (
          <ActionButton
            icon={Save}
            label={saving ? 'Salvando...' : 'Salvar'}
            onClick={onSave}
            disabled={saving}
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-componente: botão de ação ─────────────────────────

function ActionButton({
  icon: Icon, label, onClick, disabled, primary,
}: {
  icon:      React.ComponentType<{ size?: number }>;
  label:     string;
  onClick:   () => void;
  disabled?: boolean;
  primary?:  boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
        primary
          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
          : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <Icon size={15} />
      <span>{label}</span>
    </button>
  );
}
