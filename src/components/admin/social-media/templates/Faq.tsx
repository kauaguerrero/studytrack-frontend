'use client';

import type { PostSlide, SocialMediaFormat } from '@/types/social-media';

interface Props {
  slide:           PostSlide;
  format:          SocialMediaFormat;
  adminMaterials?: string[];
}

export default function Faq({ slide }: Props) {
  const { elements } = slide;

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#fff',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter', Arial, sans-serif",
      border: '1px solid #e2e8f0', boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ background: '#eff6ff', padding: '56px 60px 48px', borderBottom: '4px solid #2563eb', flexShrink: 0 }}>
        <p style={{ fontSize: 24, fontWeight: 700, color: '#2563eb', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 20px' }}>
          Dúvida frequente
        </p>
        {elements.headline && (
          <h1 style={{ fontSize: 64, fontWeight: 900, color: '#0f172a', lineHeight: 1.1, margin: 0 }}>
            {elements.headline}
          </h1>
        )}
      </div>

      {/* Corpo */}
      <div style={{ flex: 1, padding: '48px 60px', display: 'flex', flexDirection: 'column', gap: 32, overflow: 'hidden' }}>
        {elements.body && (
          <p style={{ fontSize: 38, color: '#374151', lineHeight: 1.6, margin: 0 }}>
            {elements.body}
          </p>
        )}
        {/* Bloco destaque */}
        {elements.subheadline && (
          <div style={{ background: '#eff6ff', borderLeft: '8px solid #2563eb', borderRadius: '0 16px 16px 0', padding: '32px 40px' }}>
            <p style={{ fontSize: 34, fontWeight: 700, color: '#1e3a8a', margin: 0 }}>
              {elements.subheadline}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '32px 60px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: '#2563eb', letterSpacing: '0.08em' }}>STUDYTRACK</span>
        <span style={{ fontSize: 22, color: '#94a3b8' }}>@studytrack</span>
      </div>
    </div>
  );
}
