'use client';

import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { EditableText } from '../EditableText';
import { SlideDesafioData } from '../../data/slides';

interface Props {
  data: SlideDesafioData;
  onChange: (data: Partial<SlideDesafioData>) => void;
  isEditing: boolean;
  forExport?: boolean;
}

export function SlideDesafio({ data, onChange, isEditing, forExport }: Props) {
  const anim = !forExport;

  return (
    <div className="w-full h-full flex flex-col" style={{ background: 'linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%)', padding: '52px 72px 44px' }}>

      {/* Section label */}
      <motion.p
        initial={anim ? { opacity: 0, y: -8 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ fontSize: 20, fontWeight: 700, color: '#4950BC', letterSpacing: '0.12em', marginBottom: 20 }}
      >
        {data.sectionLabel}
      </motion.p>

      {/* Big bold title */}
      <motion.div
        initial={anim ? { opacity: 0, y: -10 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, delay: 0.05 }}
        style={{ marginBottom: 20 }}
      >
        <EditableText
          value={data.title}
          onChange={(v) => onChange({ title: v })}
          isEditing={isEditing}
          tag="h2"
          style={{ fontSize: 72, fontWeight: 800, color: '#111111', lineHeight: 1.1 }}
        />
      </motion.div>

      {/* 3 pain-point cards */}
      <div className="grid grid-cols-3 gap-6 flex-1">
        {data.painPoints.map((p, i) => (
          <motion.div
            key={i}
            className="flex flex-col"
            initial={anim ? { opacity: 0, y: 20 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, delay: 0.12 + i * 0.1 }}
            style={{
              background: 'linear-gradient(to bottom, #ffffff, #eff6ff)',
              border: '3px solid #c0c1d7',
              borderLeft: '16px solid #4950BC',
              borderRadius: '12px',
              padding: '40px 40px 40px 44px',
            }}
          >
            <EditableText
              value={p.title}
              onChange={(v) => { const np = [...data.painPoints]; np[i] = { ...np[i], title: v }; onChange({ painPoints: np }); }}
              isEditing={isEditing}
              tag="h3"
              style={{ fontSize: 32, fontWeight: 700, color: '#272525', marginBottom: 18, lineHeight: 1.25 }}
            />
            <EditableText
              value={p.description}
              onChange={(v) => { const np = [...data.painPoints]; np[i] = { ...np[i], description: v }; onChange({ painPoints: np }); }}
              isEditing={isEditing}
              tag="p"
              style={{ fontSize: 22, color: '#444444', lineHeight: 1.65 }}
            />
          </motion.div>
        ))}
      </div>

      {/* Closing statement */}
      <motion.div
        className="flex items-center gap-5 mt-auto pt-6"
        style={{ borderTop: '1px solid #e0e7ff' }}
        initial={anim ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <CheckCircle2 size={42} style={{ color: '#16a34a', flexShrink: 0 }} />
        <EditableText
          value={data.closing}
          onChange={(v) => onChange({ closing: v })}
          isEditing={isEditing}
          tag="p"
          style={{ fontSize: 30, fontWeight: 600, color: '#111111' }}
        />
      </motion.div>
    </div>
  );
}
