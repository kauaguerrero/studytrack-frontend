'use client';

import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { EditableText } from '../EditableText';
import { EditableImage } from '../EditableImage';
import { Slide02Data, FounderData } from '../../data/slides';

const FOUNDER_COLORS = ['#6366f1', '#14b8a6'];

interface Props {
  data: Slide02Data;
  onChange: (data: Partial<Slide02Data>) => void;
  isEditing: boolean;
  forExport?: boolean;
}

function FounderCard({ founder, index, isEditing, onChange, animate }: {
  founder: FounderData; index: number; isEditing: boolean;
  onChange: (data: Partial<FounderData>) => void; animate: boolean;
}) {
  const color = FOUNDER_COLORS[index % FOUNDER_COLORS.length];
  return (
    <motion.div
      className="flex-1 flex flex-col items-center"
      initial={animate ? { opacity: 0, y: 32 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 + index * 0.15 }}
    >
      {/* Photo */}
      <div className="relative" style={{ marginBottom: 28 }}>
        <div
          className="rounded-full overflow-hidden flex items-center justify-center"
          style={{ width: 280, height: 280, border: `6px solid ${color}`, background: '#f1f5f9', boxShadow: `0 0 0 10px ${color}18, 0 24px 56px rgba(0,0,0,0.12)` }}
        >
          {founder.photoUrl ? (
            <EditableImage src={founder.photoUrl} alt={founder.name} isEditing={isEditing} onUploaded={(url) => onChange({ photoUrl: url })} uploadPath={`team/founder-${index}`} className="w-full h-full rounded-full" />
          ) : isEditing ? (
            <EditableImage src="" alt={founder.name} isEditing={isEditing} onUploaded={(url) => onChange({ photoUrl: url })} uploadPath={`team/founder-${index}`} className="w-full h-full rounded-full" placeholderLabel="Foto" />
          ) : (
            <User size={96} style={{ color, opacity: 0.35 }} />
          )}
        </div>
        <div className="absolute -bottom-2 -right-2 flex items-center justify-center rounded-full font-extrabold text-white" style={{ width: 52, height: 52, background: color, fontSize: 22, boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}>
          {index + 1}
        </div>
      </div>

      {/* Info card */}
      <div className="w-full rounded-2xl text-center flex-1 flex flex-col justify-center" style={{ background: '#ffffff', border: `1.5px solid ${color}30`, boxShadow: `0 6px 28px ${color}12`, padding: '36px 44px' }}>
        <div className="mx-auto mb-6 rounded-full" style={{ width: 48, height: 5, background: color }} />
        <EditableText value={founder.name} onChange={(v) => onChange({ name: v })} isEditing={isEditing} tag="h3" className="font-extrabold" style={{ fontSize: 38, color: '#0f172a' }} />
        <EditableText value={founder.role} onChange={(v) => onChange({ role: v })} isEditing={isEditing} tag="p" className="font-semibold mt-2" style={{ fontSize: 24, color }} />
        <div className="mt-4 space-y-1.5">
          {founder.details.map((d, i) => (
            <EditableText key={i} value={d} onChange={(v) => { const nd = [...founder.details]; nd[i] = v; onChange({ details: nd }); }} isEditing={isEditing} tag="p" style={{ fontSize: 20, color: '#64748b' }} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function Slide02Team({ data, onChange, isEditing, forExport }: Props) {
  const anim = !forExport;
  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#f8faff' }}>
      <div style={{ height: 8, background: 'linear-gradient(90deg, #4f46e5, #2563eb, #14b8a6)' }} />
      <div className="flex-1 flex flex-col" style={{ padding: '40px 80px 48px' }}>
        <motion.div initial={anim ? { opacity: 0, y: -16 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ marginBottom: 24 }}>
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: 16 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#3b82f6' }} />
            <span style={{ fontSize: 17, color: '#1d4ed8', fontWeight: 600 }}>Fundadores</span>
          </div>
          <h2 style={{ fontSize: 68, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
            Quem está por trás da <span style={{ color: '#2563eb' }}>StudyTrack</span>
          </h2>
        </motion.div>
        <div className="flex gap-20 flex-1">
          {data.founders.map((f, i) => (
            <FounderCard key={i} founder={f} index={i} isEditing={isEditing} onChange={(partial) => { const nf = [...data.founders]; nf[i] = { ...nf[i], ...partial }; onChange({ founders: nf }); }} animate={anim} />
          ))}
        </div>
        <motion.div
          className="flex items-center justify-center mt-auto pt-5"
          style={{ borderTop: '1px solid #bfdbfe' }}
          initial={anim ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <span style={{ fontSize: 14, color: '#94a3b8' }}>studytrack.com.br · @studytrackbr</span>
        </motion.div>
      </div>
    </div>
  );
}
