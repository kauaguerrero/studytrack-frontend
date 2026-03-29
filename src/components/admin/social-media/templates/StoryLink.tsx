'use client';

import type { PostSlide, SocialMediaFormat } from '@/types/social-media';

interface Props {
  slide:           PostSlide;
  format:          SocialMediaFormat;
  adminMaterials?: string[];
}

export default function StoryLink({ slide }: Props) {
  const { elements } = slide;

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#2563eb',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter', Arial, sans-serif",
      boxSizing: 'border-box',
    }}>
      {/* Área principal (safe zone) */}
      <div style={{ flex: 1, padding: '80px 80px 0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {/* Logo */}
        <span style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em' }}>
          STUDYTRACK
        </span>

        {/* Conteúdo principal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {elements.subheadline && (
            <p style={{ fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
              {elements.subheadline}
            </p>
          )}
          {elements.headline && (
            <h1 style={{ fontSize: 100, fontWeight: 900, color: '#fff', lineHeight: 1.05, margin: 0 }}>
              {elements.headline}
            </h1>
          )}
          {elements.body && (
            <p style={{ fontSize: 40, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, margin: 0 }}>
              {elements.body}
            </p>
          )}
        </div>

        {/* CTA acima da zona de link */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingBottom: 40 }}>
          <span style={{ fontSize: 60 }}>☝️</span>
          <p style={{ fontSize: 36, fontWeight: 700, color: '#fff', margin: 0, textAlign: 'center' }}>
            Acesse pelo link abaixo
          </p>
        </div>
      </div>

      {/* Zona de link — 200px do rodapé */}
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 60px' }}>
        <div style={{
          border: '2px dashed rgba(255,255,255,0.3)',
          borderRadius: 100,
          padding: '24px 60px',
          width: '100%', textAlign: 'center',
          boxSizing: 'border-box',
        }}>
          <span style={{ fontSize: 28, color: 'rgba(255,255,255,0.6)' }}>
            {elements.cta ?? 'studytrack.com.br'}
          </span>
        </div>
      </div>
    </div>
  );
}
