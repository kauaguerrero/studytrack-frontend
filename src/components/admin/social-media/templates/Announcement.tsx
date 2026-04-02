'use client';

import type { PostSlide, SocialMediaFormat } from '@/types/social-media';

interface Props {
  slide:           PostSlide;
  format:          SocialMediaFormat;
  adminMaterials?: string[];
}

export default function Announcement({ slide, adminMaterials }: Props) {
  const { elements } = slide;

  const photo =
    elements.admin_image_index !== null &&
    adminMaterials?.[elements.admin_image_index ?? -1];

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#f8fafc',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter', Arial, sans-serif",
      boxSizing: 'border-box',
    }}>
      {/* Metade superior: imagem / ícone */}
      <div style={{
        background: '#2563eb',
        height: '40%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', flexShrink: 0, overflow: 'hidden',
      }}>
        {photo ? (
          <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            width: 200, height: 200, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 80,
          }}>
            🤝
          </div>
        )}
        {/* Badge na borda inferior */}
        {elements.subheadline && (
          <div style={{
            position: 'absolute', bottom: -1, left: '50%',
            transform: 'translateX(-50%)',
            background: '#fff',
            borderRadius: '100px 100px 0 0',
            padding: '20px 60px',
          }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
              {elements.subheadline}
            </span>
          </div>
        )}
      </div>

      {/* Metade inferior: texto */}
      <div style={{ flex: 1, padding: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
            Novidade
          </p>
          {elements.headline && (
            <h1 style={{ fontSize: 72, fontWeight: 900, color: '#0f172a', lineHeight: 1.1, margin: 0 }}>
              {elements.headline}
            </h1>
          )}
          {elements.body && (
            <p style={{ fontSize: 34, color: '#475569', lineHeight: 1.5, margin: 0 }}>
              {elements.body}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 24, color: '#cbd5e1' }}>@studytrack</span>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#2563eb' }} />
        </div>
      </div>
    </div>
  );
}
