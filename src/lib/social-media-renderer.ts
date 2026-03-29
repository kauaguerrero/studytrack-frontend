/**
 * social-media-renderer.ts
 *
 * Pipeline único: DALL-E background → gradiente de legibilidade → overlay HTML.
 *
 * Todos os slides passam por renderPhotoOverlay. O fundo é sempre:
 *   1. dalle_image_url  — imagem gerada pelo DALL-E 3 (full bleed, edge-to-edge)
 *   2. fallback CSS     — gradiente da marca quando DALL-E não está disponível
 *
 * Imagens do admin (logos, avatares) são injetadas como elementos HTML sobre o
 * fundo — nunca como fundo. O campo admin_overlays[] controla posição e tamanho
 * de cada imagem. O fallback legacy usa admin_image_index + image_placement.
 *
 * Gradiente de legibilidade:
 *   - Conteúdo simples (texto/parágrafo): gradiente padrão (cobre ~48% base)
 *   - Conteúdo denso (lista, before/after): gradiente profundo (cobre ~65% base)
 */

import type {
  GeneratedPost,
  SocialMediaFormat,
  PostSlide,
  SlideElements,
  FontPair,
  AdminOverlay,
  OverlayPlacement,
} from '@/types/social-media';
import { FORMAT_DIMENSIONS } from '@/types/social-media';

// ---------------------------------------------------------------------------
// Configuração de fontes Google
// ---------------------------------------------------------------------------

interface FontConfig {
  link:    string;
  heading: string;
  body:    string;
}

const FONT_CONFIG: Record<string, FontConfig> = {
  default: {
    link:    'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap',
    heading: "'Inter', Arial, sans-serif",
    body:    "'Inter', Arial, sans-serif",
  },
  bold: {
    link:    'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&family=Inter:wght@400;500;600&display=swap',
    heading: "'Montserrat', 'Inter', Arial, sans-serif",
    body:    "'Inter', Arial, sans-serif",
  },
  elegant: {
    link:    'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Lato:wght@300;400;700&display=swap',
    heading: "'Playfair Display', Georgia, serif",
    body:    "'Lato', Arial, sans-serif",
  },
  dynamic: {
    link:    'https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Roboto:wght@400;500;700&display=swap',
    heading: "'Oswald', Impact, sans-serif",
    body:    "'Roboto', Arial, sans-serif",
  },
  modern: {
    link:    'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&family=Inter:wght@400;500&display=swap',
    heading: "'Space Grotesk', 'Inter', Arial, sans-serif",
    body:    "'Inter', Arial, sans-serif",
  },
};

// ---------------------------------------------------------------------------
// Ponto de entrada
// ---------------------------------------------------------------------------

export function renderPostToHtml(
  post:            GeneratedPost,
  format:          SocialMediaFormat,
  slideIndex       = 0,
  adminMaterials?: string[],
): string {
  const { width, height } = FORMAT_DIMENSIONS[format];
  const slide = post.slides[slideIndex];
  if (!slide) return '';

  const fontPair  = (slide.elements.font_pair ?? 'default') as FontPair;
  const fontCfg   = FONT_CONFIG[fontPair] ?? FONT_CONFIG.default;
  const customCss = post.custom_css ? sanitizeCss(post.custom_css) : '';

  const body = renderPhotoOverlay(slide, fontCfg, format, adminMaterials);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${fontCfg.link}" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${width}px; height: ${height}px;
      overflow: hidden;
      font-family: ${fontCfg.body};
    }
    ${customCss}
  </style>
</head>
<body>${body}</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Helpers de overlay
// ---------------------------------------------------------------------------

/** Resolve a lista de AdminOverlay do slide (novo formato) ou fallback legacy. */
function resolveOverlays(el: SlideElements, adminMaterials?: string[]): AdminOverlay[] {
  if (!adminMaterials || adminMaterials.length === 0) return [];

  // Novo formato
  if (el.admin_overlays && el.admin_overlays.length > 0) {
    return el.admin_overlays.filter(o => adminMaterials[o.index] != null);
  }

  // Legacy: admin_image_index + image_placement
  if (el.admin_image_index != null && adminMaterials[el.admin_image_index] != null) {
    const legacyPlacementMap: Record<string, OverlayPlacement> = {
      left:  'panel-left',
      right: 'panel-right',
      top:   'avatar',
      none:  'corner-tl',
    };
    const placement = legacyPlacementMap[el.image_placement] ?? 'corner-tl';
    return [{ index: el.admin_image_index, placement }];
  }

  return [];
}

/** Altura em px de uma logo pelo size hint. */
function logoHeight(size?: 'sm' | 'md' | 'lg'): number {
  return size === 'sm' ? 44 : size === 'lg' ? 88 : 56;
}

/** Diâmetro em px de um avatar pelo size hint. */
function avatarDiameter(size?: 'sm' | 'md' | 'lg'): number {
  return size === 'sm' ? 80 : size === 'lg' ? 160 : 140;
}

/** Gradiente escuro de base para cima.
 * Profundidade "deep" para conteúdo denso (listas, before/after). */
function makeGradient(deep: boolean): string {
  return deep
    ? `linear-gradient(to top,
        rgba(0,0,0,0.98) 0%,
        rgba(0,0,0,0.96) 38%,
        rgba(0,0,0,0.82) 55%,
        rgba(0,0,0,0.45) 70%,
        rgba(0,0,0,0.12) 82%,
        transparent 92%)`
    : `linear-gradient(to top,
        rgba(0,0,0,0.97) 0%,
        rgba(0,0,0,0.85) 25%,
        rgba(0,0,0,0.50) 48%,
        rgba(0,0,0,0.15) 68%,
        transparent 85%)`;
}

/** Detecta se o body é conteúdo denso (lista ou before/after com ≥3 itens). */
function isDenseContent(body: string | null): boolean {
  if (!body) return false;
  try {
    const p = JSON.parse(body);
    if (Array.isArray(p.before)) return (p.before.length + p.after.length) >= 3;
  } catch { /* não é JSON */ }
  return body.split('\n').filter(Boolean).length >= 3;
}

// ---------------------------------------------------------------------------
// Renderizador principal
// ---------------------------------------------------------------------------

function renderPhotoOverlay(
  slide:           PostSlide,
  fontCfg:         FontConfig,
  format:          SocialMediaFormat,
  adminMaterials?: string[],
): string {
  const el        = slide.elements;
  const isStory   = format === 'story';
  const pad       = isStory ? 72 : 60;
  const bottomPad = isStory ? 88 : 64;

  const overlays  = resolveOverlays(el, adminMaterials);
  const deepGrad  = isDenseContent(el.body);
  const gradient  = makeGradient(deepGrad);

  const strongShadow = '0 2px 4px rgba(0,0,0,0.95), 0 4px 20px rgba(0,0,0,0.75), 0 8px 40px rgba(0,0,0,0.5)';
  const softShadow   = '0 1px 3px rgba(0,0,0,0.95), 0 3px 12px rgba(0,0,0,0.65)';

  // Se há painel lateral, usa split layout
  const panelOverlay = overlays.find(o => o.placement === 'panel-left' || o.placement === 'panel-right');
  if (panelOverlay && adminMaterials) {
    return renderSplitLayout({
      el, fontCfg, format, gradient, strongShadow, softShadow, pad, bottomPad,
      panelOverlay, adminMaterials, otherOverlays: overlays.filter(o => o !== panelOverlay),
    });
  }

  // Overlays por categoria
  const logoRowOverlays = overlays.filter(o => o.placement === 'logo-row');
  const cornerOverlays  = overlays.filter(o => (o.placement as string).startsWith('corner-'));
  const avatarOverlay   = overlays.find(o => o.placement === 'avatar');

  // Fundo: DALL-E full-bleed ou fallback CSS
  const backgroundLayer = el.dalle_image_url
    ? `<img src="${el.dalle_image_url}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:0;" />`
    : `<div style="position:absolute;inset:0;background:linear-gradient(135deg,#0d1628 0%,#1e2d52 50%,#2563eb 100%);z-index:0;"></div>`;

  // Barra superior: logos ou marca
  const topLeftHtml = logoRowOverlays.length > 0 && adminMaterials
    ? renderLogoRow(logoRowOverlays, adminMaterials, softShadow)
    : `<span style="font-family:${fontCfg.heading};font-size:22px;font-weight:700;color:rgba(255,255,255,0.75);letter-spacing:0.12em;text-shadow:${softShadow};">STUDYTRACK</span>`;

  const tagHtml = el.subheadline
    ? `<span style="background:rgba(37,99,235,0.85);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#fff;font-family:${fontCfg.heading};font-size:20px;font-weight:700;padding:8px 22px;border-radius:100px;letter-spacing:0.06em;text-transform:uppercase;">${e(el.subheadline)}</span>`
    : '';

  // Avatar acima do headline
  const avatarHtml = avatarOverlay && adminMaterials
    ? (() => {
        const d   = avatarDiameter(avatarOverlay.size);
        const url = adminMaterials[avatarOverlay.index];
        return `<div style="width:${d}px;height:${d}px;border-radius:50%;overflow:hidden;border:3px solid rgba(255,255,255,0.25);box-shadow:0 4px 16px rgba(0,0,0,0.5);flex-shrink:0;">
                  <img src="${url}" alt="" style="width:100%;height:100%;object-fit:cover;" />
                </div>`;
      })()
    : '';

  // Cantos
  const cornerHtml = cornerOverlays.length > 0 && adminMaterials
    ? renderCornerOverlays(cornerOverlays, adminMaterials, softShadow)
    : '';

  const contentHtml = renderContent(el, fontCfg, strongShadow, softShadow);

  return `
<div style="position:relative;width:100%;height:100%;overflow:hidden;font-family:${fontCfg.body};">

  ${backgroundLayer}
  <div style="position:absolute;inset:0;background:${gradient};z-index:1;"></div>

  <!-- Barra superior -->
  <div style="position:absolute;top:${pad}px;left:${pad}px;right:${pad}px;display:flex;justify-content:space-between;align-items:center;z-index:2;">
    ${topLeftHtml}
    ${tagHtml}
  </div>

  <!-- Cantos (logos em posições fixas) -->
  ${cornerHtml}

  <!-- Zona de conteúdo -->
  <div style="position:absolute;bottom:0;left:0;right:0;padding:${pad}px ${pad}px ${bottomPad}px;z-index:2;display:flex;flex-direction:column;gap:16px;">
    ${avatarHtml}
    ${contentHtml}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;">
      <span style="font-size:22px;color:rgba(255,255,255,0.55);text-shadow:${softShadow};">@studytrack</span>
      ${el.cta ? `<span style="background:#2563eb;color:#fff;font-family:${fontCfg.heading};font-size:26px;font-weight:700;padding:16px 40px;border-radius:100px;box-shadow:0 4px 24px rgba(37,99,235,0.55),0 2px 8px rgba(0,0,0,0.4);">${e(el.cta)}</span>` : ''}
    </div>
  </div>

</div>`;
}

// ---------------------------------------------------------------------------
// Logo row (fileira horizontal de logos no topo)
// ---------------------------------------------------------------------------

function renderLogoRow(
  overlays:       AdminOverlay[],
  adminMaterials: string[],
  softShadow:     string,
): string {
  const items = overlays.map((o, i) => {
    const url = adminMaterials[o.index];
    const h   = logoHeight(o.size);
    const sep = i < overlays.length - 1
      ? `<div style="width:1px;height:${Math.round(h * 0.65)}px;background:rgba(255,255,255,0.25);flex-shrink:0;"></div>`
      : '';
    return `
      <img src="${url}" alt="" style="height:${h}px;width:auto;object-fit:contain;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.65));" />
      ${sep}`;
  }).join('');

  return `<div style="display:flex;gap:16px;align-items:center;filter:drop-shadow(${softShadow});">${items}</div>`;
}

// ---------------------------------------------------------------------------
// Corner overlays (logos em cantos do canvas)
// ---------------------------------------------------------------------------

function renderCornerOverlays(
  overlays:       AdminOverlay[],
  adminMaterials: string[],
  softShadow:     string,
): string {
  const posMap: Record<string, string> = {
    'corner-tl': 'top:40px;left:60px',
    'corner-tr': 'top:40px;right:60px',
    'corner-bl': 'bottom:80px;left:60px',
    'corner-br': 'bottom:80px;right:60px',
  };

  return overlays.map(o => {
    const url = adminMaterials[o.index];
    const pos = posMap[o.placement] ?? 'top:40px;left:60px';
    const h   = logoHeight(o.size);
    return `
      <div style="position:absolute;${pos};z-index:3;">
        <img src="${url}" alt="" style="height:${h}px;width:auto;object-fit:contain;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.7));" />
      </div>`;
  }).join('');
}

// ---------------------------------------------------------------------------
// Split layout (painel de imagem + painel de texto)
// ---------------------------------------------------------------------------

function renderSplitLayout(opts: {
  el:             SlideElements;
  fontCfg:        FontConfig;
  format:         SocialMediaFormat;
  gradient:       string;
  strongShadow:   string;
  softShadow:     string;
  pad:            number;
  bottomPad:      number;
  panelOverlay:   AdminOverlay;
  adminMaterials: string[];
  otherOverlays:  AdminOverlay[];
}): string {
  const { el, fontCfg, gradient, strongShadow, softShadow, pad, bottomPad, panelOverlay, adminMaterials, otherOverlays } = opts;
  const isLeft  = panelOverlay.placement === 'panel-left';
  const imgUrl  = adminMaterials[panelOverlay.index];
  const edgeGrad = isLeft
    ? 'linear-gradient(to right, transparent 65%, rgba(0,0,0,0.55) 100%)'
    : 'linear-gradient(to left,  transparent 65%, rgba(0,0,0,0.55) 100%)';

  const bgText = el.dalle_image_url
    ? `<img src="${el.dalle_image_url}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:0;" />`
    : `<div style="position:absolute;inset:0;background:linear-gradient(135deg,#0d1628 0%,#1e2d52 50%,#2563eb 100%);z-index:0;"></div>`;

  const logoRow = otherOverlays.filter(o => o.placement === 'logo-row');
  const topLeft = logoRow.length > 0
    ? renderLogoRow(logoRow, adminMaterials, softShadow)
    : `<span style="font-family:${fontCfg.heading};font-size:20px;font-weight:700;color:rgba(255,255,255,0.75);letter-spacing:0.12em;text-shadow:${softShadow};">STUDYTRACK</span>`;

  const tagHtml = el.subheadline
    ? `<span style="background:rgba(37,99,235,0.85);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#fff;font-family:${fontCfg.heading};font-size:18px;font-weight:700;padding:6px 18px;border-radius:100px;letter-spacing:0.06em;text-transform:uppercase;">${e(el.subheadline)}</span>`
    : '';

  const contentHtml = renderContent(el, fontCfg, strongShadow, softShadow, /* compact */ true);

  const imgPanel = `
    <div style="width:45%;height:100%;position:relative;flex-shrink:0;overflow:hidden;">
      <img src="${imgUrl}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;" />
      <div style="position:absolute;inset:0;background:${edgeGrad};"></div>
    </div>`;

  const textPanel = `
    <div style="flex:1;position:relative;overflow:hidden;">
      ${bgText}
      <div style="position:absolute;inset:0;background:${gradient};z-index:1;"></div>
      <div style="position:absolute;top:${pad}px;left:${pad}px;right:${pad}px;display:flex;justify-content:space-between;align-items:center;z-index:2;">
        ${topLeft}
        ${tagHtml}
      </div>
      <div style="position:absolute;bottom:0;left:0;right:0;padding:${pad}px ${pad}px ${bottomPad}px;z-index:2;display:flex;flex-direction:column;gap:14px;">
        ${contentHtml}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
          <span style="font-size:20px;color:rgba(255,255,255,0.55);text-shadow:${softShadow};">@studytrack</span>
          ${el.cta ? `<span style="background:#2563eb;color:#fff;font-family:${fontCfg.heading};font-size:22px;font-weight:700;padding:12px 28px;border-radius:100px;box-shadow:0 4px 24px rgba(37,99,235,0.55);">${e(el.cta)}</span>` : ''}
        </div>
      </div>
    </div>`;

  return isLeft
    ? `<div style="display:flex;width:100%;height:100%;overflow:hidden;">${imgPanel}${textPanel}</div>`
    : `<div style="display:flex;width:100%;height:100%;overflow:hidden;">${textPanel}${imgPanel}</div>`;
}

// ---------------------------------------------------------------------------
// Renderização de conteúdo
// ---------------------------------------------------------------------------

function renderContent(
  el:           SlideElements,
  fontCfg:      FontConfig,
  strongShadow: string,
  softShadow:   string,
  compact       = false,
): string {
  const headlineFontSize = compact ? 64 : 88;
  const bodyFontSize     = compact ? 28 : 34;
  const s  = softShadow;
  const ss = strongShadow;

  const headlineHtml = el.headline
    ? `<h1 style="font-family:${fontCfg.heading};font-size:${headlineFontSize}px;font-weight:900;color:#fff;line-height:1.06;margin:0;text-shadow:${ss};">${e(el.headline)}</h1>`
    : '';

  if (!el.body) return headlineHtml;

  // Countdown
  const cd = (el as unknown as Record<string, unknown>).countdown as
    { days?: number; hours?: number; minutes?: number } | null | undefined;

  if (cd != null) {
    const blockFs = compact ? 56 : 72;
    const labelFs = compact ? 14 : 18;
    const days    = String(cd.days    ?? 0).padStart(2, '0');
    const hours   = String(cd.hours   ?? 0).padStart(2, '0');
    const minutes = String(cd.minutes ?? 0).padStart(2, '0');

    const block = (val: string, label: string) => `
      <div style="background:rgba(37,99,235,0.8);backdrop-filter:blur(8px);border-radius:14px;padding:20px 28px;text-align:center;flex:1;">
        <div style="font-family:${fontCfg.heading};font-size:${blockFs}px;font-weight:900;color:#fff;line-height:1;">${val}</div>
        <div style="font-size:${labelFs}px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.1em;margin-top:4px;">${label}</div>
      </div>`;

    return `${headlineHtml}
      <div style="display:flex;gap:14px;">${block(days,'dias')}${block(hours,'horas')}${block(minutes,'min')}</div>`;
  }

  // Before/After JSON
  try {
    const parsed = JSON.parse(el.body);
    if (Array.isArray(parsed.before) && Array.isArray(parsed.after)) {
      const colItemFs  = compact ? 26 : 30;
      const colLabelFs = compact ? 18 : 22;

      const col = (key: 'before' | 'after') => {
        const color = key === 'before' ? '#f87171' : '#4ade80';
        const label = key === 'before' ? 'Antes'   : 'Depois';
        const items = (parsed[key] as string[]).slice(0, 4).map(item =>
          `<div style="display:flex;gap:12px;align-items:flex-start;">
             <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;margin-top:10px;"></div>
             <p style="font-size:${colItemFs}px;color:rgba(255,255,255,0.85);line-height:1.4;margin:0;text-shadow:${s};">${e(item)}</p>
           </div>`
        ).join('');
        return `<div style="display:flex;flex-direction:column;gap:10px;">
                  <span style="font-size:${colLabelFs}px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.08em;text-shadow:${s};">${label}</span>
                  ${items}
                </div>`;
      };

      return `${headlineHtml}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:4px;">
          ${col('before')}${col('after')}
        </div>`;
    }
  } catch { /* não é JSON */ }

  // Lista multiline
  const lines = el.body.split('\n').filter(Boolean)
    .map(l => l.replace(/^[\d]+[.)]\s*|^[•\-\*✓]\s*/, ''));

  if (lines.length > 1) {
    const itemFs = compact ? 26 : 30;
    const numFs  = compact ? 16 : 18;

    const listHtml = lines.slice(0, 6).map((item, i) => `
      <div style="display:flex;gap:18px;align-items:flex-start;">
        <span style="font-family:${fontCfg.heading};font-size:${numFs}px;font-weight:900;color:#60a5fa;flex-shrink:0;min-width:32px;text-shadow:${s};">${String(i + 1).padStart(2, '0')}</span>
        <p style="font-size:${itemFs}px;color:rgba(255,255,255,0.88);line-height:1.45;margin:0;text-shadow:${s};">${e(item)}</p>
      </div>`).join('');

    return `${headlineHtml}<div style="display:flex;flex-direction:column;gap:12px;margin-top:4px;">${listHtml}</div>`;
  }

  // Parágrafo simples
  return `${headlineHtml}
    <p style="font-family:${fontCfg.body};font-size:${bodyFontSize}px;color:rgba(255,255,255,0.88);line-height:1.5;margin:0;text-shadow:${softShadow};">${e(el.body)}</p>`;
}

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

function e(s: string | null | undefined): string {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sanitizeCss(css: string): string {
  return css
    .replace(/\bbody\b/gi, '')
    .replace(/\bhtml\b/gi, '')
    .replace(/\*\s*\{/g, '')
    .replace(/position\s*:\s*fixed/gi, 'position: relative')
    .replace(/position\s*:\s*absolute/gi, 'position: relative')
    .replace(/@import\b/gi, '')
    .replace(/javascript\s*:/gi, '');
}
