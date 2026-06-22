'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { PresentationData } from '../data/slides';

export function useExport(
  exportRefs: React.RefObject<(HTMLDivElement | null)[]>,
  _content: PresentationData,
) {
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const exportToPDF = useCallback(async () => {
    setIsExportingPDF(true);
    const toastId = toast.loading('Gerando PDF…');
    try {
      const [{ toPng }, { jsPDF }] = await Promise.all([
        import('html-to-image'),
        import('jspdf'),
      ]);

      const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: [338.67, 190.5] });

      const refs = exportRefs.current;
      if (!refs) throw new Error('Slides não encontrados');

      for (let i = 0; i < refs.length; i++) {
        const el = refs[i];
        if (!el) continue;
        toast.loading(`Processando slide ${i + 1} de ${refs.length}…`, { id: toastId });
        const dataUrl = await toPng(el, { width: 1920, height: 1080, pixelRatio: 1, cacheBust: true });
        if (i > 0) doc.addPage();
        doc.addImage(dataUrl, 'PNG', 0, 0, 338.67, 190.5);
      }

      doc.save('StudyTrack-Apresentacao.pdf');
      toast.success('PDF exportado com sucesso!', { id: toastId });
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Erro ao gerar PDF. Tente novamente.', { id: toastId });
    } finally {
      setIsExportingPDF(false);
    }
  }, [exportRefs]);

  return { exportToPDF, isExportingPDF };
}
