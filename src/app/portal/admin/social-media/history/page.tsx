'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Trash2, Calendar, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { SocialMediaPost, SocialMediaFormat, SocialMediaTheme } from '@/types/social-media';

const FORMAT_LABEL: Record<SocialMediaFormat, string> = {
  feed_square:   'Feed Quadrado',
  feed_portrait: 'Feed Retrato',
  story:         'Story',
  carousel:      'Carrossel',
};

const THEME_COLORS: Record<SocialMediaTheme, string> = {
  educational:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  motivational:  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  meme:          'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  informational: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  promotional:   'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
};

const THEME_LABELS: Record<SocialMediaTheme, string> = {
  educational: 'Educacional', motivational: 'Motivacional',
  meme: 'Meme', informational: 'Informativo', promotional: 'Promocional',
};

export default function SocialMediaHistoryPage() {
  const [posts, setPosts]     = useState<SocialMediaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const LIMIT = 20;

  useEffect(() => { void load(page); }, [page]);

  async function load(p: number) {
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/social-media/history?page=${p}&limit=${LIMIT}`);
      const data = await res.json() as { posts: SocialMediaPost[]; total: number };
      setPosts(data.posts ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deletar este post do histórico?')) return;
    try {
      await fetch(`/api/admin/social-media/history/${id}`, { method: 'DELETE' });
      setPosts((ps) => ps.filter((p) => p.id !== id));
      setTotal((t) => t - 1);
      toast.success('Post removido');
    } catch {
      toast.error('Erro ao deletar');
    }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/portal/admin/social-media"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={14} /> Voltar
          </Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <LayoutGrid size={20} className="text-blue-600" />
            Histórico
          </h1>
        </div>
        <span className="text-sm text-slate-400">{total} post{total !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Carregando...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-slate-500 dark:text-slate-400">Nenhum post salvo ainda.</p>
          <Link
            href="/portal/admin/social-media"
            className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
          >
            Criar primeiro post →
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {posts.map((post) => {
              const thumb = post.assets?.find((a) => a.asset_type === 'thumbnail' || a.asset_type === 'post_image');
              return (
                <div
                  key={post.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Thumbnail */}
                  <Link href={`/portal/admin/social-media/history/${post.id}`}>
                    <div className="aspect-square bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      {thumb ? (
                        <img
                          src={thumb.public_url}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                            <LayoutGrid size={22} className="text-blue-600" />
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 line-clamp-1">
                        {post.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {FORMAT_LABEL[post.format]}
                      </span>
                      {post.format === 'carousel' && post.slide_count && (
                        <span className="text-[11px] text-slate-400">· {post.slide_count} slides</span>
                      )}
                      <span className={cn(
                        'text-[11px] px-2 py-0.5 rounded-full font-semibold',
                        THEME_COLORS[post.theme]
                      )}>
                        {THEME_LABELS[post.theme]}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Calendar size={11} />
                      {new Date(post.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-4 pb-4 flex gap-2">
                    <Link
                      href={`/portal/admin/social-media/history/${post.id}`}
                      className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold text-center hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Download size={13} /> Baixar
                    </Link>
                    <button
                      onClick={() => void handleDelete(post.id)}
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 hover:border-red-300 dark:hover:border-red-700 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                ←
              </button>
              <span className="px-3 py-1.5 text-sm text-slate-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
