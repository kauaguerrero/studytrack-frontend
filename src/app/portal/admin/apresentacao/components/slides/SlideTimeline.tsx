'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { EditableText } from '../EditableText';
import { SlideTimelineData } from '../../data/slides';

interface Props {
  data: SlideTimelineData;
  onChange: (data: Partial<SlideTimelineData>) => void;
  isEditing: boolean;
  forExport?: boolean;
}

const LOGO_PATHS = [
  '/marketing/logo opus.png',
  '/marketing/logo ave.jpg',
  '/marketing/logo JR.jpg',
];

export function SlideTimeline({ data, onChange, isEditing, forExport }: Props) {
  const anim = !forExport;

  return (
    <div
      className="w-full h-full flex flex-col relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}
    >
      <div style={{ height: 7, background: 'linear-gradient(90deg, #4f46e5, #2563eb, #14b8a6)' }} />

      <motion.div
        className="flex flex-col items-center"
        style={{ padding: '76px 80px 0' }}
        initial={anim ? { opacity: 0, y: -12 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <EditableText
          value={data.title}
          onChange={(v) => onChange({ title: v })}
          isEditing={isEditing}
          tag="h2"
          style={{ color: '#ffffff', fontSize: 64, fontWeight: 800, lineHeight: 1.1, textAlign: 'center' }}
        />
        <EditableText
          value={data.subtitle}
          onChange={(v) => onChange({ subtitle: v })}
          isEditing={isEditing}
          tag="p"
          style={{ color: '#94a3b8', fontSize: 28, marginTop: 18, textAlign: 'center' }}
        />
      </motion.div>

      <div className="flex-1 flex items-center justify-center" style={{ padding: '0 110px 72px' }}>
        <div className="relative w-full">
          <div
            className="absolute left-0 right-0"
            style={{ height: 4, background: '#334155', top: 50 }}
          />
          <div className="grid grid-cols-3 relative">
            {data.entries.map((entry, i) => {
              const isActive = entry.status === 'active';
              const statusColor = isActive ? '#16a34a' : '#f59e0b';
              const statusBackground = isActive ? '#16a34a22' : '#f59e0b22';
              const logoPath = LOGO_PATHS[i];

              return (
                <motion.div
                  key={i}
                  className="flex flex-col items-center"
                  initial={anim ? { opacity: 0, y: 24 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.1 * i }}
                >
                  <div
                    className="flex items-center justify-center relative z-10"
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: '50%',
                      background: '#ffffff',
                      border: `4px solid ${statusColor}`,
                      overflow: 'hidden',
                      padding: 10,
                      boxShadow: `0 18px 44px ${statusColor}55`,
                    }}
                  >
                    {logoPath ? (
                      <Image
                        src={logoPath}
                        alt={`Logo ${entry.name}`}
                        fill
                        className="object-contain"
                        sizes="100px"
                        unoptimized
                        style={{ padding: 10 }}
                      />
                    ) : (
                      <span style={{ color: statusColor, fontSize: 42, fontWeight: 800 }}>
                        {entry.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <EditableText
                    value={entry.name}
                    onChange={(v) => {
                      const entries = [...data.entries];
                      entries[i] = { ...entries[i], name: v };
                      onChange({ entries });
                    }}
                    isEditing={isEditing}
                    tag="h3"
                    style={{ color: '#ffffff', fontSize: 32, fontWeight: 800, marginTop: 34, textAlign: 'center' }}
                  />

                  <EditableText
                    value={entry.statusLabel}
                    onChange={(v) => {
                      const entries = [...data.entries];
                      entries[i] = { ...entries[i], statusLabel: v };
                      onChange({ entries });
                    }}
                    isEditing={isEditing}
                    tag="p"
                    style={{
                      background: statusBackground,
                      border: `1px solid ${statusColor}`,
                      color: statusColor,
                      fontSize: 20,
                      fontWeight: 700,
                      padding: '6px 20px',
                      borderRadius: 999,
                      marginTop: 14,
                      textAlign: 'center',
                    }}
                  />

                  <EditableText
                    value={entry.description}
                    onChange={(v) => {
                      const entries = [...data.entries];
                      entries[i] = { ...entries[i], description: v };
                      onChange({ entries });
                    }}
                    isEditing={isEditing}
                    tag="p"
                    style={{
                      color: '#94a3b8',
                      fontSize: 20,
                      lineHeight: 1.45,
                      textAlign: 'center',
                      maxWidth: 360,
                      marginTop: 18,
                    }}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="absolute" style={{ right: 52, bottom: 36, color: '#475569', fontSize: 18 }}>
        StudyTrack · Crescimento comprovado
      </p>
    </div>
  );
}
