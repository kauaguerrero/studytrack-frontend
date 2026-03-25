'use client'

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { reportError } from '@/lib/reportError';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Loader2, FileText, Plus, AlertCircle, CheckCircle2, 
  Clock, ArrowUpRight, Search, Filter, LayoutGrid, List, ChevronRight, Trash2
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

// --- COMPONENTS ---

const StatusBadge = ({ status }: { status: string }) => {
    const configs: any = {
        'completed': { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2, label: 'Pronta' },
        'review_required': { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertCircle, label: 'Aguardando revisão' },
        'processing': { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Loader2, label: 'Adaptando prova', animate: true },
        'draft': { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock, label: 'Aguardando' },
        'error': { color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle, label: 'Erro na adaptação' }
    };

    const config = configs[status] || configs['draft'];
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${config.color}`}>
            <Icon size={12} className={`mr-1.5 ${config.animate ? 'animate-spin' : ''}`} />
            {config.label}
        </span>
    );
};

const DashboardSkeleton = () => (
    <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-200 rounded-xl" />)}
        </div>
        <div className="h-96 bg-slate-200 rounded-xl" />
    </div>
);

export default function SecretariatDashboard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchJobs() {
        try {
            // Buscar school_id do usuário logado
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('school_id')
                .eq('id', (await supabase.auth.getUser()).data.user?.id)
                .single();

            if (!userProfile?.school_id) {
                console.error('Usuário sem school_id vinculado');
                void reportError("SecretariatPageError", String('Usuário sem school_id vinculado'));
                setLoading(false);
                return;
            }

            // Buscar apenas provas da escola do usuário
            const { data, error } = await supabase
                .from('adapted_exams')
                .select('*, schools(name)')
                .eq('school_id', userProfile.school_id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            setJobs(data || []);
        } catch (err) {
            console.error("Failed to fetch dashboard data", err);
            void reportError("SecretariatPageError", String(err));
        } finally {
            setLoading(false);
        }
    }
    fetchJobs();
  }, []);

  const handleDeleteAll = async () => {
    try {
      // Buscar organization_id do usuário logado
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.organization_id) {
        alert("Não foi possível identificar sua organização. Tente novamente.");
        return;
      }

      const { error } = await supabase
        .from('adapted_exams')
        .delete()
        .eq('organization_id', profile.organization_id);

      if (error) throw error;

      // Limpa a lista local
      setJobs([]);
      setShowDeleteAllModal(false);
    } catch (err) {
      console.error("Failed to delete all exams", err);
      void reportError("SecretariatPageError", String(err));
      alert("Erro ao excluir todas as provas. Tente novamente.");
    }
  };

  const handleDelete = async (jobId: string, filename: string) => {
    if (!confirm(`Tem certeza que deseja excluir a prova "${filename}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('adapted_exams')
        .delete()
        .eq('id', jobId);

      if (error) throw error;

      // Remove da lista local
      setJobs(jobs.filter(job => job.id !== jobId));
    } catch (err) {
      console.error("Failed to delete exam", err);
      void reportError("SecretariatPageError", String(err));
      alert("Erro ao excluir a prova. Tente novamente.");
    }
  };

  const stats = useMemo(() => ({
    today: jobs.filter(j => new Date(j.created_at).toDateString() === new Date().toDateString()).length,
    pending: jobs.filter(j => j.adaptation_status === 'review_required' || j.adaptation_status === 'processing').length,
    total: jobs.length
  }), [jobs]);

  return (
    <div className="min-h-screen bg-white p-6 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Provas Adaptadas</h1>
            <p className="text-slate-500 text-base mt-1">Gerencie as adaptações de provas dos seus alunos.</p>
          </div>
          <Link href="/portal/secretariat/adaptation/new">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white font-semibold h-11 px-6 rounded-lg transition-all shadow-none active:scale-[0.97]">
              <Plus size={18} className="mr-2" /> Adaptar prova
            </Button>
          </Link>
        </div>

        {loading ? <DashboardSkeleton /> : (
            <>
                {/* METRICS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-slate-200 shadow-none hover:shadow-sm transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Hoje</CardTitle>
                            <Clock className="h-4 w-4 text-slate-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-semibold text-slate-900">{stats.today}</div>
                            <p className="text-xs text-slate-500 mt-2">adaptações</p>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200 shadow-none hover:shadow-sm transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Processando</CardTitle>
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-semibold text-amber-600">{stats.pending}</div>
                            <p className="text-xs text-slate-500 mt-2">aguardando</p>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200 shadow-none hover:shadow-sm transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Total</CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-slate-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-semibold text-slate-900">{stats.total}</div>
                            <p className="text-xs text-slate-500 mt-2">provas adaptadas</p>
                        </CardContent>
                    </Card>
                </div>

                {/* RECENT ACTIVITY TABLE/LIST */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-none">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                            <FileText size={18} className="text-slate-500"/> Provas Recentes
                        </h3>
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={() => setShowDeleteAllModal(true)}
                                variant="outline"
                                size="sm"
                                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                            >
                                <Trash2 size={14} className="mr-2" /> Excluir todas
                            </Button>
                            <div className="relative hidden md:block">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input 
                                    type="text" 
                                    placeholder="Buscar..." 
                                    className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {jobs.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="bg-slate-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="text-slate-400" size={28} />
                            </div>
                            <h4 className="text-slate-900 font-medium">Nenhuma prova ainda</h4>
                            <p className="text-slate-500 text-sm mt-1">Comece adaptando uma prova para um aluno.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            <motion.div
                                initial="hidden"
                                animate="visible"
                                variants={{
                                    hidden: { opacity: 0 },
                                    visible: {
                                        opacity: 1,
                                        transition: {
                                            staggerChildren: 0.1
                                        }
                                    }
                                }}
                            >
                                {jobs.map((job) => (
                                    <motion.div
                                        key={job.id}
                                        variants={{
                                            hidden: { opacity: 0, y: 20 },
                                            visible: { opacity: 1, y: 0 }
                                        }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Link href={`/portal/secretariat/adaptation/${job.id}`}>
                                            <div className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="h-9 w-9 bg-slate-100 text-slate-600 rounded-md flex items-center justify-center border border-slate-200 shrink-0">
                                                        <FileText size={18} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="font-medium text-slate-900 text-sm group-hover:text-slate-700 transition-colors truncate">
                                                            {job.original_filename}
                                                        </h4>
                                                        <p className="text-xs text-slate-500 mt-0.5">{format(new Date(job.created_at), "d 'de' MMM, HH:mm", { locale: ptBR })}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="hidden md:block text-right">
                                                        <StatusBadge status={job.adaptation_status} />
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleDelete(job.id, job.original_filename);
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all duration-200"
                                                        title="Excluir prova"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                                                </div>
                                            </div>
                                        </Link>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>
                    )}
                    
                    {jobs.length > 0 && (
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-center">
                            <button className="text-xs font-bold text-slate-500 hover:text-slate-800 uppercase tracking-wide transition-colors">
                                Ver todas as provas
                            </button>
                        </div>
                    )}
                </div>
            </>
        )}
      </div>

      {/* DELETE ALL MODAL */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} className="text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Excluir Todas as Provas</h2>
              <p className="text-slate-600 mb-8 leading-relaxed">
                <strong className="text-red-600 uppercase font-bold text-lg block mb-2">
                  TODAS AS PROVAS ADAPTADAS SERÃO EXCLUÍDAS AO CONFIRMAR ESSA AÇÃO
                </strong>
                Esta ação não pode ser desfeita. Todas as provas adaptadas serão permanentemente removidas do sistema.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowDeleteAllModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleDeleteAll}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
                >
                  CONFIRMAR EXCLUSÃO
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}