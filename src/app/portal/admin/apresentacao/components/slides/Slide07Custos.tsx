'use client';

import { motion } from 'framer-motion';
import { EditableText } from '../EditableText';
import { Slide07Data } from '../../data/slides';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';

interface Props {
  data: Slide07Data;
  onChange: (data: Partial<Slide07Data>) => void;
  isEditing: boolean;
  forExport?: boolean;
}

export function Slide07Custos({ data, onChange, isEditing, forExport }: Props) {
  const anim = !forExport;
  const pieData = data.breakdown.map((item) => ({ name: item.label, value: item.percentage, color: item.color }));

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#f8faff' }}>
      <div style={{ height: 7, background: 'linear-gradient(90deg, #4f46e5, #2563eb, #14b8a6)' }} />
      <div className="flex flex-col flex-1" style={{ padding: '36px 72px 40px' }}>
        <motion.div initial={anim ? { opacity: 0, y: -12 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ marginBottom: 16 }}>
          <EditableText value={data.title} onChange={(v) => onChange({ title: v })} isEditing={isEditing} tag="h2" style={{ fontSize: 64, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }} />
          <EditableText value={data.subtitle} onChange={(v) => onChange({ subtitle: v })} isEditing={isEditing} tag="p" style={{ fontSize: 30, color: '#2563eb', fontWeight: 600, marginTop: 10 }} />
        </motion.div>

        <div className="flex gap-16 flex-1 items-stretch">
          {/* Donut */}
          <motion.div className="flex-shrink-0 flex flex-col items-center justify-center" initial={anim ? { opacity: 0, scale: 0.85 } : false} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 }}>
            <PieChart width={480} height={480}>
              <Pie data={pieData} cx={240} cy={240} innerRadius={130} outerRadius={210} paddingAngle={4} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v) => [`${v}%`, '']} contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
            </PieChart>
            <div className="flex gap-5 mt-2">
              {data.breakdown.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div style={{ width: 13, height: 13, borderRadius: 3, background: item.color }} />
                  <span style={{ fontSize: 15, color: '#64748b' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Breakdown cards */}
          <div className="flex flex-col gap-5 flex-1 justify-center">
            {data.breakdown.map((item, i) => (
              <motion.div key={i} className="flex items-center gap-6 rounded-2xl" style={{ background: '#ffffff', border: `1.5px solid ${item.color}20`, boxShadow: `0 4px 20px ${item.color}0a`, padding: '28px 32px' }} initial={anim ? { opacity: 0, x: 24 } : false} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.15 + i * 0.1 }}>
                <div className="flex-shrink-0 flex items-center justify-center rounded-2xl font-extrabold" style={{ width: 110, height: 88, background: `${item.color}10`, border: `2px solid ${item.color}25`, fontSize: 46, color: item.color }}>{item.percentage}%</div>
                <div style={{ width: 5, height: 64, borderRadius: 9999, background: item.color, flexShrink: 0 }} />
                <div className="flex-1 flex flex-col gap-1">
                  <EditableText value={item.label} onChange={(v) => { const nb = [...data.breakdown]; nb[i] = { ...nb[i], label: v }; onChange({ breakdown: nb }); }} isEditing={isEditing} tag="p" className="font-bold" style={{ fontSize: 28, color: '#0f172a' }} />
                  <EditableText value={item.description} onChange={(v) => { const nb = [...data.breakdown]; nb[i] = { ...nb[i], description: v }; onChange({ breakdown: nb }); }} isEditing={isEditing} tag="p" style={{ fontSize: 19, color: '#64748b' }} />
                  <div className="h-1.5 rounded-full mt-2" style={{ background: `${item.color}20` }}>
                    <div className="h-full rounded-full" style={{ width: `${item.percentage}%`, background: `linear-gradient(90deg, ${item.color}80, ${item.color})` }} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="text-center mt-auto pt-4 italic" style={{ fontSize: 17, color: '#94a3b8' }}>{data.note}</p>
      </div>
    </div>
  );
}
