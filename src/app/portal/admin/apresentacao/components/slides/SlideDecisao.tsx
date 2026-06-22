'use client';

import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { EditableText } from '../EditableText';
import { SlideDecisaoData } from '../../data/slides';

interface Props {
  data: SlideDecisaoData;
  onChange: (data: Partial<SlideDecisaoData>) => void;
  isEditing: boolean;
  forExport?: boolean;
}

const ITEM_COLORS  = ['#16a34a', '#2563eb', '#6366f1'];
const ITEM_BG      = ['#f0fdf4', '#eff6ff', '#eef2ff'];
const ITEM_BORDER  = ['#bbf7d0', '#bfdbfe', '#c7d2fe'];

export function SlideDecisao({ data, onChange, isEditing, forExport }: Props) {
  const anim = !forExport;
  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#f8faff' }}>
      <div style={{ height: 7, background: 'linear-gradient(90deg, #4f46e5, #2563eb, #14b8a6)' }} />
      <div className="flex flex-col flex-1" style={{ padding: '44px 72px 48px' }}>
        <motion.div initial={anim ? { opacity: 0, y: -12 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ marginBottom: 20 }}>
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full" style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', marginBottom: 16 }}>
            <ShieldCheck size={16} style={{ color: '#16a34a' }} />
            <EditableText value={data.sectionLabel} onChange={(v) => onChange({ sectionLabel: v })} isEditing={isEditing} tag="span" style={{ fontSize: 15, color: '#15803d', fontWeight: 700, letterSpacing: '0.1em' }} />
          </div>
          <EditableText value={data.title} onChange={(v) => onChange({ title: v })} isEditing={isEditing} tag="h2" style={{ fontSize: 72, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }} />
        </motion.div>

        <div className="flex flex-col gap-5 flex-1">
          {data.items.map((item, i) => {
            const color = ITEM_COLORS[i % ITEM_COLORS.length];
            return (
              <motion.div
                key={i}
                className="flex items-center gap-8 rounded-2xl flex-1"
                style={{ background: `linear-gradient(135deg, #ffffff, ${ITEM_BG[i % ITEM_BG.length]})`, border: `1.5px solid ${ITEM_BORDER[i % ITEM_BORDER.length]}`, boxShadow: `0 4px 20px ${color}08`, padding: '36px 40px' }}
                initial={anim ? { opacity: 0, x: -24 } : false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.1 + i * 0.12 }}
              >
                <div className="flex-shrink-0 flex items-center justify-center rounded-full font-extrabold text-white" style={{ width: 72, height: 72, background: color, fontSize: 34, boxShadow: `0 6px 20px ${color}40` }}>✓</div>
                <div style={{ width: 5, height: 64, borderRadius: 9999, background: color, flexShrink: 0 }} />
                <div className="flex-1">
                  <EditableText value={item.title} onChange={(v) => { const ni = [...data.items]; ni[i] = { ...ni[i], title: v }; onChange({ items: ni }); }} isEditing={isEditing} tag="p" className="font-bold mb-2" style={{ fontSize: 36, color: '#0f172a' }} />
                  <EditableText value={item.description} onChange={(v) => { const ni = [...data.items]; ni[i] = { ...ni[i], description: v }; onChange({ items: ni }); }} isEditing={isEditing} tag="p" style={{ fontSize: 22, color: '#64748b' }} />
                </div>
                <div className="flex-shrink-0 px-6 py-2.5 rounded-xl font-semibold" style={{ background: ITEM_BG[i % ITEM_BG.length], color, fontSize: 18, border: `1px solid ${ITEM_BORDER[i % ITEM_BORDER.length]}` }}>Incluso</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
