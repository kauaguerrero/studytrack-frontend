'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Presentation } from 'lucide-react';
import { usePresentation } from './hooks/usePresentation';
import { useExport } from './hooks/useExport';
import { SlideViewer } from './components/SlideViewer';
import { SlideControls } from './components/SlideControls';
import { Slide01Cover } from './components/slides/Slide01Cover';
import { SlideDesafio } from './components/slides/SlideDesafio';
import { Slide02Team } from './components/slides/Slide02Team';
import { Slide03Features } from './components/slides/Slide03Features';
import { Slide04Redacao } from './components/slides/Slide04Redacao';
import { Slide05Case } from './components/slides/Slide05Case';
import { Slide06Aprovacoes } from './components/slides/Slide06Aprovacoes';
import { Slide07Custos } from './components/slides/Slide07Custos';
import { SlideDecisao } from './components/slides/SlideDecisao';
import { Slide08Proposta } from './components/slides/Slide08Proposta';
import { Slide09CTA } from './components/slides/Slide09CTA';

const TOTAL_SLIDES = 11;

export default function ApresentacaoPage() {
  const {
    content,
    currentSlide,
    totalSlides,
    slideTitles,
    isEditing,
    setIsEditing,
    goToSlide,
    nextSlide,
    prevSlide,
    updateSlide,
    resetToDefault,
  } = usePresentation();

  const exportRefs = useRef<(HTMLDivElement | null)[]>(Array(TOTAL_SLIDES).fill(null));
  const viewerRef  = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const { exportToPDF, isExportingPDF } = useExport(exportRefs, content);

  const directionRef = useRef<'next' | 'prev'>('next');
  const prevSlideRef = useRef(currentSlide);
  if (currentSlide !== prevSlideRef.current) {
    directionRef.current = currentSlide > prevSlideRef.current ? 'next' : 'prev';
    prevSlideRef.current = currentSlide;
  }

  const handleFullscreen = useCallback(() => {
    const el = viewerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }, []);

  /*
   * Slide order (11 slides):
   * 0  Capa
   * 1  O Desafio          ← NOVO (do PPTX)
   * 2  Equipe
   * 3  O que Oferecemos
   * 4  Redação & Métricas
   * 5  Case de Sucesso
   * 6  Aprovações
   * 7  Custos
   * 8  Decisão Sem Risco  ← NOVO (do PPTX)
   * 9  Proposta
   * 10 Encerramento
   */
  const renderSlide = useCallback(
    (index: number, opts: { forExport?: boolean } = {}) => {
      const editing = opts.forExport ? false : isEditing;
      const fe      = opts.forExport ?? false;
      const p       = { isEditing: editing, forExport: fe };

      /*
       * Slide order (11 slides):
       * 0  Capa
       * 1  Equipe            ← posição trocada (era 2)
       * 2  O Desafio         ← posição trocada (era 1)
       * 3  O que Oferecemos
       * 4  Redação & Métricas
       * 5  Case de Sucesso
       * 6  Aprovações
       * 7  Custos
       * 8  Decisão Sem Risco
       * 9  Proposta
       * 10 Encerramento
       */
      switch (index) {
        case 0:  return <Slide01Cover    {...p} data={content.slide01}       onChange={(d) => updateSlide('slide01', d)} />;
        case 1:  return <Slide02Team     {...p} data={content.slide02}       onChange={(d) => updateSlide('slide02', d)} />;
        case 2:  return <SlideDesafio    {...p} data={content.slideDesafio}  onChange={(d) => updateSlide('slideDesafio', d)} />;
        case 3:  return <Slide03Features {...p} data={content.slide03}       onChange={(d) => updateSlide('slide03', d)} />;
        case 4:  return <Slide04Redacao  {...p} data={content.slide04}       onChange={(d) => updateSlide('slide04', d)} />;
        case 5:  return <Slide05Case     {...p} data={content.slide05}       onChange={(d) => updateSlide('slide05', d)} />;
        case 6:  return <Slide06Aprovacoes {...p} data={content.slide06}     onChange={(d) => updateSlide('slide06', d)} />;
        case 7:  return <Slide07Custos   {...p} data={content.slide07}       onChange={(d) => updateSlide('slide07', d)} />;
        case 8:  return <SlideDecisao    {...p} data={content.slideDecisao}  onChange={(d) => updateSlide('slideDecisao', d)} />;
        case 9:  return <Slide08Proposta {...p} data={content.slide08}       onChange={(d) => updateSlide('slide08', d)} />;
        case 10: return <Slide09CTA      {...p} data={content.slide09}       onChange={(d) => updateSlide('slide09', d)} />;
        default: return null;
      }
    },
    [content, isEditing, updateSlide],
  );

  const exportPortal = mounted ? createPortal(
    <div
      aria-hidden
      style={{ position: 'fixed', top: '100vh', left: 0, pointerEvents: 'none', zIndex: -9999 }}
    >
      {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
        <div
          key={i}
          ref={(el) => { exportRefs.current[i] = el; }}
          style={{ position: 'absolute', top: 0, left: 0, width: 1920, height: 1080, overflow: 'hidden' }}
        >
          {renderSlide(i, { forExport: true })}
        </div>
      ))}
    </div>,
    document.body,
  ) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
          <Presentation size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Apresentação</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Apresentação comercial da StudyTrack — 11 slides editáveis
          </p>
        </div>
      </div>

      <div ref={viewerRef}>
        <SlideViewer slideKey={currentSlide} direction={directionRef.current}>
          {renderSlide(currentSlide)}
        </SlideViewer>
      </div>

      <SlideControls
        currentSlide={currentSlide}
        totalSlides={totalSlides}
        slideTitles={slideTitles}
        isEditing={isEditing}
        isExportingPDF={isExportingPDF}
        onPrev={prevSlide}
        onNext={nextSlide}
        onGoTo={goToSlide}
        onToggleEdit={() => setIsEditing((v) => !v)}
        onExportPDF={exportToPDF}
        onReset={resetToDefault}
        onFullscreen={handleFullscreen}
      />

      {isEditing && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-sm">
          <span className="font-semibold">Modo de edição ativo</span>
          <span className="text-blue-400">—</span>
          <span>Clique nos textos para editar inline. Clique nas imagens para substituí-las.</span>
        </div>
      )}

      {exportPortal}
    </div>
  );
}
