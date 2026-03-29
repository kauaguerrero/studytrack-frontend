/**
 * Registro de templates do Social Media IA.
 *
 * Para adicionar um novo template:
 *   1. Crie o arquivo NomeDoTemplate.tsx nesta pasta
 *   2. Importe e adicione ao TEMPLATE_MAP abaixo
 *   3. Adicione o nome ao tipo TemplateName em src/types/social-media.ts
 */

import type { ComponentType } from 'react';
import type { PostSlide, SocialMediaFormat, TemplateName } from '@/types/social-media';

// Props compartilhadas por todos os templates
export interface TemplateProps {
  slide:           PostSlide;
  format:          SocialMediaFormat;
  adminMaterials?: string[];
  /** Número total de slides — usado pelo CarouselCover para o contador "1 / N". */
  slideCount?:     number;
}

// ── T1–T6 (primeira leva) ──────────────────────────────────────
import BoldStatement     from './BoldStatement';
import EducationalCard   from './EducationalCard';
import MotivationalQuote from './MotivationalQuote';
import Checklist         from './Checklist';
import Announcement      from './Announcement';
import StoryAnnouncement from './StoryAnnouncement';

// ── T7–T12 (segunda leva) ─────────────────────────────────────
import StudentResult from './StudentResult';
import Faq           from './Faq';
import BeforeAfter   from './BeforeAfter';
import Urgency       from './Urgency';
import StoryLink     from './StoryLink';
import CarouselCover from './CarouselCover';

// Templates ainda a implementar reusam BoldStatement como fallback temporário
function makeFallback(name: string) {
  const Fallback = (props: TemplateProps) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[SocialMediaIA] Template "${name}" ainda não implementado. Usando BoldStatement como fallback.`);
    }
    return BoldStatement(props);
  };
  Fallback.displayName = `Fallback(${name})`;
  return Fallback;
}

export const TEMPLATE_MAP: Record<TemplateName, ComponentType<TemplateProps>> = {
  // ── Feed / carrossel ──────────────────────────────────────────
  'bold-statement':     BoldStatement,
  'educational-card':   EducationalCard,
  'motivational-quote': MotivationalQuote,
  'checklist':          Checklist,
  'announcement':       Announcement,
  'student-result':     StudentResult,
  'faq':                Faq,
  'before-after':       BeforeAfter,
  'urgency':            Urgency,

  // ── Story ─────────────────────────────────────────────────────
  'story-announcement': StoryAnnouncement,
  'story-link':         StoryLink,

  // ── Carrossel ─────────────────────────────────────────────────
  'carousel-cover':     CarouselCover,
  'carousel-content':   EducationalCard,   // reutiliza layout de lista
  'carousel-cta':       makeFallback('carousel-cta'),

  // ── A implementar ─────────────────────────────────────────────
  'data-highlight':     makeFallback('data-highlight'),
  'meme-format':        makeFallback('meme-format'),
};

/**
 * Retorna o componente React para o template solicitado.
 * Se o template não existir no mapa, retorna BoldStatement como segurança.
 */
export function getTemplate(name: string): ComponentType<TemplateProps> {
  return TEMPLATE_MAP[name as TemplateName] ?? BoldStatement;
}

// Re-exporta utilitários do canvas para uso nos componentes de página
export { default as PostCanvas, captureCanvas, calcPreviewScale } from './PostCanvas';
export type { CaptureResult } from './PostCanvas';
