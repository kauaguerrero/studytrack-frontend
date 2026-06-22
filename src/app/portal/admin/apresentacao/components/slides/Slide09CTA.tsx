'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { EditableText } from '../EditableText';
import { Slide09Data } from '../../data/slides';

interface Props {
  data: Slide09Data;
  onChange: (data: Partial<Slide09Data>) => void;
  isEditing: boolean;
  forExport?: boolean;
}

export function Slide09CTA({ data, onChange, isEditing, forExport }: Props) {
  const anim = !forExport;
  return (
    <div className="w-full h-full relative overflow-hidden flex flex-col items-center justify-center" style={{ background: 'linear-gradient(145deg, #eff6ff 0%, #e0e7ff 40%, #f5f3ff 100%)' }}>
      <div className="absolute pointer-events-none" style={{ width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', top: -200, right: -150 }} />
      <div className="absolute pointer-events-none" style={{ width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,184,166,0.07) 0%, transparent 70%)', bottom: -150, left: -80 }} />
      <div className="absolute pointer-events-none" style={{ width: 320, height: 320, borderRadius: '50%', border: '2px solid rgba(37,99,235,0.12)', bottom: 60, right: 120 }} />

      {/* Logo */}
      <motion.div initial={anim ? { scale: 0.75, opacity: 0, y: -20 } : false} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }} style={{ marginBottom: 20 }}>
        <div className="flex flex-col items-center justify-center rounded-3xl" style={{ width: 280, height: 280, background: '#ffffff', boxShadow: '0 0 0 5px #bfdbfe, 0 28px 72px rgba(37,99,235,0.18)' }}>
          <div style={{ width: 180, height: 180, position: 'relative' }}>
            <Image src={data.logoUrl || '/logost-transparente.png'} alt="StudyTrack" fill className="object-contain" priority unoptimized />
          </div>
          <span style={{ fontSize: 24, fontWeight: 700, color: '#1e3a5f', marginTop: 10 }}>Studytrack</span>
        </div>
      </motion.div>

      {/* Main text */}
      <motion.div className="flex flex-col items-center text-center" initial={anim ? { opacity: 0, y: 24 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
        <EditableText value={data.mainText} onChange={(v) => onChange({ mainText: v })} isEditing={isEditing} tag="p" className="font-bold" style={{ fontSize: 64, color: '#0f172a', lineHeight: 1.2 }} />
        <EditableText value={data.highlightText} onChange={(v) => onChange({ highlightText: v })} isEditing={isEditing} tag="p" className="font-extrabold" style={{ fontSize: 64, color: '#2563eb', lineHeight: 1.2 }} />

        <div className="rounded-full" style={{ width: 96, height: 6, background: 'linear-gradient(90deg, #6366f1, #14b8a6)', margin: '16px 0' }} />

        <EditableText value={data.contact} onChange={(v) => onChange({ contact: v })} isEditing={isEditing} tag="p" className="italic font-medium" style={{ fontSize: 28, color: '#64748b' }} />

        {/* Next step CTA */}
        <motion.div className="flex items-center gap-5 rounded-2xl" style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', padding: '24px 40px', marginTop: 24, maxWidth: 960 }} initial={anim ? { opacity: 0, y: 12 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }}>
          <span style={{ fontSize: 32 }}>📅</span>
          <div className="flex-1 text-left">
            <p style={{ fontSize: 14, color: '#2563eb', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>PRÓXIMO PASSO</p>
            <EditableText value={data.nextStep ?? 'Agende 15 minutos pra ver a plataforma funcionando com dados reais do seu cursinho'} onChange={(v) => onChange({ nextStep: v })} isEditing={isEditing} tag="p" style={{ fontSize: 22, color: '#1e293b', fontWeight: 500 }} />
          </div>
          <div className="flex-shrink-0 px-6 py-3 rounded-xl font-semibold" style={{ background: '#2563eb', color: '#fff', fontSize: 18, whiteSpace: 'nowrap' }}>
            <EditableText value={data.validity ?? 'Proposta válida por 15 dias'} onChange={(v) => onChange({ validity: v })} isEditing={isEditing} tag="span" style={{ color: '#fff', fontWeight: 600 }} />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
