'use client';

import type { PostSlide, SocialMediaFormat } from '@/types/social-media';

interface Props {
  slide:           PostSlide;
  format:          SocialMediaFormat;
  adminMaterials?: string[];
}

export default function Urgency({ slide }: Props) {
  const { elements } = slide;

  const cd = (elements as any).countdown as { days?: number; hours?: number; minutes?: number } | null | undefined;
  const days    = cd?.days    != null ? String(cd.days).padStart(2, '0')    : '00';
  const hours   = cd?.hours   != null ? String(cd.hours).padStart(2, '0')   : '00';
  const minutes = cd?.minutes != null ? String(cd.minutes).padStart(2, '0') : '00';

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#0f172a',
      display: 'flex', flexDirection: 'column',
      padding: '60px', boxSizing: 'border-box',
      fontFamily: "'Inter', Arial, sans-serif",
    }}>
      {/* Logo */}
      <span style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em' }}>
        STUDYTRACK
      </span>

      {/* Centro */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40, textAlign: 'center' }}>
        {elements.subheadline && (
          <p style={{ fontSize: 28, fontWeight: 700, color: '#93c5fd', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
            {elements.subheadline}
          </p>
        )}
        {elements.headline && (
          <h1 style={{ fontSize: 80, fontWeight: 900, color: '#fff', lineHeight: 1.1, margin: 0 }}>
            {elements.headline}
          </h1>
        )}

        {/* Countdown */}
        <div style={{ display: 'flex', gap: 20 }}>
          {[{ val: days, label: 'dias' }, { val: hours, label: 'horas' }, { val: minutes, label: 'min' }].map(({ val, label }) => (
            <div key={label} style={{ background: '#2563eb', borderRadius: 16, padding: '28px 36px', textAlign: 'center' }}>
              <div style={{ fontSize: 80, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
            </div>
          ))}
        </div>

        {elements.body && (
          <p style={{ fontSize: 32, color: '#94a3b8', margin: 0 }}>
            {elements.body}
          </p>
        )}
      </div>

      {/* CTA */}
      {elements.cta && (
        <div style={{ background: '#2563eb', borderRadius: 16, padding: 40, textAlign: 'center' }}>
          <span style={{ fontSize: 36, fontWeight: 700, color: '#fff' }}>{elements.cta}</span>
        </div>
      )}
    </div>
  );
}
