'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Play, User, Calendar, ChevronDown, ChevronUp,
  ArrowRight, X, Upload,
} from 'lucide-react';
import type { Task, AdminProfile } from './hooks/useTasks';
import { PRIORITY_CONFIG } from './TaskCard';
import { createClient } from '@/lib/supabase/client';

const TASK_TYPE_LABELS: Record<string, string> = {
  bug: 'Bug',
  feature: 'Feature',
  improvement: 'Melhoria',
  tech_debt: 'Dívida técnica',
  ops: 'Operação',
  other: 'Outro',
};

export interface MoveToProgressData {
  progress: { already_done: string; currently_doing: string; remaining: string };
  transfer?: { assignee_id: string | null; message?: string };
}

interface Props {
  open: boolean;
  task: Task;
  profiles: AdminProfile[];
  onConfirm: (data: MoveToProgressData) => Promise<void>;
  onCancel: () => void;
}

export default function MoveToProgressModal({ open, task, profiles, onConfirm, onCancel }: Props) {
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<{ url: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTo, setTransferTo] = useState('');
  const [transferMessage, setTransferMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pc = PRIORITY_CONFIG[task.priority ?? 'medium'];

  async function handleImageUpload(files: FileList) {
    if (!files.length) return;
    setUploading(true);
    const supabase = createClient();
    const uploaded: { url: string; name: string }[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const sanitized = file.name.replace(/[^a-z0-9.\-_]/gi, '_');
      const path = `task-progress/${task.id}/${Date.now()}-${sanitized}`;
      const { error } = await supabase.storage.from('task-attachments').upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from('task-attachments').getPublicUrl(path);
        uploaded.push({ url: data.publicUrl, name: file.name });
      }
    }
    setImages(prev => [...prev, ...uploaded]);
    setUploading(false);
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      let currentlyDoing = notes.trim();
      if (images.length > 0) {
        const imgLinks = images.map(img => `![${img.name}](${img.url})`).join('\n');
        currentlyDoing = currentlyDoing ? `${currentlyDoing}\n\n${imgLinks}` : imgLinks;
      }

      await onConfirm({
        progress: {
          already_done: '',
          currently_doing: currentlyDoing || 'Iniciando execução.',
          remaining: task.scope,
        },
        transfer: transferTo
          ? {
              assignee_id: transferTo === '__none__' ? null : transferTo,
              message: transferMessage.trim() || undefined,
            }
          : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setNotes('');
    setImages([]);
    setShowTransfer(false);
    setTransferTo('');
    setTransferMessage('');
    setLoading(false);
    onCancel();
  }

  const transferLabel = transferTo && transferTo !== '__none__'
    ? `Será transferida para ${profiles.find(p => p.id === transferTo)?.full_name ?? '...'}`
    : transferTo === '__none__'
      ? 'Responsável será removido'
      : 'Os campos de execução são opcionais';

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-w-5xl w-[calc(100%-2rem)] p-0 gap-0 rounded-[28px] flex flex-col max-h-[min(92vh,820px)] overflow-hidden">

        <div className="h-[4px] flex-shrink-0 bg-gradient-to-r from-blue-500 to-blue-400" />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-zinc-200 dark:border-zinc-800/60 flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Play className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                  style={{ background: pc.bg, color: pc.color, border: `1px solid ${pc.border}` }}
                >
                  {pc.label}
                </span>
                {task.task_type && (
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                    {TASK_TYPE_LABELS[task.task_type] ?? task.task_type}
                  </span>
                )}
                {task.active_sprint && (
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                    {task.active_sprint.goal}
                  </span>
                )}
              </div>
              <DialogTitle className="text-lg font-black text-zinc-900 dark:text-zinc-100 leading-snug">
                {task.title}
              </DialogTitle>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
          <div className="flex flex-col lg:flex-row h-full">

            {/* LEFT — task details */}
            <div className="flex-1 px-6 py-5 space-y-5 overflow-y-auto lg:border-r border-b lg:border-b-0 border-zinc-200 dark:border-zinc-800/60">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Detalhes da task
              </p>

              <div className="grid grid-cols-2 gap-3">
                <MetaItem icon={User} label="Responsável" value={task.assignee?.full_name ?? 'Não atribuído'} />
                <MetaItem
                  icon={Calendar}
                  label="Prazo"
                  value={task.deadline ? new Date(task.deadline).toLocaleDateString('pt-BR') : '—'}
                />
              </div>

              {task.scope && <InfoBlock label="Escopo" value={task.scope} />}
              {task.description && task.description !== task.scope && (
                <InfoBlock label="Descrição" value={task.description} />
              )}
              {task.expected_outcome && (
                <InfoBlock label="Resultado esperado" value={task.expected_outcome} />
              )}
              {task.acceptance_criteria && (
                <InfoBlock label="Critérios de aceite" value={task.acceptance_criteria} />
              )}
            </div>

            {/* RIGHT — execution */}
            <div className="lg:w-[420px] flex-shrink-0 px-6 py-5 space-y-5 overflow-y-auto">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Iniciando execução
              </p>

              {/* Notes */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5 block">
                  O que você vai trabalhar?{' '}
                  <span className="font-normal normal-case tracking-normal">(opcional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Descreva o que vai começar a trabalhar nesta task..."
                  rows={4}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 resize-none focus:outline-none focus:border-blue-400 dark:focus:border-blue-500/50 transition-all"
                />
              </div>

              {/* Image upload */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5 block">
                  Imagens{' '}
                  <span className="font-normal normal-case tracking-normal">(opcional)</span>
                </label>
                <div
                  className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all ${
                    dragOver
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-500/5'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) handleImageUpload(e.dataTransfer.files); }}
                >
                  <Upload className="w-5 h-5 text-zinc-400 dark:text-zinc-600" />
                  <p className="text-xs text-zinc-400 dark:text-zinc-600 text-center">
                    {uploading ? 'Enviando...' : 'Clique ou arraste imagens aqui'}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => e.target.files && handleImageUpload(e.target.files)}
                  />
                </div>

                {images.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {images.map((img, i) => (
                      <div
                        key={i}
                        className="relative group rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 aspect-video bg-zinc-100 dark:bg-zinc-900"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Transfer section */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowTransfer(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" />
                    Transferir para outro membro
                  </div>
                  {showTransfer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showTransfer && (
                  <div className="px-4 pb-4 pt-3 space-y-3 border-t border-zinc-200 dark:border-zinc-800">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5 block">
                        Atribuir para
                      </label>
                      <select
                        value={transferTo}
                        onChange={e => setTransferTo(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500/50 transition-all"
                      >
                        <option value="">
                          Manter: {task.assignee?.full_name ?? 'sem responsável'}
                        </option>
                        {profiles
                          .filter(p => p.id !== task.assignee_id)
                          .map(p => (
                            <option key={p.id} value={p.id}>{p.full_name}</option>
                          ))}
                        {task.assignee_id && (
                          <option value="__none__">Remover responsável</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5 block">
                        Mensagem{' '}
                        <span className="font-normal normal-case tracking-normal">(opcional)</span>
                      </label>
                      <textarea
                        value={transferMessage}
                        onChange={e => setTransferMessage(e.target.value)}
                        placeholder="Contexto ao transferir a task..."
                        rows={2}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 resize-none focus:outline-none focus:border-blue-400 dark:focus:border-blue-500/50 transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between gap-3 flex-shrink-0">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">{transferLabel}</p>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="text-sm font-medium px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading || uploading}
              className="inline-flex items-center gap-1.5 text-sm font-bold px-5 py-2 rounded-xl text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              {loading ? 'Movendo...' : 'Iniciar execução'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/60 rounded-xl px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          {label}
        </p>
      </div>
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200 truncate">{value}</p>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">
        {label}
      </p>
      <p className="text-sm text-zinc-700 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
        {value}
      </p>
    </div>
  );
}
