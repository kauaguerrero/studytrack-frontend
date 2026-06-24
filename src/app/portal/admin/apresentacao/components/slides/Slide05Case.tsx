'use client';

import { useEffect, useState } from 'react';
import { motion, animate } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { EditableText } from '../EditableText';
import { Slide05Data } from '../../data/slides';

interface Props {
  data: Slide05Data;
  onChange: (data: Partial<Slide05Data>) => void;
  isEditing: boolean;
  forExport?: boolean;
}

function AnimatedCounter({ target, color, forExport }: { target: number; color: string; forExport?: boolean }) {
  const [value, setValue] = useState(forExport ? target : 0);
  useEffect(() => {
    if (forExport) return;
    const ctrl = animate(0, target, { duration: 1.6, ease: 'easeOut', onUpdate(v) { setValue(Math.round(v)); } });
    return ctrl.stop;
  }, [target, forExport]);
  return <span className="font-extrabold leading-none" style={{ fontSize: 64, color }}>{value.toLocaleString('pt-BR')}</span>;
}

const BAR_COLORS = { Madrugada: '#6366f1', Manhã: '#3b82f6', Tarde: '#14b8a6', Noite: '#f59e0b' };

function RankingRow({ entry, animate: anim }: { entry: Slide05Data['ranking'][0]; animate: boolean }) {
  return (
    <motion.div
      className="flex items-center gap-4 rounded-xl"
      style={{ background: entry.position <= 3 ? `${entry.color}08` : '#f8fafc', border: entry.position <= 3 ? `1.5px solid ${entry.color}25` : '1.5px solid #f1f5f9', padding: '14px 18px' }}
      initial={anim ? { opacity: 0, x: 20 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.35 + entry.position * 0.06 }}
    >
      <div className="flex items-center justify-center rounded-full font-extrabold flex-shrink-0" style={{ width: 36, height: 36, background: entry.position <= 3 ? ['#f59e0b','#94a3b8','#cd7f32'][entry.position-1] : '#e2e8f0', color: entry.position <= 3 ? '#fff' : '#64748b', fontSize: 16 }}>
        {entry.position <= 3 ? ['🥇','🥈','🥉'][entry.position-1] : entry.position}
      </div>
      <div className="flex items-center justify-center rounded-full font-bold text-white flex-shrink-0" style={{ width: 40, height: 40, background: entry.color, fontSize: 15 }}>{entry.initials}</div>
      <div className="flex-1 min-w-0">
        <p className="font-bold truncate" style={{ fontSize: 18, color: '#0f172a' }}>{entry.name}</p>
        <p style={{ fontSize: 14, color: '#64748b' }}>{entry.subject}</p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="font-bold" style={{ fontSize: 18, color: entry.color }}>{entry.accuracy}%</p>
        <p style={{ fontSize: 13, color: '#94a3b8' }}>{entry.responses} questões</p>
      </div>
    </motion.div>
  );
}

export function Slide05Case({ data, onChange, isEditing, forExport }: Props) {
  const anim = !forExport;
  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#ffffff' }}>
      <div style={{ height: 7, background: 'linear-gradient(90deg, #4f46e5, #2563eb, #14b8a6)' }} />
      <div className="flex flex-col flex-1" style={{ padding: '28px 56px 32px', gap: 20 }}>
        {/* Header */}
        <motion.div initial={anim ? { opacity: 0, y: -10 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: 8 }}>
            <Trophy size={15} style={{ color: '#3b82f6' }} />
            <EditableText value={data.subtitle} onChange={(v) => onChange({ subtitle: v })} isEditing={isEditing} tag="span" style={{ fontSize: 15, color: '#1d4ed8', fontWeight: 600 }} />
          </div>
          <EditableText value={data.caseName} onChange={(v) => onChange({ caseName: v })} isEditing={isEditing} tag="h2" style={{ fontSize: 46, fontWeight: 800, color: '#0f172a' }} />
        </motion.div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          {data.stats.map((s, i) => (
            <motion.div key={i} className="rounded-2xl flex flex-col" style={{ background: '#f8faff', border: `1.5px solid ${s.color}20`, padding: '28px 24px' }} initial={anim ? { opacity: 0, scale: 0.88 } : false} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.08 + i * 0.07 }}>
              <AnimatedCounter target={s.value} color={s.color} forExport={forExport} />
              <p className="mt-2 font-medium" style={{ fontSize: 18, color: '#64748b' }}>{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Bottom: chart + ranking */}
        <div className="flex gap-5 flex-1 min-h-0">
          {/* Chart */}
          <motion.div className="flex-1 rounded-2xl flex flex-col" style={{ background: '#f8faff', border: '1.5px solid #e2e8f0', padding: '24px 28px' }} initial={anim ? { opacity: 0, y: 16 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.28 }}>
            <div className="flex items-center gap-3 mb-4">
              <p className="font-bold" style={{ fontSize: 20, color: '#0f172a' }}>🕐 Horários de Pico</p>
              <span style={{ fontSize: 14, color: '#94a3b8' }}>Pico: 15h</span>
              <div className="ml-auto flex gap-4">
                {Object.entries(BAR_COLORS).map(([k, c]) => (
                  <div key={k} className="flex items-center gap-1.5">
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
                    <span style={{ fontSize: 13, color: '#64748b' }}>{k}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-end gap-1" style={{ height: 280 }}>
              {data.chartData.map((pt, i) => {
                const keys = ['Madrugada','Manhã','Tarde','Noite'] as const;
                const MAX_PX = 240;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center" style={{ minWidth: 0 }}>
                    <div className="flex items-end gap-0.5 w-full" style={{ height: MAX_PX }}>
                      {keys.map((k) => { const v = pt[k]; if (!v) return <div key={k} className="flex-1" />; return <div key={k} className="flex-1 rounded-t" style={{ height: Math.round((v/100)*MAX_PX), background: BAR_COLORS[k], minWidth: 3 }} />; })}
                    </div>
                    <span style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{pt.name}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Ranking */}
          <motion.div className="rounded-2xl flex flex-col" style={{ width: 520, background: '#f8faff', border: '1.5px solid #e2e8f0', padding: '24px 24px', flexShrink: 0 }} initial={anim ? { opacity: 0, x: 20 } : false} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.32 }}>
            <div className="flex items-center gap-3 mb-4">
              <Trophy size={22} style={{ color: '#f59e0b' }} />
              <p className="font-bold" style={{ fontSize: 20, color: '#0f172a' }}>Ranking Mensal</p>
            </div>
            <div className="flex flex-col gap-2.5 flex-1">
              {data.ranking.map((entry) => <RankingRow key={entry.position} entry={entry} animate={anim} />)}
            </div>
            <div className="mt-4 px-4 py-3 rounded-xl" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <p className="text-center" style={{ fontSize: 14, color: '#2563eb', fontWeight: 500 }}>🏆 Alunos com maior engajamento na plataforma</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
