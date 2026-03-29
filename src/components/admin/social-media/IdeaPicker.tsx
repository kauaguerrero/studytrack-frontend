'use client';

import { cn } from '@/lib/utils';
import type { PostIdea, SocialMediaTheme } from '@/types/social-media';

interface IdeaPickerProps {
  ideas:       PostIdea[];
  onSelect:    (idea: PostIdea) => void;
  onLoadMore:  () => void;
  loadingMore: boolean;
}

const THEME_LABELS: Record<SocialMediaTheme, string> = {
  educational:   'Educacional',
  motivational:  'Motivacional',
  meme:          'Meme',
  informational: 'Informativo',
  promotional:   'Promocional',
};

const THEME_COLORS: Record<SocialMediaTheme, string> = {
  educational:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  motivational:  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  meme:          'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  informational: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  promotional:   'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
};

export default function IdeaPicker({ ideas, onSelect, onLoadMore, loadingMore }: IdeaPickerProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Escolha uma ideia para desenvolver:
      </p>

      <div className="flex flex-col gap-3">
        {ideas.map((idea) => (
          <button
            key={idea.id}
            onClick={() => onSelect(idea)}
            className={cn(
              'flex items-start gap-4 p-4 rounded-xl border-2 text-left',
              'border-slate-200 dark:border-slate-700',
              'bg-white dark:bg-slate-800/50',
              'hover:border-blue-400 dark:hover:border-blue-600',
              'hover:bg-blue-50 dark:hover:bg-blue-950/30',
              'transition-all group'
            )}
          >
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  'text-[11px] font-semibold px-2 py-0.5 rounded-full',
                  THEME_COLORS[idea.theme]
                )}>
                  {THEME_LABELS[idea.theme]}
                </span>
              </div>
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                {idea.title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {idea.concept}
              </p>
            </div>
            <span className={cn(
              'text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 mt-1 transition-colors',
              'bg-blue-600 text-white opacity-0 group-hover:opacity-100'
            )}>
              Escolher →
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={onLoadMore}
        disabled={loadingMore}
        className={cn(
          'w-full py-3 rounded-xl border-2 border-dashed text-sm font-medium transition-colors',
          'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400',
          'hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-600 dark:hover:text-blue-400',
          loadingMore && 'opacity-50 cursor-not-allowed'
        )}
      >
        {loadingMore ? 'Gerando...' : '↻ Gerar mais 3 ideias'}
      </button>
    </div>
  );
}
