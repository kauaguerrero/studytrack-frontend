'use client';

// Leitor de PDF com anotações (fase 10). Carregado só no cliente (next/dynamic,
// ssr:false): o pdf.js usa APIs do navegador já na importação.
//
// - Uma página por vez (leve no celular), zoom por largura.
// - Ferramentas: navegar, caneta, marca-texto, borracha (apaga o traço tocado),
//   comentário (alfinete com texto), desfazer, limpar página.
// - Salva sozinho: 1,2s depois da última mudança da página e ao trocar de
//   página/sair. Cada página é uma linha no backend.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronRight, Eraser, Hand, Highlighter, Loader2, MessageSquarePlus, Minus, PenLine, Plus, RotateCcw, Trash2,
} from 'lucide-react';
import { AnnotationLayer, type Tool } from '@/components/materials/AnnotationLayer';
import { EMPTY_PAGE, materialsFetch, type PageAnnotation } from '@/lib/materials';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

const PEN_COLORS = ['#111827', '#dc2626', '#2563eb', '#16a34a'];
const HL_COLORS = ['#facc15', '#4ade80', '#f472b6', '#38bdf8'];
const PDF_OPTIONS = { disableRange: true, disableStream: true, isEvalSupported: false };

export default function PdfAnnotator({ slug, materialId, url, title }: { slug: string; materialId: string; url: string; title: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [boxWidth, setBoxWidth] = useState(800);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [tool, setTool] = useState<Tool>('none');
  const [color, setColor] = useState(PEN_COLORS[0]);
  const [notes, setNotes] = useState<Record<string, PageAnnotation>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const history = useRef<Record<string, PageAnnotation[]>>({});
  const dirty = useRef<Set<string>>(new Set());
  const timer = useRef<number | null>(null);
  const latest = useRef(notes);
  latest.current = notes;

  // Anotações do aluno (todas as páginas, uma leitura)
  useEffect(() => {
    let alive = true;
    materialsFetch<{ pages: Record<string, PageAnnotation> }>(slug, `/materials/${materialId}/annotations`)
      .then((r) => { if (alive) { setNotes(r.pages ?? {}); setLoaded(true); } })
      .catch((e) => { if (alive) { toast.error(e instanceof Error ? e.message : 'Erro ao carregar anotações.'); setLoaded(true); } });
    return () => { alive = false; };
  }, [slug, materialId]);

  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setBoxWidth(Math.max(280, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const flush = useCallback(async () => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    const keys = [...dirty.current];
    if (!keys.length) return;
    dirty.current.clear();
    setSaving('saving');
    try {
      await Promise.all(keys.map((k) => materialsFetch(slug, `/materials/${materialId}/annotations/${k}`, {
        method: 'PUT', body: JSON.stringify({ data: latest.current[k] ?? EMPTY_PAGE }),
      })));
      setSaving('saved');
    } catch (e) {
      keys.forEach((k) => dirty.current.add(k));
      setSaving('error');
      toast.error(e instanceof Error ? e.message : 'Não foi possível salvar a anotação.');
    }
  }, [slug, materialId]);

  useEffect(() => () => { void flush(); }, [flush]);
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') void flush(); };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [flush]);

  const key = String(page);
  const current = notes[key] ?? EMPTY_PAGE;

  function change(next: PageAnnotation, record = true) {
    if (record) history.current[key] = [...(history.current[key] ?? []).slice(-49), current];
    setNotes((n) => ({ ...n, [key]: next }));
    dirty.current.add(key);
    setSaving('idle');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { void flush(); }, 1200);
  }

  function undo() {
    const h = history.current[key];
    if (!h?.length) return;
    const prev = h[h.length - 1];
    history.current[key] = h.slice(0, -1);
    change(prev, false);
  }

  function go(p: number) {
    if (p < 1 || (pages && p > pages)) return;
    void flush();
    setPage(p);
  }

  const pickTool = (t: Tool) => {
    setTool(t);
    if (t === 'pen' && !PEN_COLORS.includes(color)) setColor(PEN_COLORS[0]);
    if (t === 'hl' && !HL_COLORS.includes(color)) setColor(HL_COLORS[0]);
  };
  const width = Math.round(boxWidth * zoom);
  const toolBtn = (t: Tool, label: string, Icon: typeof PenLine) => (
    <button type="button" aria-label={label} aria-pressed={tool === t} title={label} onClick={() => pickTool(t)}
      className={`rounded-lg p-2 ${tool === t ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 hover:bg-slate-100 dark:text-white/70 dark:hover:bg-white/10'}`}>
      <Icon className="h-4 w-4" />
    </button>
  );
  const colors = tool === 'hl' ? HL_COLORS : tool === 'pen' ? PEN_COLORS : [];

  return (
    <div className="flex flex-col gap-3">
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-1 rounded-2xl border border-slate-200 bg-white/95 p-1.5 backdrop-blur dark:border-white/10 dark:bg-slate-900/95"
        role="toolbar" aria-label="Ferramentas de anotação">
        {toolBtn('none', 'Navegar', Hand)}
        {toolBtn('pen', 'Caneta', PenLine)}
        {toolBtn('hl', 'Marca-texto', Highlighter)}
        {toolBtn('eraser', 'Borracha', Eraser)}
        {toolBtn('note', 'Comentário', MessageSquarePlus)}
        {colors.length > 0 && <span className="mx-1 h-6 w-px bg-slate-200 dark:bg-white/10" />}
        {colors.map((c) => (
          <button key={c} type="button" aria-label={`Cor ${c}`} aria-pressed={color === c} onClick={() => setColor(c)}
            className={`h-6 w-6 rounded-full border-2 ${color === c ? 'border-slate-900 dark:border-white' : 'border-transparent'}`} style={{ background: c }} />
        ))}
        <span className="mx-1 h-6 w-px bg-slate-200 dark:bg-white/10" />
        <button type="button" aria-label="Desfazer" title="Desfazer" onClick={undo} disabled={!history.current[key]?.length}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:text-white/70 dark:hover:bg-white/10"><RotateCcw className="h-4 w-4" /></button>
        <button type="button" aria-label="Limpar página" title="Limpar página"
          disabled={!current.strokes.length && !current.notes.length}
          onClick={() => { if (window.confirm('Apagar todas as anotações desta página?')) change(EMPTY_PAGE); }}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:text-white/70 dark:hover:bg-white/10"><Trash2 className="h-4 w-4" /></button>
        <span className="ml-auto flex items-center gap-1">
          <span className="hidden text-[11px] text-slate-500 sm:inline" aria-live="polite" data-testid="save-state">
            {saving === 'saving' ? 'Salvando…' : saving === 'saved' ? 'Salvo' : saving === 'error' ? 'Erro ao salvar' : ''}
          </span>
          <button type="button" aria-label="Diminuir zoom" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-white/70 dark:hover:bg-white/10"><Minus className="h-4 w-4" /></button>
          <span className="w-10 text-center text-xs font-semibold text-slate-600 dark:text-white/70">{Math.round(zoom * 100)}%</span>
          <button type="button" aria-label="Aumentar zoom" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-white/70 dark:hover:bg-white/10"><Plus className="h-4 w-4" /></button>
        </span>
      </div>

      <div ref={wrap} className="w-full overflow-x-auto rounded-2xl bg-slate-100 p-2 dark:bg-white/5">
        <Document file={url} options={PDF_OPTIONS} onLoadSuccess={(d) => setPages(d.numPages)}
          loading={<div className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Abrindo {title}…</div>}
          error={<p className="p-6 text-sm text-red-600">Não foi possível abrir o PDF. Recarregue a página para gerar um novo link.</p>}>
          <div className="relative mx-auto shadow-md" style={{ width }}>
            <Page pageNumber={page} width={width} renderTextLayer={false} renderAnnotationLayer={false}
              onRenderSuccess={(p) => setSize({ w: p.width, h: p.height })} />
            {loaded && size.w > 0 && (
              <AnnotationLayer width={size.w} height={size.h} value={current} onChange={(v) => change(v)} tool={tool} color={color} />
            )}
          </div>
        </Document>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button type="button" aria-label="Página anterior" disabled={page <= 1} onClick={() => go(page - 1)}
          className="rounded-full border border-slate-200 p-2 disabled:opacity-30 dark:border-white/10"><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-sm font-semibold text-slate-700 dark:text-white/80" data-testid="page-label">
          Página {page}{pages ? ` de ${pages}` : ''}
        </span>
        <button type="button" aria-label="Próxima página" disabled={!!pages && page >= pages} onClick={() => go(page + 1)}
          className="rounded-full border border-slate-200 p-2 disabled:opacity-30 dark:border-white/10"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
