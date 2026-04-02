'use client';

import type { PostSlide, SocialMediaFormat } from '@/types/social-media';

interface Props {
  slide:           PostSlide;
  format:          SocialMediaFormat;
  adminMaterials?: string[];
}

/** Destaca a última palavra da headline em azul. */
function splitHeadline(headline: string): { before: string; accent: string } {
  const words = headline.trim().split(/\s+/);
  if (words.length <= 1) return { before: '', accent: headline };
  const accent = words[words.length - 1];
  const before = words.slice(0, -1).join(' ');
  return { before, accent };
}

export default function MotivationalQuote({ slide }: Props) {
  const { elements } = slide;
  const { before, accent } = splitHeadline(elements.headline ?? '');

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#fff',
      display: 'flex', flexDirection: 'column',
      padding: '80px', boxSizing: 'border-box',
      fontFamily: "'Inter', Arial, sans-serif",
      border: '1px solid #e2e8f0',
    }}>
      {/* Autor / eyebrow */}
      {elements.subheadline && (
        <p style={{ fontSize: 24, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
          {elements.subheadline}
        </p>
      )}

      {/* Centro */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 40 }}>
        {/* Linha decorativa */}
        <div style={{ width: 80, height: 6, background: '#2563eb', borderRadius: 3 }} />

        {/* Headline com palavra em destaque */}
        {elements.headline && (
          <h1 style={{ fontSize: 88, fontWeight: 900, color: '#0f172a', lineHeight: 1.05, margin: 0 }}>
            {before && <>{before} </>}
            <span style={{ color: '#2563eb' }}>{accent}</span>
          </h1>
        )}

        {elements.body && (
          <p style={{ fontSize: 34, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
            {elements.body}
          </p>
        )}
      </div>

      {/* Handle */}
      <span style={{ fontSize: 24, color: '#cbd5e1' }}>@studytrack</span>
    </div>
  );
}
