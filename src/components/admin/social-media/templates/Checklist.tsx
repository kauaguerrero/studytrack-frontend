'use client';

import type { PostSlide, SocialMediaFormat } from '@/types/social-media';

interface Props {
  slide:           PostSlide;
  format:          SocialMediaFormat;
  adminMaterials?: string[];
}

function parseItems(body: string | null): string[] {
  if (!body) return [];
  try {
    const parsed = JSON.parse(body);
    if (Array.isArray(parsed)) return parsed as string[];
  } catch { /* não é JSON */ }
  return body.split(/\n|•|·|\|\//).map((s: string) => s.trim()).filter(Boolean);
}

export default function Checklist({ slide }: Props) {
  const { elements } = slide;
  const items = parseItems(elements.body);

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#eff6ff',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter', Arial, sans-serif",
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ background: '#2563eb', padding: '56px 60px 48px', flexShrink: 0 }}>
        {elements.subheadline && (
          <p style={{ fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 16px' }}>
            {elements.subheadline}
          </p>
        )}
        {elements.headline && (
          <h1 style={{ fontSize: 72, fontWeight: 900, color: '#fff', lineHeight: 1.1, margin: 0 }}>
            {elements.headline}
          </h1>
        )}
      </div>

      {/* Itens */}
      <div style={{ flex: 1, padding: '48px 60px', display: 'flex', flexDirection: 'column', gap: 24, overflow: 'hidden' }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', gap: 28, alignItems: 'center',
            background: '#fff', borderRadius: 16, padding: '32px 36px',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: '#dbeafe',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#2563eb' }} />
            </div>
            <p style={{ fontSize: 34, fontWeight: 600, color: '#1e293b', margin: 0, lineHeight: 1.4 }}>
              {item}
            </p>
          </div>
        ))}
        {items.length === 0 && elements.body && (
          <p style={{ fontSize: 34, color: '#1e293b', margin: 0, lineHeight: 1.5 }}>{elements.body}</p>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '32px 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: '#2563eb', letterSpacing: '0.08em' }}>STUDYTRACK</span>
        <span style={{ fontSize: 22, color: '#94a3b8' }}>@studytrack</span>
      </div>
    </div>
  );
}
