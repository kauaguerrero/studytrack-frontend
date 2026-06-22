'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { EditableText } from '../EditableText';
import { Slide01Data } from '../../data/slides';

interface Props {
  data: Slide01Data;
  onChange: (data: Partial<Slide01Data>) => void;
  isEditing: boolean;
  forExport?: boolean;
}

export function Slide01Cover({ data, onChange, isEditing, forExport }: Props) {
  const anim = !forExport;

  return (
    <div className="relative w-full h-full flex overflow-hidden" style={{ background: '#ffffff' }}>
      {/* Left — blue gradient panel — wider */}
      <motion.div
        className="flex-shrink-0 flex flex-col items-center justify-center relative overflow-hidden"
        style={{ width: 780, background: 'linear-gradient(155deg, #4f46e5 0%, #2563eb 50%, #0ea5e9 100%)' }}
        initial={anim ? { x: -60, opacity: 0 } : false}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        <div className="absolute pointer-events-none" style={{ width: 520, height: 520, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: -140, right: -160 }} />
        <div className="absolute pointer-events-none" style={{ width: 340, height: 340, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', bottom: -90, left: -90 }} />

        {/* Logo card — bigger */}
        <div
          className="relative flex flex-col items-center justify-center rounded-3xl"
          style={{ width: 420, height: 420, background: 'rgba(255,255,255,0.96)', boxShadow: '0 24px 72px rgba(0,0,0,0.28)' }}
        >
          <div style={{ width: 300, height: 300, position: 'relative' }}>
            <Image src={data.logoUrl || '/logost-transparente.png'} alt="StudyTrack" fill className="object-contain" priority unoptimized />
          </div>
          <span className="mt-3 font-bold tracking-tight" style={{ fontSize: 30, color: '#1e3a5f' }}>Studytrack</span>
        </div>

        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }} />
          ))}
        </div>
      </motion.div>

      {/* Right — white content */}
      <motion.div
        className="flex-1 flex flex-col justify-center relative"
        style={{ padding: '0 80px' }}
        initial={anim ? { x: 50, opacity: 0 } : false}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.55, delay: 0.12, ease: 'easeOut' }}
      >
        <div className="absolute pointer-events-none" style={{ width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, #eff6ff 0%, transparent 70%)', top: -80, right: -60 }} />
        <div className="absolute pointer-events-none" style={{ width: 240, height: 240, borderRadius: '50%', border: '2px solid #dbeafe', bottom: 60, right: 80 }} />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full w-fit" style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', marginBottom: 32 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb' }} />
          <EditableText
            value={data.badge ?? 'PROPOSTA COMERCIAL · MAIS APROVAÇÃO'}
            onChange={(v) => onChange({ badge: v })}
            isEditing={isEditing}
            tag="span"
            style={{ fontSize: 16, color: '#1d4ed8', fontWeight: 700, letterSpacing: '0.1em' }}
          />
        </div>

        {/* Wordmark */}
        <EditableText
          value={data.title}
          onChange={(v) => onChange({ title: v })}
          isEditing={isEditing}
          tag="h1"
          className="font-extrabold leading-none tracking-tight"
          style={{ fontSize: 120, color: '#2563eb' }}
        />

        <div className="rounded-full" style={{ width: 100, height: 6, background: 'linear-gradient(90deg, #6366f1, #14b8a6)', margin: '28px 0' }} />

        {/* Tagline */}
        <EditableText
          value={data.tagline}
          onChange={(v) => onChange({ tagline: v })}
          isEditing={isEditing}
          tag="p"
          className="font-bold leading-tight"
          style={{ fontSize: 50, color: '#1e293b', whiteSpace: 'pre-line' }}
        />

        {/* Subtitle */}
        <EditableText
          value={data.subtitle}
          onChange={(v) => onChange({ subtitle: v })}
          isEditing={isEditing}
          tag="p"
          className="font-medium"
          style={{ fontSize: 30, color: '#64748b', marginTop: 28 }}
        />
      </motion.div>
    </div>
  );
}
