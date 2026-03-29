'use client';

import { AlertCircle, Upload } from 'lucide-react';
import { useRef } from 'react';

interface MaterialRequestCardProps {
  missingMaterials: string[];
  onUploadFile:     (file: File) => Promise<void>;
  onSkipToGeneric:  () => void;
  uploading:        boolean;
}

export default function MaterialRequestCard({
  missingMaterials, onUploadFile, onSkipToGeneric, uploading,
}: MaterialRequestCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-6 space-y-5">
      <div className="flex items-start gap-3">
        <AlertCircle
          size={20}
          className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
        />
        <div>
          <p className="font-semibold text-amber-900 dark:text-amber-100 text-sm">
            Para criar o melhor post possível, preciso de mais alguns materiais:
          </p>
        </div>
      </div>

      <ul className="space-y-2 pl-2">
        {missingMaterials.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
            <span className="text-amber-500 dark:text-amber-400 font-bold shrink-0">•</span>
            {item}
          </li>
        ))}
      </ul>

      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
        >
          <Upload size={16} />
          {uploading ? 'Enviando...' : 'Enviar materiais'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.pdf"
          multiple
          className="hidden"
          onChange={async (e) => {
            const files = e.target.files;
            if (!files) return;
            for (const file of Array.from(files)) {
              await onUploadFile(file);
            }
          }}
        />

        <button
          onClick={onSkipToGeneric}
          className="px-4 py-2.5 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
        >
          Criar versão genérica mesmo assim
        </button>
      </div>
    </div>
  );
}
