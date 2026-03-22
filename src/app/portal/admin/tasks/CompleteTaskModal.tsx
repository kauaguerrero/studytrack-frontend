'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, FileText, Code2 } from 'lucide-react';

interface CompletionReport {
  files_modified_count: number;
  files_modified_list: string[];
  summary: string;
}

interface Props {
  open: boolean;
  taskTitle: string;
  onConfirm: (data: CompletionReport) => Promise<void>;
  onCancel: () => void;
}

export default function CompleteTaskModal({ open, taskTitle, onConfirm, onCancel }: Props) {
  const [summary, setSummary] = useState('');
  const [filesRaw, setFilesRaw] = useState('');
  const [loading, setLoading] = useState(false);

  const filesList = filesRaw.split('\n').map(f => f.trim()).filter(Boolean);
  const isValid = summary.trim();

  async function handleConfirm() {
    if (!isValid) return;
    setLoading(true);
    try {
      await onConfirm({
        files_modified_count: filesList.length,
        files_modified_list: filesList,
        summary: summary.trim(),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onCancel()}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-lg p-0 gap-0 overflow-hidden rounded-2xl">

        {/* Accent bar */}
        <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #10b981, #10b98140)' }} />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#10b98120' }}>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold text-zinc-100">Relatório de Conclusão</DialogTitle>
              <p className="text-xs text-zinc-600 truncate">{taskTitle}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4 min-w-0">
          {/* Summary */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-2">
              <FileText className="w-3 h-3" /> Resumo da Conclusão <span className="text-red-400">*</span>
            </label>
            <textarea
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="Descreva o que foi implementado e o resultado final..."
              rows={3}
              className="box-border w-full bg-zinc-900 border rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none transition-colors"
              style={{ borderColor: '#10b98130' }}
              onFocus={e => (e.target.style.borderColor = '#10b98160')}
              onBlur={e => (e.target.style.borderColor = '#10b98130')}
            />
          </div>

          {/* Files */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
              <Code2 className="w-3 h-3" /> Arquivos Modificados <span className="text-zinc-700">(um por linha)</span>
            </label>
            <textarea
              value={filesRaw}
              onChange={e => setFilesRaw(e.target.value)}
              placeholder={'src/components/Foo.tsx\napp/services/bar.py'}
              rows={4}
              className="box-border w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-600 transition-colors font-mono text-xs"
            />
            {filesList.length > 0 && (
              <p className="text-xs text-zinc-600 mt-1.5">
                <span className="font-bold text-emerald-600">{filesList.length}</span> arquivo(s) listado(s)
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center justify-end gap-2.5">
          <button
            onClick={onCancel}
            className="text-sm font-medium px-4 py-2 rounded-xl border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid || loading}
            className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#10b981' }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {loading ? 'Concluindo...' : 'Marcar como Pronto'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
