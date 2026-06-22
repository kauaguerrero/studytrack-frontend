'use client';

import { motion } from 'framer-motion';
import { Award } from 'lucide-react';
import { EditableText } from '../EditableText';
import { EditableImage } from '../EditableImage';
import { Slide06Data } from '../../data/slides';

interface Props {
  data: Slide06Data;
  onChange: (data: Partial<Slide06Data>) => void;
  isEditing: boolean;
  forExport?: boolean;
}

export function Slide06Aprovacoes({ data, onChange, isEditing, forExport }: Props) {
  const anim = !forExport;
  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#f8faff' }}>
      <div style={{ height: 7, background: 'linear-gradient(90deg, #4f46e5, #2563eb, #14b8a6)' }} />
      <div className="flex flex-col flex-1" style={{ padding: '40px 72px 48px' }}>
        <motion.div initial={anim ? { opacity: 0, y: -12 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ marginBottom: 20 }}>
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: 16 }}>
            <Award size={16} style={{ color: '#2563eb' }} />
            <EditableText value={data.sectionLabel} onChange={(v) => onChange({ sectionLabel: v })} isEditing={isEditing} tag="span" style={{ fontSize: 15, color: '#1d4ed8', fontWeight: 700, letterSpacing: '0.08em' }} />
          </div>
          <EditableText value={data.title} onChange={(v) => onChange({ title: v })} isEditing={isEditing} tag="h2" style={{ fontSize: 66, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }} />
          <EditableText value={data.subtitle} onChange={(v) => onChange({ subtitle: v })} isEditing={isEditing} tag="p" className="italic mt-3" style={{ fontSize: 26, color: '#64748b' }} />
        </motion.div>
        <div className="flex gap-10 flex-1">
          {data.images.map((img, i) => (
            <motion.div key={i} className="flex-1 rounded-3xl overflow-hidden" style={{ border: '2px solid #bfdbfe', boxShadow: '0 16px 48px rgba(37,99,235,0.1)' }} initial={anim ? { opacity: 0, scale: 0.94 } : false} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.12 + i * 0.1 }}>
              <EditableImage src={img.url} alt={img.alt} isEditing={isEditing} onUploaded={(url) => { const ni = [...data.images]; ni[i] = { ...ni[i], url }; onChange({ images: ni }); }} uploadPath={`aprovacoes/aprovado-${i}`} className="w-full h-full" placeholderLabel="Clique para adicionar foto de aprovado" />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
