'use client';

import { motion } from 'framer-motion';
import { BookOpen, BarChart2, ClipboardCheck, Palette, LogIn, FileText, Video, Headphones, LucideIcon } from 'lucide-react';
import { EditableText } from '../EditableText';
import { Slide03Data, FeatureData } from '../../data/slides';

const ICON_MAP: Record<string, LucideIcon> = { BookOpen, BarChart2, ClipboardCheck, Palette, LogIn, FileText, Video, Headphones };

const ICON_STYLES = [
  { bg: '#eff6ff', color: '#3b82f6', border: '#bfdbfe' },
  { bg: '#eef2ff', color: '#6366f1', border: '#c7d2fe' },
  { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  { bg: '#fdf4ff', color: '#a21caf', border: '#f0abfc' },
  { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
  { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  { bg: '#f0fdf4', color: '#0891b2', border: '#a5f3fc' },
];

function FeatureCard({ feature, index, isEditing, onChange, animate }: {
  feature: FeatureData; index: number; isEditing: boolean;
  onChange: (data: Partial<FeatureData>) => void; animate: boolean;
}) {
  const Icon = ICON_MAP[feature.iconName] ?? BookOpen;
  const s = ICON_STYLES[index % ICON_STYLES.length];
  return (
    <motion.div
      className="flex flex-col gap-4 rounded-2xl h-full"
      style={{ background: '#ffffff', border: `1.5px solid ${s.border}`, boxShadow: '0 2px 14px rgba(0,0,0,0.05)', padding: '28px 28px 32px' }}
      initial={animate ? { opacity: 0, y: 20 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 + (index % 4) * 0.07 + Math.floor(index / 4) * 0.12 }}
    >
      <div className="flex items-center justify-center rounded-xl" style={{ width: 64, height: 64, background: s.bg, border: `1.5px solid ${s.border}`, flexShrink: 0 }}>
        <Icon size={30} style={{ color: s.color }} />
      </div>
      <EditableText value={feature.title} onChange={(v) => onChange({ title: v })} isEditing={isEditing} tag="h3" className="font-bold leading-tight" style={{ fontSize: 28, color: '#0f172a' }} />
      <EditableText value={feature.description} onChange={(v) => onChange({ description: v })} isEditing={isEditing} tag="p" className="leading-relaxed" style={{ fontSize: 20, color: '#64748b' }} />
    </motion.div>
  );
}

interface Props {
  data: Slide03Data;
  onChange: (data: Partial<Slide03Data>) => void;
  isEditing: boolean;
  forExport?: boolean;
}

export function Slide03Features({ data, onChange, isEditing, forExport }: Props) {
  const anim = !forExport;

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#f8faff' }}>
      <div style={{ height: 7, background: 'linear-gradient(90deg, #4f46e5, #2563eb, #14b8a6)' }} />
      <div className="flex-1 flex flex-col" style={{ padding: '36px 64px 40px' }}>
        <motion.div initial={anim ? { opacity: 0, y: -12 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ marginBottom: 32 }}>
          <p className="font-semibold tracking-widest" style={{ fontSize: 16, color: '#6366f1', marginBottom: 10 }}>FUNCIONALIDADES</p>
          <h2 style={{ fontSize: 56, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
            O que sua instituição ganha com a <span style={{ color: '#2563eb' }}>StudyTrack</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-4 gap-4 flex-1" style={{ gridTemplateRows: 'repeat(2, 1fr)' }}>
          {data.features.map((f, i) => (
            <FeatureCard key={i} feature={f} index={i} isEditing={isEditing} onChange={(p) => { const nf = [...data.features]; nf[i] = { ...nf[i], ...p }; onChange({ features: nf }); }} animate={anim} />
          ))}
        </div>
      </div>
    </div>
  );
}
