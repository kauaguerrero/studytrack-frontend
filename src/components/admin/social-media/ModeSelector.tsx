'use client';

import { Lightbulb, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SocialMediaMode } from '@/types/social-media';

interface ModeSelectorProps {
  value:    SocialMediaMode | null;
  onChange: (mode: SocialMediaMode) => void;
}

const MODES: {
  id:       SocialMediaMode;
  icon:     React.ComponentType<{ size?: number; className?: string }>;
  label:    string;
  subtitle: string;
}[] = [
  {
    id:       'from_scratch',
    icon:     Lightbulb,
    label:    'Criar do zero',
    subtitle: 'O sistema sugere 3 ideias relevantes para o seu público. Você escolhe uma.',
  },
  {
    id:       'directed',
    icon:     Target,
    label:    'Com direcionamento',
    subtitle: 'Você descreve o que quer. O sistema cria o post baseado no seu briefing.',
  },
];

export default function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        Modo de criação
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MODES.map((mode) => {
          const active = value === mode.id;
          const Icon   = mode.icon;
          return (
            <button
              key={mode.id}
              onClick={() => onChange(mode.id)}
              className={cn(
                'flex items-start gap-4 p-5 rounded-xl border-2 text-left transition-all',
                active
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-500'
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-slate-800/50'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                active
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              )}>
                <Icon size={20} />
              </div>
              <div>
                <p className={cn(
                  'font-semibold text-sm',
                  active ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'
                )}>
                  {mode.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {mode.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
