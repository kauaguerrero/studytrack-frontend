'use client';

import { useRef, useState, type CSSProperties, type RefObject } from 'react';
import { Link2, Link2Off, Maximize2, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

type Props = {
  src: string;
  alt: string;
  /** Container rolável — exposto pra mesa de correção sincronizar a rolagem com o texto. */
  scrollRef?: RefObject<HTMLDivElement | null>;
  onScroll?: () => void;
  /** Quando presente, mostra o toggle de rolagem sincronizada na barra. */
  syncScroll?: { enabled: boolean; onToggle: () => void };
  className?: string;
  viewportClassName?: string;
};

/**
 * Visualizador da foto da redação manuscrita: zoom (100% = largura do painel),
 * giro de 90° e arrastar com o mouse pra navegar quando a imagem passa do painel.
 * No toque, a rolagem nativa já cobre o arrastar.
 */
export function EssayImageViewer({ src, alt, scrollRef, onScroll, syncScroll, className, viewportClassName }: Props) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const localRef = useRef<HTMLDivElement | null>(null);

  function setViewport(el: HTMLDivElement | null) {
    localRef.current = el;
    if (scrollRef) scrollRef.current = el;
  }

  const sideways = rotation % 180 !== 0;

  // Girado 90°/270°, o <img> mantém a caixa de layout original — então o
  // wrapper assume a proporção da imagem girada e o <img> é centralizado e
  // girado por dentro, com largura relativa ao wrapper (natW/natH).
  const wrapperStyle: CSSProperties = { width: `${zoom * 100}%` };
  let imgStyle: CSSProperties = { width: '100%', transform: rotation ? `rotate(${rotation}deg)` : undefined };
  if (sideways && natural) {
    wrapperStyle.aspectRatio = `${natural.h} / ${natural.w}`;
    wrapperStyle.position = 'relative';
    imgStyle = {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: `${(natural.w / natural.h) * 100}%`,
      maxWidth: 'none',
      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    };
  }

  const toolButton =
    'inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white';

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-900 dark:text-white">Foto original</p>
        <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-950">
          <button type="button" className={toolButton} title="Diminuir zoom" aria-label="Diminuir zoom" disabled={zoom <= MIN_ZOOM} onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}>
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-11 text-center text-[11px] font-semibold tabular-nums text-slate-600 dark:text-slate-300">
            {Math.round(zoom * 100)}%
          </span>
          <button type="button" className={toolButton} title="Aumentar zoom" aria-label="Aumentar zoom" disabled={zoom >= MAX_ZOOM} onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}>
            <ZoomIn className="h-4 w-4" />
          </button>
          <button type="button" className={toolButton} title="Ajustar à largura" aria-label="Ajustar à largura" disabled={zoom === 1} onClick={() => setZoom(1)}>
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={toolButton} title="Girar 90°" aria-label="Girar 90°" onClick={() => setRotation((r) => (r + 90) % 360)}>
            <RotateCw className="h-3.5 w-3.5" />
          </button>
          {syncScroll && (
            <button
              type="button"
              onClick={syncScroll.onToggle}
              aria-pressed={syncScroll.enabled}
              title={syncScroll.enabled ? 'Rolagem sincronizada com o texto (clique para desligar)' : 'Rolagem independente (clique para sincronizar com o texto)'}
              className={cn(
                'ml-0.5 inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition',
                syncScroll.enabled
                  ? 'bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] dark:text-white'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
              )}
            >
              {syncScroll.enabled ? <Link2 className="h-3.5 w-3.5" /> : <Link2Off className="h-3.5 w-3.5" />}
              Sincronizar
            </button>
          )}
        </div>
      </div>

      <div
        ref={setViewport}
        onScroll={onScroll}
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse' || e.button !== 0) return;
          const el = localRef.current;
          if (!el) return;
          dragRef.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
          setDragging(true);
          el.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const el = localRef.current;
          const start = dragRef.current;
          if (!el || !start) return;
          el.scrollLeft = start.left - (e.clientX - start.x);
          el.scrollTop = start.top - (e.clientY - start.y);
        }}
        onPointerUp={() => {
          dragRef.current = null;
          setDragging(false);
        }}
        onPointerCancel={() => {
          dragRef.current = null;
          setDragging(false);
        }}
        className={cn(
          'min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900',
          dragging ? 'cursor-grabbing select-none' : 'cursor-grab',
          viewportClassName,
        )}
      >
        <div className="mx-auto" style={wrapperStyle}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            draggable={false}
            onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            className="block select-none"
            style={imgStyle}
          />
        </div>
      </div>
    </div>
  );
}
