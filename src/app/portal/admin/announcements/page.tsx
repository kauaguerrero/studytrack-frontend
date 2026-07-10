'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Bell, Plus, Trash2, Loader2 } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getAnnouncementIcon } from '@/lib/announcement-icons';
import CreateAnnouncementModal from '@/components/admin/CreateAnnouncementModal';

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  icon: string;
  target_plan: string;
  created_at: string;
  expires_at: string | null;
  active: boolean;
}

const TARGET_LABELS: Record<string, string> = {
  all: 'Todos os usuários',
  b2b_basic: 'Parceiros — Basic',
  b2b_student: 'Parceiros — Student',
  b2b_pro: 'Parceiros — Pro',
  b2b_test: 'Contas de teste',
};

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const supabase = createClient();

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Sessão inválida. Faça login novamente.');
        return;
      }

      const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000').replace(/\/$/, '');
      const res = await fetch(`${apiUrl}/api/admin/announcements`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.status === 401 || res.status === 403) {
        toast.error('Acesso negado. Apenas administradores.');
        return;
      }
      if (!res.ok) throw new Error('Falha ao carregar anúncios');

      const data = (await res.json()) as { announcements: AnnouncementRow[] };
      setAnnouncements(data.announcements ?? []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar anúncios.');
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, [supabase.auth]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Sessão inválida.');
        return;
      }

      const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000').replace(/\/$/, '');
      const res = await fetch(`${apiUrl}/api/admin/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Falha ao desativar anúncio.');
      }

      toast.success('Anúncio desativado.');
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, active: false } : a)));
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao desativar anúncio.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900 flex flex-col">
      <div className="max-w-4xl mx-auto w-full space-y-6 flex-1 flex flex-col">
        {/* Header & toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <Link href="/portal/admin">
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 h-10 w-10 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              >
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                <Bell className="w-6 h-6 text-violet-500" />
                Novidades
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {announcements.length} anúncio(s) cadastrado(s)
              </p>
            </div>
          </div>

          <Button
            onClick={() => setModalOpen(true)}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Nova novidade
          </Button>
        </div>

        {/* Lista */}
        <div className="flex-1 space-y-3">
          {loading ? (
            <Card className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ) : announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-slate-300 shadow-sm">
              <div className="w-20 h-20 bg-violet-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-violet-50/50">
                <Bell size={40} className="text-violet-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Nenhuma novidade cadastrada</h3>
              <p className="text-slate-500 mt-2 max-w-sm text-center">
                Crie o primeiro anúncio para que ele apareça no sino de novidades dos alunos.
              </p>
              <Button
                onClick={() => setModalOpen(true)}
                className="mt-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Nova novidade
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {announcements.map((a) => {
                const Icon = getAnnouncementIcon(a.icon);
                const isExpired = a.expires_at ? new Date(a.expires_at) < new Date() : false;
                return (
                  <Card
                    key={a.id}
                    className={`w-full bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors ${
                      a.active && !isExpired ? 'border-slate-200 hover:border-slate-300' : 'border-slate-100 opacity-60'
                    }`}
                  >
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-500/20">
                        <Icon className="h-4.5 w-4.5 text-violet-500" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">{a.title}</p>
                          {!a.active && (
                            <Badge variant="outline" className="text-xs bg-slate-50 text-slate-500 border-slate-200">
                              Desativado
                            </Badge>
                          )}
                          {isExpired && (
                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                              Expirado
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {TARGET_LABELS[a.target_plan] ?? a.target_plan}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2 whitespace-pre-line">{a.body}</p>
                        <p className="text-xs text-slate-400 mt-1.5">
                          Criado em{' '}
                          {new Date(a.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                          })}
                          {a.expires_at && (
                            <> · expira em {new Date(a.expires_at).toLocaleDateString('pt-BR')}</>
                          )}
                        </p>
                      </div>

                      {a.active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(a.id)}
                          disabled={deletingId === a.id}
                        >
                          {deletingId === a.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CreateAnnouncementModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetchAnnouncements}
      />
    </div>
  );
}
