'use client';

import type { PostSlide, SocialMediaFormat } from '@/types/social-media';

interface Props {
  slide:           PostSlide;
  format:          SocialMediaFormat;
  adminMaterials?: string[];
}

export default function StoryAnnouncement({ slide }: Props) {
  const { elements } = slide;

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#fff',
      display: 'flex', flexDirection: 'row',
      fontFamily: "'Inter', Arial, sans-serif",
      boxSizing: 'border-box',
    }}>
      {/* Barra lateral azul */}
      <div style={{ width: 16, background: '#2563eb', flexShrink: 0 }} />

      {/* Conteúdo */}
      <div style={{
        flex: 1,
        padding: '80px 80px 80px 64px',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
        {/* Bloco superior: eyebrow + título + descrição */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {elements.subheadline && (
            <p style={{ fontSize: 28, fontWeight: 700, color: '#2563eb', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
              {elements.subheadline}
            </p>
          )}
          {elements.headline && (
            <h1 style={{ fontSize: 96, fontWeight: 900, color: '#0f172a', lineHeight: 1.05, margin: 0 }}>
              {elements.headline}
            </h1>
          )}
          {elements.body && (
            <p style={{ fontSize: 40, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              {elements.body}
            </p>
          )}
        </div>

        {/* Bloco inferior: CTA + handle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {elements.cta && (
            <div style={{ background: '#2563eb', borderRadius: 16, padding: 40, textAlign: 'center' }}>
              <span style={{ fontSize: 36, fontWeight: 700, color: '#fff' }}>{elements.cta}</span>
            </div>
          )}
          <span style={{ fontSize: 24, color: '#cbd5e1', textAlign: 'center' }}>@studytrack</span>
        </div>
      </div>
    </div>
  );
}
