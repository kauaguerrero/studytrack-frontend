'use client'

import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface SkeletonLoaderProps {
  stage?: 'uploading' | 'processing' | 'rendering';
  filename?: string;
  studentName?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  stage: propStage = 'processing',
  filename = 'prova.pdf',
  studentName = 'Aluno'
}) => {
  const [stage, setStage] = useState<'uploading' | 'processing' | 'rendering'>(propStage);

  // Auto-progress through stages to show activity
  useEffect(() => {
    const timers = [
      setTimeout(() => setStage('uploading'), 800),
      setTimeout(() => setStage('processing'), 6000),
      setTimeout(() => setStage('rendering'), 10000),
    ];

    return () => timers.forEach(timer => clearTimeout(timer));
  }, []);

  const stages = [
    {
      key: 'uploading',
      label: 'Enviando arquivo',
      description: 'Transferindo documento para o servidor seguro…',
    },
    {
      key: 'processing',
      label: 'Analisando conteúdo',
      description: 'A IA está lendo e compreendendo a prova…',
    },
    {
      key: 'rendering',
      label: 'Preparando adaptação',
      description: 'Criando versão personalizada para o aluno…',
    }
  ];

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-12">
        
        {/* Animated Icon - Minimal Style */}
        <div className="flex justify-center">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full bg-slate-100 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-slate-900 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          </div>
        </div>

        {/* Progress Stages - Clean, Linear */}
        <div className="space-y-4">
          {stages.map((s, idx) => {
            const isActive = s.key === stage;
            const isCompleted = stages.findIndex(st => st.key === stage) > idx;
            
            return (
              <div key={s.key} className="space-y-2">
                <div className="flex items-center gap-3">
                  {/* Minimal Indicator */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                    isActive
                      ? 'bg-slate-900 text-white' 
                      : isCompleted
                      ? 'bg-slate-300 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    {isCompleted ? '✓' : isActive ? '◉' : idx + 1}
                  </div>

                  {/* Text - Apple Style */}
                  <div>
                    <p className={`text-sm font-semibold transition-colors duration-300 ${
                      isActive ? 'text-slate-900' : isCompleted ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      {s.label}
                    </p>
                    {isActive && (
                      <p className="text-xs text-slate-500 mt-0.5 animate-in fade-in duration-300">
                        {s.description}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Subtle Progress Line */}
                {isActive && (
                  <div className="ml-9 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-900 rounded-full animate-pulse" style={{ width: '60%' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* File Info - Subtle */}
        <div className="pt-8 border-t border-slate-100 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Detalhes</p>
          <div className="space-y-2 text-sm text-slate-600">
            <p><span className="text-slate-900 font-medium">Arquivo:</span> {filename}</p>
            <p><span className="text-slate-900 font-medium">Aluno:</span> {studentName}</p>
          </div>
        </div>

        {/* Reassuring Message */}
        <div className="text-center space-y-2 pt-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Não feche esta aba. Este processo pode levar alguns minutos.
          </p>
          <p className="text-[11px] text-slate-400 font-mono">
            StudyTrack AI Engine v2.0
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton for the Adaptation Editor Questions List
 */
export const QuestionSkeletonList: React.FC<{count?: number}> = ({ count = 8 }) => {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-slate-100 rounded-lg animate-pulse">
          <div className="w-10 h-10 bg-slate-200 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-slate-200 rounded w-24" />
            <div className="h-2 bg-slate-200 rounded w-40" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton for the Adaptation Editor Content Area
 */
export const EditorContentSkeleton: React.FC = () => {
  return (
    <div className="p-8 space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-3">
        <div className="h-8 bg-slate-200 rounded w-64 animate-pulse" />
        <div className="h-4 bg-slate-200 rounded w-96 animate-pulse" />
      </div>

      {/* Content Skeleton - Multiple rows */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="h-6 bg-slate-200 rounded w-full animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 rounded w-full animate-pulse" />
              <div className="h-4 bg-slate-200 rounded w-5/6 animate-pulse" />
              <div className="h-4 bg-slate-200 rounded w-4/5 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
