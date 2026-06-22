'use client';

import { motion } from 'framer-motion';
import { Upload, Edit3, Star, TrendingUp } from 'lucide-react';
import { EditableText } from '../EditableText';
import { Slide04Data } from '../../data/slides';

const FLOW_ICONS = [Upload, Edit3, Star, TrendingUp];
const FLOW_COLORS = ['#6366f1', '#3b82f6', '#14b8a6', '#10b981'];
const METRIC_ICONS = ['📊', '👤', '🕐', '📋'];

interface Props {
  data: Slide04Data;
  onChange: (data: Partial<Slide04Data>) => void;
  isEditing: boolean;
  forExport?: boolean;
}

export function Slide04Redacao({ data, onChange, isEditing, forExport }: Props) {
  const anim = !forExport;

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#ffffff' }}>
      <div style={{ height: 7, background: 'linear-gradient(90deg, #4f46e5, #2563eb, #14b8a6)' }} />

      <motion.div style={{ padding: '28px 64px 20px' }} initial={anim ? { opacity: 0, y: -10 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h2 style={{ fontSize: 56, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
          Correção de Redação e <span style={{ color: '#2563eb' }}>Metrificação de Desempenho</span>
        </h2>
      </motion.div>

      <div className="flex gap-0 flex-1" style={{ padding: '0 64px 36px', gap: 24 }}>
        {/* LEFT — Redação Flow */}
        <motion.div
          className="flex-1 rounded-3xl flex flex-col"
          style={{ background: 'linear-gradient(155deg, #eff6ff 0%, #f5f3ff 100%)', border: '1.5px solid #c7d2fe', padding: '32px 36px' }}
          initial={anim ? { opacity: 0, x: -20 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center justify-center rounded-2xl" style={{ width: 56, height: 56, background: '#6366f1', flexShrink: 0 }}>
              <Edit3 size={26} style={{ color: 'white' }} />
            </div>
            <div>
              <p style={{ fontSize: 14, color: '#6366f1', fontWeight: 700, letterSpacing: '0.1em' }}>FLUXO DIGITAL</p>
              <p style={{ fontSize: 30, fontWeight: 800, color: '#0f172a' }}>Correção de Redação</p>
            </div>
          </div>

          <div className="flex flex-col flex-1 justify-between">
            {data.flowSteps.map((step, i) => {
              const Icon = FLOW_ICONS[i % FLOW_ICONS.length];
              const color = FLOW_COLORS[i % FLOW_COLORS.length];
              const isLast = i === data.flowSteps.length - 1;
              return (
                <div key={i} className="flex items-start gap-0">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center rounded-2xl relative z-10" style={{ width: 56, height: 56, background: `${color}15`, border: `2px solid ${color}40`, flexShrink: 0 }}>
                      <Icon size={24} style={{ color }} />
                      <div className="absolute -top-2 -right-2 flex items-center justify-center rounded-full font-bold text-white" style={{ width: 22, height: 22, background: color, fontSize: 11 }}>{step.number}</div>
                    </div>
                    {!isLast && <div style={{ width: 2, height: 28, background: `${color}30`, margin: '3px 0' }} />}
                  </div>
                  <div style={{ marginLeft: 20, paddingBottom: isLast ? 0 : 8 }}>
                    <p className="font-bold" style={{ fontSize: 22, color: '#0f172a' }}>{step.title}</p>
                    <p style={{ fontSize: 17, color: '#64748b', marginTop: 3 }}>{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 px-5 py-3 rounded-2xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid #c7d2fe' }}>
            <EditableText value={data.flowQuote} onChange={(v) => onChange({ flowQuote: v })} isEditing={isEditing} tag="p" className="text-center font-semibold italic" style={{ fontSize: 20, color: '#4f46e5' }} />
          </div>
        </motion.div>

        {/* RIGHT — Metrics */}
        <motion.div
          className="flex-1 rounded-3xl flex flex-col"
          style={{ background: 'linear-gradient(155deg, #f0fdf4 0%, #eff6ff 100%)', border: '1.5px solid #bbf7d0', padding: '32px 36px' }}
          initial={anim ? { opacity: 0, x: 20 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center justify-center rounded-2xl" style={{ width: 56, height: 56, background: '#14b8a6', flexShrink: 0 }}>
              <TrendingUp size={26} style={{ color: 'white' }} />
            </div>
            <div>
              <p style={{ fontSize: 14, color: '#14b8a6', fontWeight: 700, letterSpacing: '0.1em' }}>DADOS EM TEMPO REAL</p>
              <p style={{ fontSize: 30, fontWeight: 800, color: '#0f172a' }}>Metrificação de Desempenho</p>
            </div>
          </div>

          <p style={{ fontSize: 20, color: '#64748b', marginBottom: 24, lineHeight: 1.55 }}>
            Dashboards em tempo real para acompanhar o progresso de cada aluno, turma e da instituição como um todo.
          </p>

          <div className="grid grid-cols-2 gap-4 flex-1" style={{ gridAutoRows: '1fr' }}>
            {data.metrics.map((m, i) => (
              <motion.div
                key={i}
                className="flex flex-col rounded-2xl justify-between"
                style={{ background: '#ffffff', border: `1.5px solid ${m.color}25`, boxShadow: `0 4px 16px ${m.color}10`, padding: '32px 28px' }}
                initial={anim ? { scale: 0.88, opacity: 0 } : false}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
              >
                <span style={{ fontSize: 16, marginBottom: 6 }}>{METRIC_ICONS[i]}</span>
                <EditableText value={m.value} onChange={(v) => { const nm = [...data.metrics]; nm[i] = { ...nm[i], value: v }; onChange({ metrics: nm }); }} isEditing={isEditing} tag="p" className="font-extrabold leading-none" style={{ fontSize: 60, color: m.color }} />
                <EditableText value={m.label} onChange={(v) => { const nm = [...data.metrics]; nm[i] = { ...nm[i], label: v }; onChange({ metrics: nm }); }} isEditing={isEditing} tag="p" className="font-medium mt-2" style={{ fontSize: 18, color: '#64748b' }} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
