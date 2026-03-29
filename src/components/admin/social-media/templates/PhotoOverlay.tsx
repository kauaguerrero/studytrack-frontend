'use client';

/**
 * PhotoOverlay — template único de preview para todos os posts Social Media IA.
 *
 * Pipeline de renderização:
 *   fundo (DALL-E / CSS fallback) → gradiente → overlay de texto + imagens admin
 *
 * Suporta:
 *   - admin_overlays[]: logos em corners, logo-row, avatar, panel-left/right
 *   - body: texto, lista multiline, JSON before/after, countdown
 *   - font_pair: default | bold | elegant | dynamic | modern
 *   - gradiente profundo para conteúdo denso (listas, before/after ≥3 itens)
 */

import type {
  PostSlide,
  SocialMediaFormat,
  FontPair,
  SlideElements,
  AdminOverlay,
  OverlayPlacement,
} from '@/types/social-media';

const HEADING_FONT: Record<string, string> = {
  bold:    "'Montserrat', 'Arial Black', sans-serif",
  elegant: "'Playfair Display', Georgia, serif",
  dynamic: "'Oswald', Impact, sans-serif",
  modern:  "'Space Grotesk', 'Inter', system-ui, sans-serif",
  default: "'Inter', system-ui, Arial, sans-serif",
};

const BODY_FONT: Record<string, string> = {
  bold:    "'Inter', system-ui, Arial, sans-serif",
  elegant: "'Lato', 'Helvetica Neue', Arial, sans-serif",
  dynamic: "'Roboto', system-ui, Arial, sans-serif",
  modern:  "'Inter', system-ui, Arial, sans-serif",
  default: "'Inter', system-ui, Arial, sans-serif",
};

interface Props {
  slide:           PostSlide;
  format:          SocialMediaFormat;
  adminMaterials?: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveOverlays(el: SlideElements, adminMaterials?: string[]): AdminOverlay[] {
  if (!adminMaterials || adminMaterials.length === 0) return [];

  if (el.admin_overlays && el.admin_overlays.length > 0) {
    return el.admin_overlays.filter(o => adminMaterials[o.index] != null);
  }

  if (el.admin_image_index != null && adminMaterials[el.admin_image_index] != null) {
    const legacyMap: Record<string, OverlayPlacement> = {
      left:  'panel-left',
      right: 'panel-right',
      top:   'avatar',
      none:  'corner-tl',
    };
    const placement = legacyMap[el.image_placement ?? 'none'] ?? 'corner-tl';
    return [{ index: el.admin_image_index, placement }];
  }

  return [];
}

function logoHeight(size?: 'sm' | 'md' | 'lg'): number {
  return size === 'sm' ? 44 : size === 'lg' ? 88 : 56;
}

function avatarDiameter(size?: 'sm' | 'md' | 'lg'): number {
  return size === 'sm' ? 80 : size === 'lg' ? 160 : 140;
}

function isDenseContent(body: string | null | undefined): boolean {
  if (!body) return false;
  try {
    const p = JSON.parse(body);
    if (Array.isArray(p.before)) return (p.before.length + (p.after?.length ?? 0)) >= 3;
  } catch { /* not JSON */ }
  return body.split('\n').filter(Boolean).length >= 3;
}

function makeGradient(deep: boolean): string {
  return deep
    ? 'linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.96) 38%, rgba(0,0,0,0.82) 55%, rgba(0,0,0,0.45) 70%, rgba(0,0,0,0.12) 82%, transparent 92%)'
    : 'linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.85) 25%, rgba(0,0,0,0.50) 48%, rgba(0,0,0,0.15) 68%, transparent 85%)';
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PhotoOverlay({ slide, format, adminMaterials }: Props) {
  const el          = slide.elements;
  const fontPair    = (el.font_pair ?? 'default') as FontPair;
  const headingFont = HEADING_FONT[fontPair] ?? HEADING_FONT.default;
  const bodyFont    = BODY_FONT[fontPair]    ?? BODY_FONT.default;
  const isStory     = format === 'story';
  const pad         = isStory ? 72 : 60;
  const bottomPad   = isStory ? 88 : 64;

  const strongShadow = '0 2px 4px rgba(0,0,0,0.95), 0 4px 20px rgba(0,0,0,0.75), 0 8px 40px rgba(0,0,0,0.5)';
  const softShadow   = '0 1px 3px rgba(0,0,0,0.95), 0 3px 12px rgba(0,0,0,0.65)';

  const overlays  = resolveOverlays(el, adminMaterials);
  const deepGrad  = isDenseContent(el.body);
  const gradient  = makeGradient(deepGrad);

  // Panel split
  const panelOverlay = overlays.find(o => o.placement === 'panel-left' || o.placement === 'panel-right');
  if (panelOverlay && adminMaterials) {
    return (
      <SplitLayout
        el={el}
        headingFont={headingFont}
        bodyFont={bodyFont}
        pad={pad}
        bottomPad={bottomPad}
        gradient={gradient}
        strongShadow={strongShadow}
        softShadow={softShadow}
        panelOverlay={panelOverlay}
        adminMaterials={adminMaterials}
        otherOverlays={overlays.filter(o => o !== panelOverlay)}
      />
    );
  }

  const logoRowOverlays = overlays.filter(o => o.placement === 'logo-row');
  const cornerOverlays  = overlays.filter(o => (o.placement as string).startsWith('corner-'));
  const avatarOverlay   = overlays.find(o => o.placement === 'avatar');

  const BackgroundEl = el.dalle_image_url
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={el.dalle_image_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', zIndex: 0 }} />
    : <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#0d1628 0%,#1e2d52 50%,#2563eb 100%)', zIndex: 0 }} />;

  const topLeft = logoRowOverlays.length > 0 && adminMaterials
    ? <LogoRow overlays={logoRowOverlays} adminMaterials={adminMaterials} softShadow={softShadow} headingFont={headingFont} />
    : <span style={{ fontFamily: headingFont, fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.12em', textShadow: softShadow }}>STUDYTRACK</span>;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', fontFamily: bodyFont }}>
      {BackgroundEl}
      <div style={{ position: 'absolute', inset: 0, background: gradient, zIndex: 1 }} />

      {/* Top bar */}
      <div style={{ position: 'absolute', top: pad, left: pad, right: pad, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
        {topLeft}
        {el.subheadline && (
          <span style={{ background: 'rgba(37,99,235,0.85)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', color: '#fff', fontFamily: headingFont, fontSize: 20, fontWeight: 700, padding: '8px 22px', borderRadius: 100, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {el.subheadline}
          </span>
        )}
      </div>

      {/* Corner overlays */}
      {cornerOverlays.length > 0 && adminMaterials && (
        <CornerOverlays overlays={cornerOverlays} adminMaterials={adminMaterials} />
      )}

      {/* Content zone */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: `${pad}px ${pad}px ${bottomPad}px`, zIndex: 2, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {avatarOverlay && adminMaterials && (
          <AvatarEl overlay={avatarOverlay} adminMaterials={adminMaterials} />
        )}
        <ContentBlock el={el} headingFont={headingFont} bodyFont={bodyFont} strongShadow={strongShadow} softShadow={softShadow} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.55)', textShadow: softShadow }}>@studytrack</span>
          {el.cta && (
            <span style={{ background: '#2563eb', color: '#fff', fontFamily: headingFont, fontSize: 26, fontWeight: 700, padding: '16px 40px', borderRadius: 100, boxShadow: '0 4px 24px rgba(37,99,235,0.55), 0 2px 8px rgba(0,0,0,0.4)' }}>
              {el.cta}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Split layout
// ---------------------------------------------------------------------------

function SplitLayout({ el, headingFont, bodyFont, pad, bottomPad, gradient, strongShadow, softShadow, panelOverlay, adminMaterials, otherOverlays }: {
  el:             SlideElements;
  headingFont:    string;
  bodyFont:       string;
  pad:            number;
  bottomPad:      number;
  gradient:       string;
  strongShadow:   string;
  softShadow:     string;
  panelOverlay:   AdminOverlay;
  adminMaterials: string[];
  otherOverlays:  AdminOverlay[];
}) {
  const isLeft   = panelOverlay.placement === 'panel-left';
  const imgUrl   = adminMaterials[panelOverlay.index];
  const edgeGrad = isLeft
    ? 'linear-gradient(to right, transparent 65%, rgba(0,0,0,0.55) 100%)'
    : 'linear-gradient(to left, transparent 65%, rgba(0,0,0,0.55) 100%)';

  const logoRowOverlays = otherOverlays.filter(o => o.placement === 'logo-row');

  const topLeft = logoRowOverlays.length > 0
    ? <LogoRow overlays={logoRowOverlays} adminMaterials={adminMaterials} softShadow={softShadow} headingFont={headingFont} />
    : <span style={{ fontFamily: headingFont, fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.12em', textShadow: softShadow }}>STUDYTRACK</span>;

  const BgTextPanel = el.dalle_image_url
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={el.dalle_image_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', zIndex: 0 }} />
    : <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#0d1628 0%,#1e2d52 50%,#2563eb 100%)', zIndex: 0 }} />;

  const imgPanel = (
    <div style={{ width: '45%', height: '100%', position: 'relative', flexShrink: 0, overflow: 'hidden' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imgUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
      <div style={{ position: 'absolute', inset: 0, background: edgeGrad }} />
    </div>
  );

  const textPanel = (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      {BgTextPanel}
      <div style={{ position: 'absolute', inset: 0, background: gradient, zIndex: 1 }} />
      <div style={{ position: 'absolute', top: pad, left: pad, right: pad, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
        {topLeft}
        {el.subheadline && (
          <span style={{ background: 'rgba(37,99,235,0.85)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', color: '#fff', fontFamily: headingFont, fontSize: 18, fontWeight: 700, padding: '6px 18px', borderRadius: 100, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {el.subheadline}
          </span>
        )}
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: `${pad}px ${pad}px ${bottomPad}px`, zIndex: 2, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <ContentBlock el={el} headingFont={headingFont} bodyFont={bodyFont} strongShadow={strongShadow} softShadow={softShadow} compact />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.55)', textShadow: softShadow }}>@studytrack</span>
          {el.cta && (
            <span style={{ background: '#2563eb', color: '#fff', fontFamily: headingFont, fontSize: 22, fontWeight: 700, padding: '12px 28px', borderRadius: 100, boxShadow: '0 4px 24px rgba(37,99,235,0.55)' }}>
              {el.cta}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
      {isLeft ? <>{imgPanel}{textPanel}</> : <>{textPanel}{imgPanel}</>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Logo row
// ---------------------------------------------------------------------------

function LogoRow({ overlays, adminMaterials, softShadow, headingFont: _headingFont }: {
  overlays:       AdminOverlay[];
  adminMaterials: string[];
  softShadow:     string;
  headingFont:    string;
}) {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', filter: `drop-shadow(${softShadow})` }}>
      {overlays.map((o, i) => {
        const h = logoHeight(o.size);
        return (
          <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={adminMaterials[o.index]} alt="" style={{ height: h, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.65))' }} />
            {i < overlays.length - 1 && (
              <div style={{ width: 1, height: Math.round(h * 0.65), background: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Corner overlays
// ---------------------------------------------------------------------------

const CORNER_POS: Record<string, React.CSSProperties> = {
  'corner-tl': { top: 40, left: 60 },
  'corner-tr': { top: 40, right: 60 },
  'corner-bl': { bottom: 80, left: 60 },
  'corner-br': { bottom: 80, right: 60 },
};

import React from 'react';

function CornerOverlays({ overlays, adminMaterials }: {
  overlays:       AdminOverlay[];
  adminMaterials: string[];
}) {
  return (
    <>
      {overlays.map((o, i) => {
        const pos = CORNER_POS[o.placement] ?? { top: 40, left: 60 };
        const h   = logoHeight(o.size);
        return (
          <div key={i} style={{ position: 'absolute', ...pos, zIndex: 3 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={adminMaterials[o.index]} alt="" style={{ height: h, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.7))' }} />
          </div>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

function AvatarEl({ overlay, adminMaterials }: {
  overlay:        AdminOverlay;
  adminMaterials: string[];
}) {
  const d = avatarDiameter(overlay.size);
  return (
    <div style={{ width: d, height: d, borderRadius: '50%', overflow: 'hidden', border: '3px solid rgba(255,255,255,0.25)', boxShadow: '0 4px 16px rgba(0,0,0,0.5)', flexShrink: 0, marginBottom: 4 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={adminMaterials[overlay.index]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content block
// ---------------------------------------------------------------------------

function ContentBlock({ el, headingFont, bodyFont, strongShadow, softShadow, compact = false }: {
  el:           SlideElements;
  headingFont:  string;
  bodyFont:     string;
  strongShadow: string;
  softShadow:   string;
  compact?:     boolean;
}) {
  const headlineFontSize = compact ? 64 : 88;
  const bodyFontSize     = compact ? 28 : 34;
  const s  = softShadow;
  const ss = strongShadow;

  const HeadlineEl = el.headline ? (
    <h1 style={{ fontFamily: headingFont, fontSize: headlineFontSize, fontWeight: 900, color: '#fff', lineHeight: 1.06, margin: 0, textShadow: ss }}>
      {el.headline}
    </h1>
  ) : null;

  if (!el.body) return <>{HeadlineEl}</>;

  // Countdown
  const cd = (el as unknown as Record<string, unknown>).countdown as
    { days?: number; hours?: number; minutes?: number } | null | undefined;

  if (cd != null) {
    const blockFs = compact ? 56 : 72;
    const labelFs = compact ? 14 : 18;
    const days    = String(cd.days    ?? 0).padStart(2, '0');
    const hours   = String(cd.hours   ?? 0).padStart(2, '0');
    const minutes = String(cd.minutes ?? 0).padStart(2, '0');

    return (
      <>
        {HeadlineEl}
        <div style={{ display: 'flex', gap: 14 }}>
          {[{ v: days, l: 'dias' }, { v: hours, l: 'horas' }, { v: minutes, l: 'min' }].map(({ v, l }) => (
            <div key={l} style={{ background: 'rgba(37,99,235,0.8)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderRadius: 14, padding: '20px 28px', textAlign: 'center', flex: 1 }}>
              <div style={{ fontFamily: headingFont, fontSize: blockFs, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: labelFs, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>{l}</div>
            </div>
          ))}
        </div>
      </>
    );
  }

  // Before/After JSON
  try {
    const parsed = JSON.parse(el.body);
    if (Array.isArray(parsed.before) && Array.isArray(parsed.after)) {
      const colItemFs  = compact ? 26 : 30;
      const colLabelFs = compact ? 18 : 22;

      return (
        <>
          {HeadlineEl}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 4 }}>
            {(['before', 'after'] as const).map((key) => {
              const color = key === 'before' ? '#f87171' : '#4ade80';
              const label = key === 'before' ? 'Antes' : 'Depois';
              return (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span style={{ fontSize: colLabelFs, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em', textShadow: s }}>{label}</span>
                  {(parsed[key] as string[]).slice(0, 4).map((item: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 10 }} />
                      <p style={{ fontSize: colItemFs, color: 'rgba(255,255,255,0.82)', lineHeight: 1.4, margin: 0, textShadow: s }}>{item}</p>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      );
    }
  } catch { /* not JSON */ }

  // Multiline list
  const lines = el.body.split('\n').filter(Boolean)
    .map(l => l.replace(/^[\d]+[.)]\s*|^[•\-\*✓]\s*/, ''));

  if (lines.length > 1) {
    const itemFs = compact ? 26 : 30;
    const numFs  = compact ? 16 : 18;
    return (
      <>
        {HeadlineEl}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
          {lines.slice(0, 6).map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
              <span style={{ fontFamily: headingFont, fontSize: numFs, fontWeight: 900, color: '#60a5fa', flexShrink: 0, minWidth: 32, textShadow: s }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <p style={{ fontSize: itemFs, color: 'rgba(255,255,255,0.85)', lineHeight: 1.45, margin: 0, textShadow: s }}>{item}</p>
            </div>
          ))}
        </div>
      </>
    );
  }

  // Simple paragraph
  return (
    <>
      {HeadlineEl}
      <p style={{ fontFamily: bodyFont, fontSize: bodyFontSize, color: 'rgba(255,255,255,0.88)', lineHeight: 1.5, margin: 0, textShadow: softShadow }}>
        {el.body}
      </p>
    </>
  );
}
