'use client';

import type { PostSlide, SocialMediaFormat } from '@/types/social-media';

interface Props {
  slide:           PostSlide;
  format:          SocialMediaFormat;
  adminMaterials?: string[];
}

export default function StudentResult({ slide, adminMaterials }: Props) {
  const { elements } = slide;

  const photo =
    elements.admin_image_index !== null &&
    adminMaterials?.[elements.admin_image_index ?? -1];

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#2563eb',
      display: 'flex', flexDirection: 'column',
      padding: '60px', boxSizing: 'border-box',
      fontFamily: "'Inter', Arial, sans-serif",
    }}>
      {/* Topo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em' }}>
          STUDYTRACK
        </span>
        <span style={{
          background: 'rgba(255,255,255,0.15)', color: '#fff',
          fontSize: 24, fontWeight: 700,
          padding: '10px 28px', borderRadius: 100,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          Aprovado!
        </span>
      </div>

      {/* Centro */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        {/* Foto circular */}
        <div style={{
          width: 220, height: 220, borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)',
          border: '6px solid rgba(255,255,255,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 80, overflow: 'hidden', flexShrink: 0,
        }}>
          {photo ? (
            <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : '👩‍🎓'}
        </div>

        {/* Nome do aluno */}
        {elements.headline && (
          <h2 style={{ fontSize: 52, fontWeight: 800, color: '#fff', margin: 0, textAlign: 'center' }}>
            {elements.headline}
          </h2>
        )}

        {/* Pontuação gigante */}
        {elements.body && (
          <div style={{ fontSize: 180, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
            {elements.body}
          </div>
        )}

        {/* Label da pontuação */}
        {elements.subheadline && (
          <p style={{ fontSize: 28, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
            {elements.subheadline}
          </p>
        )}
      </div>

      {/* Depoimento */}
      {elements.cta && (
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: '28px 36px', textAlign: 'center' }}>
          <p style={{ fontSize: 30, color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', margin: 0 }}>
            "{elements.cta}"
          </p>
        </div>
      )}
    </div>
  );
}
