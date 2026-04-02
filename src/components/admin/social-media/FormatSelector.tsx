'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { SocialMediaFormat } from '@/types/social-media';

interface FormatSelectorProps {
  value:       SocialMediaFormat | null;
  slideCount:  number;
  onChange:    (format: SocialMediaFormat) => void;
  onSlideCountChange: (n: number) => void;
}

const FORMATS: {
  id:       SocialMediaFormat;
  label:    string;
  dims:     string;
  usage:    string;
  aspect:   string; // CSS aspect ratio preview
}[] = [
  {
    id:     'feed_square',
    label:  'Post Feed',
    dims:   '1080 × 1080',
    usage:  'Frases, memes, dicas',
    aspect: 'aspect-square',
  },
  {
    id:     'feed_portrait',
    label:  'Feed Retrato',
    dims:   '1080 × 1350',
    usage:  'Mais conteúdo, carrosséis',
    aspect: 'aspect-[4/5]',
  },
  {
    id:     'story',
    label:  'Story',
    dims:   '1080 × 1920',
    usage:  'Stories, anúncios rápidos',
    aspect: 'aspect-[9/16]',
  },
  {
    id:     'carousel',
    label:  'Carrossel',
    dims:   '1080 × 1350 / slide',
    usage:  'Tutoriais, listas, passo a passo',
    aspect: 'aspect-[4/5]',
  },
];

export default function FormatSelector({
  value, slideCount, onChange, onSlideCountChange,
}: FormatSelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        Formato
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {FORMATS.map((fmt) => {
          const active = value === fmt.id;
          return (
            <button
              key={fmt.id}
              onClick={() => onChange(fmt.id)}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-left',
                active
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-500'
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-slate-800/50'
              )}
            >
              {/* Miniatura de aspect ratio */}
              <div
                className={cn(
                  'w-full rounded-md border',
                  fmt.aspect,
                  active
                    ? 'border-blue-400 bg-blue-100 dark:bg-blue-900/60'
                    : 'border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700'
                )}
              />
              <div className="w-full">
                <p className={cn(
                  'text-sm font-semibold',
                  active ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'
                )}>
                  {fmt.label}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">{fmt.dims}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{fmt.usage}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Slider de slides para carrossel */}
      {value === 'carousel' && (
        <div className="flex items-center gap-4 pt-2 px-1">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
            Número de slides:
          </label>
          <input
            type="range"
            min={2}
            max={10}
            value={slideCount}
            onChange={(e) => onSlideCountChange(Number(e.target.value))}
            className="flex-1 accent-blue-600"
          />
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400 w-6 text-center">
            {slideCount}
          </span>
        </div>
      )}
    </div>
  );
}
