'use client';

import type { PostSlide, SocialMediaFormat } from '@/types/social-media';

interface Props {
  slide:           PostSlide;
  format:          SocialMediaFormat;
  adminMaterials?: string[];
}

interface BeforeAfterData {
  before: string[];
  after:  string[];
}

function parseData(body: string | null): BeforeAfterData {
  if (body) {
    try {
      const parsed = JSON.parse(body);
      if (Array.isArray(parsed.before) && Array.isArray(parsed.after)) {
        return parsed as BeforeAfterData;
      }
    } catch { /* não é JSON */ }
  }
  // Fallback: divide ao meio as linhas do body
  const lines = (body ?? '').split('\n').filter(Boolean).map(l => l.replace(/^[•\-\*]\s*/, ''));
  const half  = Math.ceil(lines.length / 2);
  return { before: lines.slice(0, half), after: lines.slice(half) };
}

export default function BeforeAfter({ slide }: Props) {
  const { elements } = slide;
  const data = parseData(elements.body);

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#fff',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter', Arial, sans-serif",
      border: '1px solid #e2e8f0', boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ background: '#2563eb', padding: '48px 60px', flexShrink: 0 }}>
        {elements.headline && (
          <h1 style={{ fontSize: 60, fontWeight: 900, color: '#fff', lineHeight: 1.1, margin: 0 }}>
            {elements.headline}
          </h1>
        )}
      </div>

      {/* Colunas */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>
        {/* Antes */}
        <div style={{ padding: '48px 48px 48px 60px', borderRight: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 24, overflow: 'hidden' }}>
          <p style={{ fontSize: 26, fontWeight: 700, color: '#ef4444', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
            Antes
          </p>
          {data.before.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fca5a5', flexShrink: 0, marginTop: 10 }} />
              <p style={{ fontSize: 32, color: '#374151', lineHeight: 1.4, margin: 0 }}>{item}</p>
            </div>
          ))}
        </div>

        {/* Depois */}
        <div style={{ padding: '48px 60px 48px 48px', display: 'flex', flexDirection: 'column', gap: 24, overflow: 'hidden' }}>
          <p style={{ fontSize: 26, fontWeight: 700, color: '#22c55e', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
            Depois
          </p>
          {data.after.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#86efac', flexShrink: 0, marginTop: 10 }} />
              <p style={{ fontSize: 32, color: '#374151', lineHeight: 1.4, margin: 0 }}>{item}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '28px 60px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: '#2563eb' }}>STUDYTRACK</span>
        <span style={{ fontSize: 22, color: '#94a3b8' }}>@studytrack</span>
      </div>
    </div>
  );
}
