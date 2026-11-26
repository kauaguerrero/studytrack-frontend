'use client';

// Camada de anotação por cima de uma página do PDF (fase 10). Coordenadas
// normalizadas (0..1): o desenho acompanha qualquer zoom/largura.

import { useEffect, useRef, useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { simplify, strokeHit, type Note, type PageAnnotation, type Stroke } from '@/lib/materials';

export type Tool = 'none' | 'pen' | 'hl' | 'eraser' | 'note';

function draw(ctx: CanvasRenderingContext2D, s: Stroke, w: number, h: number) {
  if (!s.p.length) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = s.c;
  ctx.globalAlpha = s.t === 'hl' ? 0.35 : 1;
  ctx.globalCompositeOperation = s.t === 'hl' ? 'multiply' : 'source-over';
  ctx.lineWidth = s.w * (w / 800);
  ctx.beginPath();
  ctx.moveTo(s.p[0][0] * w, s.p[0][1] * h);
  if (s.p.length === 1) ctx.lineTo(s.p[0][0] * w + 0.1, s.p[0][1] * h);
  for (const [x, y] of s.p.slice(1)) ctx.lineTo(x * w, y * h);
  ctx.stroke();
  ctx.restore();
}

export function AnnotationLayer({ width, height, value, onChange, tool, color, readOnly = false }: {
  width: number;
  height: number;
  value: PageAnnotation;
  onChange: (v: PageAnnotation) => void;
  tool: Tool;
  color: string;
  readOnly?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const current = useRef<Stroke | null>(null);
  const [openNote, setOpenNote] = useState<string | null>(null);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !width || !height) return;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    c.width = Math.round(width * dpr);
    c.height = Math.round(height * dpr);
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    for (const s of value.strokes) draw(ctx, s, width, height);
  }, [value.strokes, width, height]);

  const pos = (e: React.PointerEvent): [number, number] => {
    const r = canvas.current!.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
  };

  const active = !readOnly && tool !== 'none';

  function down(e: React.PointerEvent) {
    if (!active) return;
    e.preventDefault();
    const [x, y] = pos(e);
    if (tool === 'note') {
      const id = `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      onChange({ ...value, notes: [...value.notes, { id, x, y, text: '' }] });
      setOpenNote(id);
      return;
    }
    if (tool === 'eraser') {
      const i = strokeHit(value.strokes, x, y);
      if (i >= 0) onChange({ ...value, strokes: value.strokes.filter((_, k) => k !== i) });
      return;
    }
    (e.target as Element).setPointerCapture?.(e.pointerId);
    current.current = { t: tool, c: color, w: tool === 'hl' ? 16 : 2.5, p: [[x, y]] };
  }

  function moveTo(e: React.PointerEvent) {
    if (!active) return;
    if (tool === 'eraser' && e.buttons === 1) {
      const [x, y] = pos(e);
      const i = strokeHit(value.strokes, x, y);
      if (i >= 0) onChange({ ...value, strokes: value.strokes.filter((_, k) => k !== i) });
      return;
    }
    const s = current.current;
    if (!s) return;
    const pt = pos(e);
    if (Number.isNaN(pt[0]) || Number.isNaN(pt[1])) return;
    s.p.push(pt);
    const ctx = canvas.current?.getContext('2d');
    if (ctx && s.p.length >= 2) draw(ctx, { ...s, p: s.p.slice(-2) }, width, height);
  }

  function up() {
    const s = current.current;
    current.current = null;
    if (s && s.p.length) onChange({ ...value, strokes: [...value.strokes, { ...s, p: simplify(s.p).slice(0, 4000) }] });
  }

  const setNote = (id: string, patch: Partial<Note>) =>
    onChange({ ...value, notes: value.notes.map((n) => (n.id === id ? { ...n, ...patch } : n)) });
  const dropNote = (id: string) => { onChange({ ...value, notes: value.notes.filter((n) => n.id !== id) }); setOpenNote(null); };

  return (
    <div className="absolute inset-0" style={{ width, height }}>
      <canvas ref={canvas} data-testid="annotation-canvas" aria-label="Anotações da página"
        className={`absolute inset-0 h-full w-full ${active ? 'touch-none' : 'pointer-events-none'} ${tool === 'eraser' ? 'cursor-cell' : active ? 'cursor-crosshair' : ''}`}
        onPointerDown={down} onPointerMove={moveTo} onPointerUp={up} onPointerLeave={up} />
      {value.notes.map((n) => (
        <div key={n.id} className="absolute" style={{ left: `${n.x * 100}%`, top: `${n.y * 100}%` }}>
          <button type="button" aria-label={`Comentário${n.text ? `: ${n.text.slice(0, 40)}` : ''}`}
            onClick={() => setOpenNote(openNote === n.id ? null : n.id)}
            className="-translate-x-1/2 -translate-y-full rounded-full bg-amber-400 p-1 text-amber-950 shadow">
            <MessageSquare className="h-3.5 w-3.5" />
          </button>
          {openNote === n.id && (
            <div className="absolute left-0 top-1 z-10 w-56 rounded-xl border border-amber-200 bg-amber-50 p-2 shadow-lg">
              {readOnly ? <p className="whitespace-pre-line text-xs text-amber-950">{n.text}</p> : (
                <>
                  <textarea aria-label="Texto do comentário" autoFocus maxLength={1000} value={n.text}
                    onChange={(e) => setNote(n.id, { text: e.target.value })}
                    className="h-20 w-full resize-none rounded-lg border border-amber-200 bg-white p-1.5 text-xs text-slate-900 outline-none" />
                  <div className="mt-1 flex justify-between">
                    <button type="button" onClick={() => dropNote(n.id)} className="text-[11px] font-semibold text-red-600">Apagar</button>
                    <button type="button" aria-label="Fechar comentário" onClick={() => { if (!n.text.trim()) dropNote(n.id); else setOpenNote(null); }}>
                      <X className="h-3.5 w-3.5 text-amber-900" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
