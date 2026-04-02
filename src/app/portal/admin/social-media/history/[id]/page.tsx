'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import PostPreview from '@/components/admin/social-media/PostPreview';
import LoadingState from '@/components/admin/social-media/LoadingState';
import type { SocialMediaPost } from '@/types/social-media';

export default function SocialMediaHistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id }               = use(params);
  const [post, setPost]      = useState<SocialMediaPost | null>(null);
  const [loading, setLoading]= useState(true);

  useEffect(() => {
    fetch(`/api/admin/social-media/history/${id}`)
      .then((r) => r.json())
      .then((data: SocialMediaPost & { error?: string }) => {
        if (data.error) toast.error(data.error);
        else setPost(data);
      })
      .catch(() => toast.error('Erro ao carregar post'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <LoadingState message="Carregando post..." />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-3">
        <p className="text-slate-500">Post não encontrado.</p>
        <Link href="/portal/admin/social-media/history" className="text-blue-600 text-sm hover:underline">
          ← Voltar ao histórico
        </Link>
      </div>
    );
  }

  const generatedPost = post.generated_content?.post;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/portal/admin/social-media/history"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={14} /> Histórico
        </Link>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <h1 className="text-base font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">
          {post.title}
        </h1>
      </div>

      {generatedPost ? (
        <PostPreview
          post={generatedPost}
          format={post.format}
          savedPostId={post.id}
          onAdjust={() => {}}
          onVariation={() => {}}
          onSave={async () => {}}
          onRestart={() => {}}
          adjusting={false}
          saving={false}
        />
      ) : (
        <p className="text-slate-400 text-sm">Conteúdo do post não disponível.</p>
      )}
    </div>
  );
}
