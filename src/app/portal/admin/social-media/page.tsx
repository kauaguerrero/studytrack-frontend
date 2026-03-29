'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

import FormatSelector      from '@/components/admin/social-media/FormatSelector';
import ModeSelector        from '@/components/admin/social-media/ModeSelector';
import DirectedInput       from '@/components/admin/social-media/DirectedInput';
import IdeaPicker          from '@/components/admin/social-media/IdeaPicker';
import MaterialRequestCard from '@/components/admin/social-media/MaterialRequestCard';
import PostPreview         from '@/components/admin/social-media/PostPreview';
import LoadingState        from '@/components/admin/social-media/LoadingState';

import type {
  CreationState, CreationStep,
  SocialMediaFormat, SocialMediaMode,
  PostIdea, GeneratedPost, ClaudePostResponse,
} from '@/types/social-media';

const FLASK_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000').replace(/\/$/, '');

const INITIAL_STATE: CreationState = {
  step:             'select-format',
  format:           null,
  slide_count:      3,
  mode:             null,
  admin_prompt:     '',
  material_urls:    [],
  ideas:            [],
  selected_idea:    null,
  generated:        null,
  saved_post_id:    null,
  missing_materials: [],
  loading_message:  '',
};

const LOADING_MESSAGES: Record<string, string> = {
  ideas:      'Analisando tendências para o seu público...',
  post:       'Criando o seu post...',
  adjust:     'Aplicando ajustes...',
  variation:  'Gerando variação visual...',
};

export default function SocialMediaPage() {
  const [state, setState] = useState<CreationState>(INITIAL_STATE);
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();

  function set(patch: Partial<CreationState>) {
    setState((s) => ({ ...s, ...patch }));
  }

  function goTo(step: CreationStep) {
    set({ step });
  }

  // ── Passo 1: Format + Mode ──────────────────────────────

  function handleFormatChange(format: SocialMediaFormat) {
    set({ format, slide_count: format === 'carousel' ? state.slide_count : 3 });
  }

  function handleNext() {
    if (!state.format || !state.mode) {
      toast.error('Escolha o formato e o modo de criação.');
      return;
    }
    if (state.mode === 'directed') {
      goTo('input');
    } else {
      void fetchIdeas();
    }
  }

  // ── Idéias (modo "do zero") ─────────────────────────────

  async function fetchIdeas(loadMore = false) {
    set({ step: 'generating', loading_message: LOADING_MESSAGES.ideas });
    try {
      const res  = await fetch('/api/admin/social-media/generate-ideas', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ format: state.format, slide_count: state.slide_count }),
      });
      const data = await res.json() as { ideas?: PostIdea[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar ideias');

      set({
        ideas: loadMore ? [...state.ideas.slice(-6), ...(data.ideas ?? [])] : (data.ideas ?? []),
        step:  'ideas',
      });
    } catch (e) {
      toast.error(String(e));
      set({ step: 'select-format' });
    }
  }

  // ── Geração do post ─────────────────────────────────────

  async function generatePost(opts?: {
    idea?:          PostIdea;
    adminPrompt?:   string;
    materialUrls?:  string[];
    isVariation?:   boolean;
    isGeneric?:     boolean;
  }) {
    const idea        = opts?.idea        ?? state.selected_idea ?? undefined;
    const adminPrompt = opts?.adminPrompt ?? state.admin_prompt;
    const materials   = opts?.materialUrls ?? state.material_urls;
    const msg         = opts?.isVariation ? LOADING_MESSAGES.variation : LOADING_MESSAGES.post;

    set({ step: 'generating', loading_message: msg, selected_idea: idea ?? null });

    try {
      const res  = await fetch('/api/admin/social-media/generate-post', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          format:        state.format,
          slide_count:   state.slide_count,
          mode:          state.mode,
          idea:          idea ?? undefined,
          admin_prompt:  adminPrompt || undefined,
          material_urls: materials,
        }),
      });
      const data = await res.json() as ClaudePostResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar post');

      if (data.needs_materials && !opts?.isGeneric) {
        set({ step: 'needs-materials', missing_materials: data.missing_materials });
        return;
      }

      if (!data.post) throw new Error('Claude não retornou post');
      set({ step: 'preview', generated: data.post });
    } catch (e) {
      toast.error(String(e));
      set({ step: state.mode === 'directed' ? 'input' : 'ideas' });
    }
  }

  // ── Ajuste de post ──────────────────────────────────────

  async function handleAdjust(adjustmentText: string) {
    if (!state.generated) return;
    set({ step: 'generating', loading_message: LOADING_MESSAGES.adjust });
    try {
      const res  = await fetch('/api/admin/social-media/adjust-post', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          post_id:      state.saved_post_id ?? undefined,
          adjustment:   adjustmentText,
          current_post: state.generated,
          format:       state.format ?? undefined,
        }),
      });
      const data = await res.json() as ClaudePostResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Erro ao ajustar');
      if (!data.post) throw new Error('Claude não retornou post ajustado');
      set({ step: 'preview', generated: data.post });
    } catch (e) {
      toast.error(String(e));
      set({ step: 'preview' });
    }
  }

  // ── Upload de material ──────────────────────────────────

  async function handleUploadFile(file: File) {
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão inválida');

      const formData = new FormData();
      formData.append('file', file);

      const res  = await fetch(`${FLASK_URL}/api/admin/social-media/upload-material`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body:    formData,
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Falha no upload');

      set({ material_urls: [...state.material_urls, data.url!] });
    } catch (e) {
      toast.error(`Upload falhou: ${String(e)}`);
    } finally {
      setUploading(false);
    }
  }

  function handleMaterialRemove(idx: number) {
    const urls = state.material_urls.filter((_, i) => i !== idx);
    set({ material_urls: urls });
  }

  // ── Salvar no histórico ─────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!state.generated || !state.format) return;
    set({ step: 'preview' }); // garante que estamos em preview (estado saving)

    try {
      const firstSlide = state.generated.slides[0];
      const res = await fetch('/api/admin/social-media/history', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          format:            state.format,
          slide_count:       state.format === 'carousel' ? state.slide_count : undefined,
          mode:              state.mode,
          admin_prompt:      state.admin_prompt || undefined,
          title:             state.generated.title,
          theme:             state.generated.theme,
          template_used:     firstSlide?.layout ?? 'bold-statement',
          caption:           state.generated.caption,
          generated_content: { post: state.generated, needs_materials: false, missing_materials: [] },
        }),
      });
      const data = await res.json() as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Falha ao salvar');

      set({ saved_post_id: data.id! });
      toast.success('Post salvo no histórico!');
    } catch (e) {
      toast.error(String(e));
    }
  }, [state]);

  // ── Render ──────────────────────────────────────────────

  const { step, format, slide_count, mode, generated } = state;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={22} className="text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Social Media IA
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Crie posts profissionais para Instagram em segundos.
          </p>
        </div>
        <Link
          href="/portal/admin/social-media/history"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap pt-1"
        >
          Ver histórico →
        </Link>
      </div>

      {/* Step: select-format */}
      {step === 'select-format' && (
        <div className="space-y-8">
          <FormatSelector
            value={format}
            slideCount={slide_count}
            onChange={handleFormatChange}
            onSlideCountChange={(n) => set({ slide_count: n })}
          />
          <ModeSelector
            value={mode}
            onChange={(m: SocialMediaMode) => set({ mode: m })}
          />
          <button
            onClick={handleNext}
            disabled={!format || !mode}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm disabled:opacity-40 transition-colors"
          >
            {mode === 'from_scratch' ? 'Gerar ideias →' : 'Continuar →'}
          </button>
        </div>
      )}

      {/* Step: input (modo directed) */}
      {step === 'input' && (
        <div className="space-y-6">
          <button
            onClick={() => goTo('select-format')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={14} /> Voltar
          </button>

          <DirectedInput
            prompt={state.admin_prompt}
            materialUrls={state.material_urls}
            onPromptChange={(v) => set({ admin_prompt: v })}
            onMaterialAdd={(url) => set({ material_urls: [...state.material_urls, url] })}
            onMaterialRemove={handleMaterialRemove}
            uploading={uploading}
            onUploadFile={handleUploadFile}
          />

          <button
            onClick={() => void generatePost()}
            disabled={!state.admin_prompt.trim()}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm disabled:opacity-40 transition-colors"
          >
            Gerar post →
          </button>
        </div>
      )}

      {/* Step: ideas (modo from_scratch) */}
      {step === 'ideas' && (
        <div className="space-y-4">
          <button
            onClick={() => goTo('select-format')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={14} /> Voltar
          </button>
          <IdeaPicker
            ideas={state.ideas}
            onSelect={(idea) => void generatePost({ idea })}
            onLoadMore={() => void fetchIdeas(true)}
            loadingMore={false}
          />
        </div>
      )}

      {/* Step: generating */}
      {step === 'generating' && (
        <LoadingState message={state.loading_message} />
      )}

      {/* Step: needs-materials */}
      {step === 'needs-materials' && (
        <div className="space-y-4">
          <button
            onClick={() => goTo('input')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={14} /> Voltar
          </button>
          <MaterialRequestCard
            missingMaterials={state.missing_materials}
            onUploadFile={async (file) => {
              await handleUploadFile(file);
              // Com novo material, regera automaticamente
              if (state.material_urls.length + 1 > 0) {
                void generatePost({ materialUrls: [...state.material_urls] });
              }
            }}
            onSkipToGeneric={() => void generatePost({ isGeneric: true })}
            uploading={uploading}
          />
        </div>
      )}

      {/* Step: preview */}
      {step === 'preview' && generated && format && (
        <div className="space-y-4">
          <button
            onClick={() => goTo(mode === 'directed' ? 'input' : 'ideas')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={14} /> Voltar
          </button>
          <PostPreview
            post={generated}
            format={format}
            adminMaterials={state.material_urls}
            savedPostId={state.saved_post_id}
            onAdjust={handleAdjust}
            onVariation={() => void generatePost({ isVariation: true })}
            onSave={handleSave}
            onRestart={() => setState(INITIAL_STATE)}
            adjusting={false}
            saving={false}
          />
        </div>
      )}
    </div>
  );
}
