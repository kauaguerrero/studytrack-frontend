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
      setTimeout(() => setStage('uploading'), 500),
      setTimeout(() => setStage('processing'), 3000),
      setTimeout(() => setStage('rendering'), 8000),
    ];

    return () => timers.forEach(timer => clearTimeout(timer));
  }, []);

  const stages = [
    {
      key: 'uploading',
      label: 'Enviando arquivo',
      description: 'Transferindo documento para o servidor seguro...',
      icon: '📤'
    },
    {
      key: 'processing',
      label: 'Analisando conteúdo',
      description: 'A IA está lendo e analisando a prova...',
      icon: '🤖'
    },
    {
      key: 'rendering',
      label: 'Gerando prova adaptada',
      description: 'Criando versão personalizada para o aluno...',
      icon: '✨'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/60 p-8 md:p-12 space-y-8">
          
          {/* Top Decoration */}
          <div className="flex justify-center">
            <div className="relative w-24 h-24">
              {/* Animated rings */}
              <div className="absolute inset-0 rounded-full bg-blue-100 animate-pulse opacity-75" />
              <div className="absolute inset-2 rounded-full bg-blue-50 animate-pulse opacity-50" style={{animationDelay: '0.2s'}} />
              
              {/* Center icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <Sparkles className="w-12 h-12 text-blue-600 animate-spin" />
                  <Loader2 className="absolute w-12 h-12 text-blue-300 animate-spin opacity-30" style={{animationDirection: 'reverse'}} />
                </div>
              </div>
            </div>
          </div>

          {/* Progress Stages */}
          <div className="space-y-3">
            {stages.map((s, idx) => {
              const isActive = s.key === stage;
              const isCompleted = stages.findIndex(st => st.key === stage) > idx;
              
              return (
                <div
                  key={s.key}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-300 ${
                    isActive 
                      ? 'bg-blue-50 border border-blue-200' 
                      : isCompleted 
                      ? 'bg-emerald-50 border border-emerald-200' 
                      : 'bg-slate-50 border border-slate-200'
                  }`}
                >
                  {/* Indicator */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mt-0.5 transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white animate-pulse'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-300 text-slate-600'
                  }`}>
                    {isCompleted ? '✓' : isActive ? <Loader2 size={16} className="animate-spin" /> : idx + 1}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold transition-colors ${
                      isActive ? 'text-blue-900' : isCompleted ? 'text-emerald-900' : 'text-slate-500'
                    }`}>
                      {s.icon} {s.label}
                    </p>
                    <p className={`text-xs mt-1 transition-colors ${
                      isActive ? 'text-blue-700' : isCompleted ? 'text-emerald-700' : 'text-slate-400'
                    }`}>
                      {s.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* File Info */}
          <div className="space-y-2 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">Informações</span>
            </div>
            <div className="space-y-1 text-xs text-slate-600">
              <p><span className="font-semibold">Arquivo:</span> {filename}</p>
              <p><span className="font-semibold">Aluno:</span> {studentName}</p>
            </div>
          </div>

          {/* Tip */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-900">
              <span className="font-bold">💡 Dica:</span> Este processo pode levar alguns minutos. Não feche esta aba.
            </p>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Progresso</span>
              <span className="text-[10px] font-mono text-slate-400">
                {stages.findIndex(s => s.key === stage) + 1} de {stages.length}
              </span>
            </div>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((stages.findIndex(s => s.key === stage) + 1) / stages.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bottom text */}
        <p className="text-center text-xs text-slate-500 mt-6 font-mono">
          StudyTrack AI Engine • Processando com tecnologia de ponta
        </p>
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
