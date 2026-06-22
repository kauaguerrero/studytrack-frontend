'use client';

import { motion } from 'framer-motion';
import { Check, Zap } from 'lucide-react';
import { EditableText } from '../EditableText';
import { Slide08Data } from '../../data/slides';

interface Props {
  data: Slide08Data;
  onChange: (data: Partial<Slide08Data>) => void;
  isEditing: boolean;
  forExport?: boolean;
}

export function Slide08Proposta({ data, onChange, isEditing, forExport }: Props) {
  const anim = !forExport;
  return (
    <div className="w-full h-full flex" style={{ background: '#f8faff' }}>
      {/* Left — blue gradient pricing panel — wider */}
      <motion.div
        className="flex flex-col justify-center relative overflow-hidden"
        style={{ width: 720, background: 'linear-gradient(155deg, #4f46e5 0%, #2563eb 60%, #0ea5e9 100%)', flexShrink: 0, padding: '56px 64px' }}
        initial={anim ? { x: -40, opacity: 0 } : false}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute pointer-events-none" style={{ width: 500, height: 500, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', top: -150, right: -170 }} />
        <div className="absolute pointer-events-none" style={{ width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', bottom: -80, left: -80 }} />

        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full w-fit" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', marginBottom: 28 }}>
          <Zap size={16} style={{ color: '#fbbf24' }} />
          <span style={{ fontSize: 16, color: '#ffffff', fontWeight: 700, letterSpacing: '0.1em' }}>{data.label}</span>
        </div>

        <EditableText value={data.clientName} onChange={(v) => onChange({ clientName: v })} isEditing={isEditing} tag="p" style={{ fontSize: 28, color: 'rgba(255,255,255,0.7)', marginBottom: 20 }} />

        {/* Price — bigger */}
        <div className="flex items-end gap-2" style={{ marginBottom: 20 }}>
          <EditableText value={data.price} onChange={(v) => onChange({ price: v })} isEditing={isEditing} tag="span" className="font-extrabold leading-none" style={{ fontSize: 108, color: '#ffffff' }} />
          <EditableText value={data.period} onChange={(v) => onChange({ period: v })} isEditing={isEditing} tag="span" className="font-bold" style={{ fontSize: 34, color: 'rgba(255,255,255,0.7)', marginBottom: 16 }} />
        </div>

        <div className="inline-block px-6 py-3 rounded-xl font-bold w-fit" style={{ background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.3)', color: '#ffffff', fontSize: 22, marginBottom: 28 }}>
          ✦ {data.badge}
        </div>

        <EditableText value={data.footer} onChange={(v) => onChange({ footer: v })} isEditing={isEditing} tag="p" className="italic" style={{ fontSize: 17, color: 'rgba(255,255,255,0.5)' }} />
      </motion.div>

      {/* Right — features checklist */}
      <motion.div
        className="flex-1 flex flex-col"
        style={{ padding: '56px 60px' }}
        initial={anim ? { x: 32, opacity: 0 } : false}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <p className="font-bold" style={{ fontSize: 20, color: '#94a3b8', letterSpacing: '0.1em', marginBottom: 32 }}>INCLUÍDO NA PROPOSTA</p>

        <div className="flex flex-col gap-6 flex-1">
          {data.features.map((feature, i) => (
            <motion.div key={i} className="flex items-center gap-5" initial={anim ? { opacity: 0, x: 16 } : false} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.2 + i * 0.06 }}>
              <div className="flex-shrink-0 flex items-center justify-center rounded-full" style={{ width: 40, height: 40, background: '#eff6ff', border: '1.5px solid #bfdbfe' }}>
                <Check size={18} style={{ color: '#2563eb' }} />
              </div>
              <EditableText value={feature} onChange={(v) => { const nf = [...data.features]; nf[i] = v; onChange({ features: nf }); }} isEditing={isEditing} tag="span" style={{ fontSize: 26, color: '#1e293b', fontWeight: 500 }} />
            </motion.div>
          ))}
        </div>

        <motion.div className="mt-auto px-8 py-6 rounded-2xl" style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe' }} initial={anim ? { opacity: 0, y: 12 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.65 }}>
          <p style={{ fontSize: 20, color: '#1d4ed8', fontWeight: 600 }}>💬 Suporte direto com os devs — sem tickets, sem espera, sem intermediários.</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
