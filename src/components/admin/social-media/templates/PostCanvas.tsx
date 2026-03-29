'use client';

/**
 * PostCanvas
 *
 * Wrapper base para todos os templates de Social Media IA.
 *
 * Responsabilidades:
 *  1. Manter o template sempre no tamanho nativo do formato (ex: 1080×1080px)
 *     para que html-to-image capture em alta resolução.
 *  2. Escalar o container visualmente via CSS transform para caber na tela,
 *     garantindo WYSIWYG perfeito (o que você vê = o que você baixa).
 *  3. Expor `captureRef` para que o pai possa acionar o download.
 *
 * Escala:
 *  - O div capturado (ref) vive sempre em coordenadas nativas (1080px).
 *  - O div externo declara width/height = nativo × scale, empurrando o
 *    layout para o espaço correto sem que o conteúdo "vaze".
 */

import React, { forwardRef } from 'react';
import { FORMAT_DIMENSIONS } from '@/types/social-media';
import type { SocialMediaFormat } from '@/types/social-media';

interface PostCanvasProps {
  format: SocialMediaFormat;
  /** 0–1. Calculado pelo componente pai com base no espaço disponível. */
  scale?: number;
  className?: string;
  children: React.ReactNode;
  /**
   * CSS customizado gerado pelo Claude para personalizar este post.
   * Sanitizado antes de injetar — remove seletores perigosos.
   * Escopar ao `.post-canvas` para não vazar para outros elementos da página.
   */
  customCss?: string | null;
}

/**
 * O ref exposto aponta para o div de tamanho nativo — é esse div que
 * html-to-image deve capturar com `pixelRatio: 2`.
 */
const PostCanvas = forwardRef<HTMLDivElement, PostCanvasProps>(
  ({ format, scale = 1, className, children, customCss }, ref) => {
    const { width, height } = FORMAT_DIMENSIONS[format];
    const sanitized = customCss ? sanitizeCustomCss(customCss) : null;

    return (
      /**
       * Wrapper externo: ocupa o espaço escalado no layout da página.
       * overflow: hidden previne que o conteúdo nativo (maior) apareça fora.
       */
      <div
        style={{
          width:    width  * scale,
          height:   height * scale,
          overflow: 'hidden',
          flexShrink: 0,
        }}
        className={className}
      >
        {/**
         * Div nativo: sempre em tamanho real.
         * html-to-image captura este elemento — sem transform, sem escala.
         * A transform é puramente visual para o admin.
         * Classe `post-canvas` exposta para o custom_css do Claude.
         */}
        <div
          ref={ref}
          className="post-canvas"
          style={{
            width,
            height,
            transformOrigin: 'top left',
            transform:       `scale(${scale})`,
            // Isola o contexto de stacking e garante que html-to-image
            // leia corretamente as propriedades de fundo.
            position:  'relative',
            overflow:  'hidden',
            // Fontes do sistema apenas — html-to-image não faz requests externos
            fontFamily: 'Arial, Helvetica, sans-serif',
          }}
        >
          {/* custom_css desativado temporariamente — gerava shapes indesejados */}
          {children}
        </div>
      </div>
    );
  }
);

PostCanvas.displayName = 'PostCanvas';
export default PostCanvas;


// ---------------------------------------------------------------------------
// Hook de captura — usado pelo componente de preview
// ---------------------------------------------------------------------------

import { toPng } from 'html-to-image';
import type { SocialMediaAsset } from '@/types/social-media';

export interface CaptureResult {
  blob:        Blob;
  dataUrl:     string;
  width:       number;
  height:      number;
  sizeBytes:   number;
}

/**
 * Captura o PostCanvas em resolução 2x (pixelRatio: 2).
 * O elemento deve ser o ref do PostCanvas (tamanho nativo).
 *
 * Uso:
 *   const result = await captureCanvas(canvasRef.current, 'feed_square');
 */
export async function captureCanvas(
  element: HTMLDivElement,
  format:  SocialMediaFormat,
): Promise<CaptureResult> {
  const { width, height } = FORMAT_DIMENSIONS[format];

  // Aguarda fontes carregadas antes de capturar — evita font.trim() undefined
  await document.fonts.ready;

  // pixelRatio: 2 → output real = width*2 × height*2 (ex: 2160×2160)
  // skipFonts: true  — evita TypeError: can't access property "trim", font is undefined
  // fontEmbedCSS: '' — não tenta embedar fontes externas
  const dataUrl = await toPng(element, {
    pixelRatio:   2,
    width,
    height,
    cacheBust:    true,
    skipFonts:    true,
    fontEmbedCSS: '',
  });

  const res   = await fetch(dataUrl);
  const blob  = await res.blob();

  return {
    dataUrl,
    blob,
    width:     width  * 2,
    height:    height * 2,
    sizeBytes: blob.size,
  };
}

/**
 * Calcula o scale ideal para exibir o canvas dentro de um container,
 * com padding lateral.
 *
 * @param containerWidth  Largura disponível (px)
 * @param format          Formato do post
 * @param maxScale        Limite superior (default 1 — nunca ampliar além do nativo)
 */
export function calcPreviewScale(
  containerWidth: number,
  format:         SocialMediaFormat,
  maxScale = 1,
): number {
  const { width } = FORMAT_DIMENSIONS[format];
  const padding   = 32; // px de cada lado
  const available = containerWidth - padding * 2;
  return Math.min(maxScale, available / width);
}


// ---------------------------------------------------------------------------
// Sanitização do CSS customizado
// ---------------------------------------------------------------------------

/**
 * Remove seletores e declarações perigosas do CSS gerado pelo Claude.
 * Impede que o CSS vaze para fora do canvas ou altere o layout da página.
 */
export function sanitizeCustomCss(css: string): string {
  return css
    .replace(/\bbody\b/gi, '')
    .replace(/\bhtml\b/gi, '')
    .replace(/\*\s*\{/g, '')
    .replace(/position\s*:\s*fixed/gi, 'position: relative')
    .replace(/position\s*:\s*absolute/gi, 'position: relative')
    .replace(/@import\b/gi, '')
    .replace(/javascript\s*:/gi, '');
}

// ---------------------------------------------------------------------------
// Helpers de estilo usados pelos templates
// ---------------------------------------------------------------------------

/** Retorna o CSS de fundo adequado com base no background_style do slide. */
export function resolveBackground(style: string, value: string): React.CSSProperties {
  if (style === 'gradient') {
    return { background: value };
  }
  return { backgroundColor: value };
}

/** Wrapper padrão de logo para todos os templates. */
export function BrandLogo({ size = 40, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <img
      src="/logost-transparente-sombra.png"
      alt="StudyTrack"
      style={{
        width:  size,
        height: size,
        objectFit: 'contain',
        ...style,
      }}
    />
  );
}

/** Converte um nome de ícone Lucide (ex: "BookOpen") para o componente React. */
export function LucideIcon({
  name,
  size = 32,
  color = '#ffffff',
}: {
  name:   string;
  size?:  number;
  color?: string;
}) {
  // Import dinâmico via namespace — aceitável para área admin (tree-shaking não crítico)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const icons = require('lucide-react') as Record<string, React.ComponentType<{ size?: number; color?: string }>>;

  // Normaliza: "book-open" → "BookOpen", "bookOpen" → "BookOpen"
  const normalized = name
    .split(/[-_\s]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join('');

  const Icon = icons[normalized];
  if (!Icon) return null;

  return <Icon size={size} color={color} />;
}
