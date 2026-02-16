'use client'

import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

type ProcessStage = 
  | 'uploading' 
  | 'extracting' 
  | 'analyzing' 
  | 'adapting' 
  | 'auditing' 
  | 'rendering';

interface SkeletonLoaderProps {
  stage?: ProcessStage;
  filename?: string;
  studentName?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  stage: propStage = 'uploading',
  filename = 'prova.pdf',
  studentName = 'Aluno'
}) => {
  const [stage, setStage] = useState<ProcessStage>(propStage);

  // Escada temporal simulando o pipeline real do backend (AdaptationService)
  // Ajuda a reter o usuário por até 4-5 minutos sem parecer que o sistema travou.
  useEffect(() => {
    const timers = [
      setTimeout(() => setStage('extracting'), 3000),    // Mathpix / OCR
      setTimeout(() => setStage('analyzing'), 15000),    // RAG e Perfil
      setTimeout(() => setStage('adapting'), 35000),     // Início dos Batches (mais demorado)
      setTimeout(() => setStage('auditing'), 120000),    // 2 minutos: Auditoria Pedagógica
      setTimeout(() => setStage('rendering'), 180000),   // 3 minutos: Injeção de CSS e finalização
    ];

    return () => timers.forEach(timer => clearTimeout(timer));
  }, []);

  const stages: { key: ProcessStage; label: string; description: string }[] = [
    {
      key: 'uploading',
      label: 'Preparando documento',
      description: 'Transferindo arquivo de forma segura...',
    },
    {
      key: 'extracting',
      label: 'Lendo estrutura da prova',
      description: 'Extraindo textos, imagens e equações matemáticas...',
    },
    {
      key: 'analyzing',
      label: 'Analisando necessidades',
      description: 'Cruzando a prova com as diretrizes pedagógicas do aluno...',
    },
    {
      key: 'adapting',
      label: 'Adaptando questões',
      description: 'A IA está reescrevendo o conteúdo e criando suportes visuais...',
    },
    {
      key: 'auditing',
      label: 'Auditoria de qualidade',
      description: 'Revisando as adaptações para garantir que não há respostas prontas...',
    },
    {
      key: 'rendering',
      label: 'Finalizando layout',
      description: 'Aplicando fontes adequadas, espaçamentos e cores de fundo...',
    }
  ];

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-10">
        
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
                  <div className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-md scale-110' 
                      : isCompleted
                      ? 'bg-slate-200 text-white'
                      : 'bg-slate-50 text-slate-300'
                  }`}>
                    {isCompleted ? '✓' : isActive ? '◉' : idx + 1}
                  </div>

                  {/* Text - Apple Style */}
                  <div className="flex-1">
                    <p className={`text-sm font-semibold transition-colors duration-300 ${
                      isActive ? 'text-slate-900' : isCompleted ? 'text-slate-500' : 'text-slate-300'
                    }`}>
                      {s.label}
                    </p>
                    {isActive && (
                      <p className="text-xs text-slate-500 mt-0.5 animate-in fade-in slide-in-from-top-1 duration-300">
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
        <div className="pt-6 border-t border-slate-100 space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detalhes da Operação</p>
          <div className="space-y-1.5 text-xs text-slate-600">
            <p className="flex justify-between"><span className="text-slate-400">Arquivo</span> <span className="font-medium text-slate-800 truncate max-w-[200px]" title={filename}>{filename}</span></p>
            <p className="flex justify-between"><span className="text-slate-400">Aluno Alvo</span> <span className="font-medium text-slate-800">{studentName}</span></p>
          </div>
        </div>

        {/* Reassuring Message */}
        <div className="text-center space-y-2 pt-2">
          <p className="text-[11px] text-slate-500 font-medium px-4">
            Provas longas exigem alto processamento e podem levar de 3 a 5 minutos. Não atualize a página.
          </p>
          <p className="text-[10px] text-slate-300 font-mono mt-2">
            StudyTrack AI Engine v3.0
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
          <div className="w-10 h-10 bg-slate-200 rounded-full shrink-0" />
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