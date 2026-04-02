'use client';

import type { PostSlide, SocialMediaFormat } from '@/types/social-media';

interface Props {
  slide:           PostSlide;
  format:          SocialMediaFormat;
  adminMaterials?: string[];
}

export default function BoldStatement({ slide }: Props) {
  const { elements } = slide;

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#2563eb',
      display: 'flex', flexDirection: 'column',
      padding: '60px', boxSizing: 'border-box',
      fontFamily: "'Inter', Arial, sans-serif",
    }}>
      {/* Topo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'auto' }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em' }}>
          STUDYTRACK
        </span>
      </div>

      {/* Centro */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 32 }}>
        {elements.subheadline && (
          <span style={{
            background: 'rgba(255,255,255,0.15)', color: '#fff',
            fontSize: 28, fontWeight: 700,
            padding: '10px 24px', borderRadius: 100,
            width: 'fit-content', letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            {elements.subheadline}
          </span>
        )}
        {elements.headline && (
          <h1 style={{ fontSize: 96, fontWeight: 900, color: '#fff', lineHeight: 1.05, margin: 0 }}>
            {elements.headline}
          </h1>
        )}
        {elements.body && (
          <p style={{ fontSize: 36, color: 'rgba(255,255,255,0.72)', lineHeight: 1.5, margin: 0 }}>
            {elements.body}
          </p>
        )}
      </div>

      {/* Rodapé */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 40 }}>
        <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.45)' }}>@studytrack</span>
        {elements.cta && (
          <span style={{
            background: '#fff', color: '#2563eb',
            fontSize: 26, fontWeight: 700,
            padding: '16px 40px', borderRadius: 100,
          }}>
            {elements.cta}
          </span>
        )}
      </div>
    </div>
  );
}
