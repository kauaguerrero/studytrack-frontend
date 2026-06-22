'use client';

import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Pencil,
  PencilOff,
  Maximize2,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  currentSlide: number;
  totalSlides: number;
  slideTitles: string[];
  isEditing: boolean;
  isExportingPDF: boolean;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (i: number) => void;
  onToggleEdit: () => void;
  onExportPDF: () => void;
  onReset: () => void;
  onFullscreen: () => void;
}

export function SlideControls({
  currentSlide,
  totalSlides,
  slideTitles,
  isEditing,
  isExportingPDF,
  onPrev,
  onNext,
  onGoTo,
  onToggleEdit,
  onExportPDF,
  onReset,
  onFullscreen,
}: Props) {
  return (
    <div className="flex items-center gap-3 mt-4 flex-wrap">
      {/* Slide navigation */}
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrev}
          disabled={currentSlide === 0}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft size={18} />
        </Button>

        <div className="flex items-center gap-1.5 px-1">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <Tooltip key={i} delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onGoTo(i)}
                  className="transition-all duration-200 rounded-full"
                  style={{
                    width: i === currentSlide ? 28 : 8,
                    height: 8,
                    background: i === currentSlide ? '#14b8a6' : '#cbd5e1',
                  }}
                />
              </TooltipTrigger>
              <TooltipContent side="top">{slideTitles[i]}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onNext}
          disabled={currentSlide === totalSlides - 1}
          className="h-8 w-8 p-0"
        >
          <ChevronRight size={18} />
        </Button>

        <span className="text-sm text-slate-500 ml-1 font-medium whitespace-nowrap">
          {currentSlide + 1} / {totalSlides}
        </span>
      </div>

      <div className="flex-1" />

      {/* Edit toggle */}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button
            variant={isEditing ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleEdit}
            className="gap-2"
          >
            {isEditing ? <PencilOff size={15} /> : <Pencil size={15} />}
            {isEditing ? 'Sair da edição' : 'Editar'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isEditing ? 'Clique nos textos e imagens para editar' : 'Ativar modo de edição inline'}
        </TooltipContent>
      </Tooltip>

      {/* Reset */}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" onClick={onReset} className="gap-2">
            <RotateCcw size={15} />
            Restaurar
          </Button>
        </TooltipTrigger>
        <TooltipContent>Restaurar padrão e apagar edições salvas</TooltipContent>
      </Tooltip>

      {/* Fullscreen */}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" onClick={onFullscreen} className="gap-2">
            <Maximize2 size={15} />
            Fullscreen
          </Button>
        </TooltipTrigger>
        <TooltipContent>Apresentar em tela cheia</TooltipContent>
      </Tooltip>

      {/* Export PDF */}
      <Button
        variant="outline"
        size="sm"
        onClick={onExportPDF}
        disabled={isExportingPDF}
        className="gap-2 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950"
      >
        {isExportingPDF ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
        Exportar PDF
      </Button>
    </div>
  );
}
