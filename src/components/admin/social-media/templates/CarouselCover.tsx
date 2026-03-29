'use client';

import type { PostSlide, SocialMediaFormat } from '@/types/social-media';

interface Props {
  slide:           PostSlide;
  format:          SocialMediaFormat;
  adminMaterials?: string[];
  slideCount?:     number;
}

export default function CarouselCover({ slide, slideCount }: Props) {
  const { elements } = slide;
  const total = slideCount ?? (slide as any).slide_count ?? '?';

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#fff',
      display: 'flex', flexDirection: 'column',
      padding: '80px', boxSizing: 'border-box',
      fontFamily: "'Inter', Arial, sans-serif",
      border: '1px solid #e2e8f0',
    }}>
      {/* Topo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: '#2563eb', letterSpacing: '0.08em' }}>STUDYTRACK</span>
        <span style={{ fontSize: 22, color: '#cbd5e1' }}>1 / {total}</span>
      </div>

      {/* Centro */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24, position: 'relative', overflow: 'hidden' }}>
        {/* Número decorativo */}
        <div style={{
          fontSize: 320, fontWeight: 900, color: '#eff6ff',
          lineHeight: 1, position: 'absolute',
          top: '50%', left: -20,
          transform: 'translateY(-50%)',
          zIndex: 0, userSelect: 'none',
          pointerEvents: 'none',
        }}>
          01
        </div>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {elements.headline && (
            <h1 style={{ fontSize: 88, fontWeight: 900, color: '#0f172a', lineHeight: 1.05, margin: 0 }}>
              {elements.headline}
            </h1>
          )}
          {elements.body && (
            <p style={{ fontSize: 36, color: '#64748b', lineHeight: 1.5, margin: 0 }}>
              {elements.body}
            </p>
          )}
        </div>
      </div>

      {/* Rodapé */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 40, height: 8, borderRadius: 4, background: '#2563eb' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#dbeafe' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#dbeafe' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#dbeafe' }} />
        </div>
        <span style={{ fontSize: 22, color: '#94a3b8' }}>arraste para ver →</span>
      </div>
    </div>
  );
}
