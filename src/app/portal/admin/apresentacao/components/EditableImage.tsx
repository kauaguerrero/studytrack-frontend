'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface Props {
  src: string;
  alt: string;
  isEditing: boolean;
  onUploaded: (url: string) => void;
  className?: string;
  style?: React.CSSProperties;
  uploadPath: string;
  placeholderLabel?: string;
}

export function EditableImage({
  src,
  alt,
  isEditing,
  onUploaded,
  className = '',
  style,
  uploadPath,
  placeholderLabel = 'Clique para adicionar imagem',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop();
      const path = `${uploadPath}.${ext}`;

      const { error } = await supabase.storage
        .from('apresentacao')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (error) throw error;

      const { data } = supabase.storage.from('apresentacao').getPublicUrl(path);
      onUploaded(`${data.publicUrl}?t=${Date.now()}`);
      toast.success('Imagem atualizada!');
    } catch {
      toast.error('Erro ao fazer upload. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const hasImage = Boolean(src);

  if (!isEditing) {
    if (!hasImage) {
      return (
        <div
          className={`${className} bg-slate-200/40 flex items-center justify-center`}
          style={style}
        >
          <span className="text-slate-400 text-sm">{placeholderLabel}</span>
        </div>
      );
    }
    return (
      <img
        src={src}
        alt={alt}
        crossOrigin="anonymous"
        className={`${className} object-cover`}
        style={style}
      />
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <div
        className={`${className} relative group cursor-pointer`}
        style={style}
        onClick={() => inputRef.current?.click()}
      >
        {hasImage ? (
          <img
            src={src}
            alt={alt}
            crossOrigin="anonymous"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-slate-200/40 flex flex-col items-center justify-center gap-2">
            <Upload size={28} className="text-slate-400" />
            <span className="text-slate-500 text-sm text-center px-4">{placeholderLabel}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-inherit">
          {uploading ? (
            <Loader2 size={24} className="text-white animate-spin" />
          ) : (
            <>
              <Upload size={22} className="text-white" />
              <span className="text-white text-sm font-medium">Trocar imagem</span>
            </>
          )}
        </div>
      </div>
    </>
  );
}
