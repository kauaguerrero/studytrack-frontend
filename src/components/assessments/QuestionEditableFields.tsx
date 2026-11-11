'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Trash2, Upload } from 'lucide-react';
import { getSubjects, getTopics } from '@/constants/taxonomy';

export interface EditableAlternative {
  letter: string;
  text: string;
}

export interface EditableQuestionValue {
  subject: string;
  discipline: string;
  difficulty: string;
  context: string;
  statement: string;
  alternatives: EditableAlternative[];
  correct_alternative: string;
  explanation: string;
  images: string[];
}

const ALTERNATIVE_LETTERS = ['A', 'B', 'C', 'D', 'E'];

export function emptyEditableQuestion(overrides: Partial<EditableQuestionValue> = {}): EditableQuestionValue {
  return {
    subject: 'Matemática',
    discipline: '',
    difficulty: 'Médio',
    context: '',
    statement: '',
    alternatives: ALTERNATIVE_LETTERS.map((letter) => ({ letter, text: '' })),
    correct_alternative: '',
    explanation: '',
    images: [],
    ...overrides,
  };
}

interface Props {
  value: EditableQuestionValue;
  onChange: (next: EditableQuestionValue) => void;
  slug: string;
  // Usado só pra nomear a pasta de armazenamento das imagens — não precisa
  // ser o id definitivo da questão (ela ainda nem existe no banco nesta
  // etapa de edição).
  storageHint?: string;
}

// Editor de todos os campos de uma questão (matéria, tópico, dificuldade,
// contexto, enunciado, alternativas, gabarito, comentário do professor e
// imagens) — usado tanto por "Do zero" quanto pelo preview editável da
// "Criação com IA", pra não duplicar o mesmo formulário em dois lugares.
export function QuestionEditableFields({ value, onChange, slug, storageHint }: Props) {
  const [uploading, setUploading] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const topics = getTopics(value.subject);

  function patch(partial: Partial<EditableQuestionValue>) {
    onChange({ ...value, ...partial });
  }

  function patchAlternative(letter: string, text: string) {
    patch({ alternatives: value.alternatives.map((alt) => (alt.letter === letter ? { ...alt, text } : alt)) });
  }

  async function uploadImage(body: FormData | { imageUrl: string }) {
    setUploading(true);
    try {
      const api = `/api/partners/${slug}/assessment/questions/upload-image`;
      const res = await fetch(api, body instanceof FormData
        ? { method: 'POST', body }
        : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, questionId: storageHint }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao enviar imagem.');
      patch({ images: [...value.images, data.publicUrl] });
      toast.success('Imagem adicionada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar a imagem.');
    } finally {
      setUploading(false);
    }
  }

  async function handleFileSelected(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    if (storageHint) formData.append('questionId', storageHint);
    await uploadImage(formData);
  }

  async function handlePasteLink() {
    const url = newImageUrl.trim();
    if (!url) return;
    await uploadImage({ imageUrl: url });
    setNewImageUrl('');
  }

  function removeImage(url: string) {
    patch({ images: value.images.filter((img) => img !== url) });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <select
          value={value.subject}
          onChange={(e) => patch({ subject: e.target.value, discipline: '' })}
          className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[var(--brand-primary)]"
        >
          {getSubjects().map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select
          value={value.discipline}
          onChange={(e) => patch({ discipline: e.target.value })}
          className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[var(--brand-primary)]"
        >
          <option value="">Selecione o tópico</option>
          {topics.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select
          value={value.difficulty}
          onChange={(e) => patch({ difficulty: e.target.value })}
          className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[var(--brand-primary)]"
        >
          <option value="Fácil">Fácil</option>
          <option value="Médio">Médio</option>
          <option value="Difícil">Difícil</option>
        </select>
      </div>

      <textarea
        value={value.context}
        onChange={(e) => patch({ context: e.target.value })}
        placeholder="Contexto opcional"
        className="min-h-24 w-full rounded-3xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[var(--brand-primary)]"
      />

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Imagens</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileSelected(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Enviar arquivo
          </button>
          <input
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            placeholder="Ou cole o link de uma imagem"
            className="h-10 min-w-[220px] flex-1 rounded-2xl border border-slate-300 bg-white px-3 text-xs outline-none focus:border-[var(--brand-primary)]"
          />
          <button
            type="button"
            onClick={() => void handlePasteLink()}
            disabled={uploading || !newImageUrl.trim()}
            className="h-10 rounded-2xl border border-slate-300 px-3 text-xs font-semibold text-slate-700 disabled:opacity-50"
          >
            Anexar link
          </button>
        </div>
        {value.images.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {value.images.map((img) => (
              <div key={img} className="relative h-20 w-20 overflow-hidden rounded-xl border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(img)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <textarea
        value={value.statement}
        onChange={(e) => patch({ statement: e.target.value })}
        placeholder="Enunciado da questão"
        className="min-h-28 w-full rounded-3xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[var(--brand-primary)]"
      />

      <div className="space-y-3">
        {value.alternatives.map((alt) => (
          <div key={alt.letter} className="flex gap-3">
            <button
              type="button"
              onClick={() => patch({ correct_alternative: alt.letter })}
              className={`h-11 w-11 shrink-0 rounded-2xl border text-sm font-bold ${value.correct_alternative === alt.letter ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 text-slate-700'}`}
            >
              {alt.letter}
            </button>
            <input
              value={alt.text}
              onChange={(e) => patchAlternative(alt.letter, e.target.value)}
              placeholder={`Alternativa ${alt.letter}`}
              className="h-11 flex-1 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[var(--brand-primary)]"
            />
          </div>
        ))}
      </div>

      <textarea
        value={value.explanation}
        onChange={(e) => patch({ explanation: e.target.value })}
        placeholder="Comentário do professor / explicação do gabarito"
        className="min-h-24 w-full rounded-3xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[var(--brand-primary)]"
      />
    </div>
  );
}
