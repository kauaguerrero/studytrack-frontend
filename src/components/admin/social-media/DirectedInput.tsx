'use client';

import { useRef, useState } from 'react';
import { Upload, X, FileImage, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DirectedInputProps {
  prompt:         string;
  materialUrls:   string[];
  onPromptChange: (v: string) => void;
  onMaterialAdd:  (url: string) => void;
  onMaterialRemove: (idx: number) => void;
  uploading:      boolean;
  onUploadFile:   (file: File) => Promise<void>;
}

const ACCEPTED_TYPES = '.png,.jpg,.jpeg,.webp,.pdf';
const MAX_FILES      = 5;

export default function DirectedInput({
  prompt, materialUrls, onPromptChange,
  onMaterialAdd, onMaterialRemove,
  uploading, onUploadFile,
}: DirectedInputProps) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const remaining = MAX_FILES - materialUrls.length;
    const toUpload  = Array.from(files).slice(0, remaining);
    for (const file of toUpload) {
      await onUploadFile(file);
    }
  }

  return (
    <div className="space-y-5">
      {/* Textarea */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Descreva o que você quer
        </label>
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={
            'Exemplos:\n' +
            '• "Post motivacional para véspera do ENEM"\n' +
            '• "Carrossel com 5 técnicas de memorização"\n' +
            '• "Meme sobre procrastinação nos estudos"'
          }
          rows={5}
          className={cn(
            'w-full rounded-xl border px-4 py-3 text-sm resize-none',
            'border-slate-200 dark:border-slate-700',
            'bg-white dark:bg-slate-800',
            'text-slate-800 dark:text-slate-100',
            'placeholder:text-slate-400 dark:placeholder:text-slate-500',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'transition-shadow'
          )}
        />
      </div>

      {/* Upload zone */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Materiais{' '}
          <span className="font-normal text-slate-400">(opcional — logos, fotos, docs)</span>
        </label>

        {/* Drop zone */}
        {materialUrls.length < MAX_FILES && (
          <div
            className={cn(
              'relative border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer',
              dragOver
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600'
            )}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              void handleFiles(e.dataTransfer.files);
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              multiple
              className="hidden"
              onChange={(e) => void handleFiles(e.target.files)}
            />
            {uploading ? (
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                Enviando...
              </p>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload size={22} className="text-slate-400" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Arraste arquivos ou{' '}
                  <span className="text-blue-600 dark:text-blue-400 font-medium">clique para escolher</span>
                </p>
                <p className="text-xs text-slate-400">PNG, JPG, WEBP, PDF — máx 10 MB cada</p>
              </div>
            )}
          </div>
        )}

        {/* Preview dos arquivos enviados */}
        {materialUrls.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {materialUrls.map((url, idx) => {
              const isPdf = url.toLowerCase().includes('.pdf') || url.toLowerCase().endsWith('pdf');
              return (
                <div
                  key={idx}
                  className="relative group flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700"
                >
                  {isPdf
                    ? <FileText size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
                    : <FileImage size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
                  }
                  <span className="text-xs text-slate-600 dark:text-slate-300 max-w-[100px] truncate">
                    Material {idx + 1}
                  </span>
                  <button
                    onClick={() => onMaterialRemove(idx)}
                    className="text-slate-400 hover:text-red-500 transition-colors ml-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
