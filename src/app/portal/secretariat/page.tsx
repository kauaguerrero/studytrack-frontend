'use client'

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Loader2, FileText, Plus, AlertCircle, CheckCircle2, 
  Clock, ArrowUpRight, Search, Filter, LayoutGrid, List
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const supabase = createClient();

  useEffect(() => {
    async function fetchJobs() {
        try {
            const { data, error } = await supabase
                .from('adapted_exams')
                .select('*, schools(name)') // Join com schools se existir
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            setJobs(data || []);
        } catch (err) {
            console.error("Failed to fetch dashboard data", err);
        } finally {
            setLoading(false);
        }
    }
    fetchJobs();
  }, []);

  // Métricas
  const stats = {
      today: jobs.filter(j => new Date(j.created_at).toDateString() === new Date().toDateString()).length,
      pending: jobs.filter(j => j.adaptation_status === 'review_required' || j.adaptation_status === 'processing').length,
      total: jobs.length // Em um app real, isso viria de um count no DB
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Portal da Secretaria</h1>
            <p className="text-slate-500 mt-1 font-medium">Adapte provas para alunos com necessidades especiais.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50">
                <Filter size={16} className="mr-2" /> Filtrar
            </Button>
            <Link href="/portal/secretariat/adaptation/new">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all active:scale-95 h-10 px-6">
                <Plus size={18} className="mr-2" /> Adaptar nova prova
              </Button>
            </Link>
          </div>
        </div>

        {loading ? <DashboardSkeleton /> : (
            <>
                {/* METRICS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">Provas Hoje</CardTitle>
                            <Clock className="h-4 w-4 text-slate-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-slate-900">{stats.today}</div>
                            <p className="text-xs text-slate-500 mt-1 flex items-center">
                                <span className="text-emerald-600 font-bold flex items-center mr-1">
                                    <ArrowUpRight size={12}/> +12%
                                </span> 
                                em relação a ontem
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">Aguardando Revisão</CardTitle>
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-amber-600">{stats.pending}</div>
                            <p className="text-xs text-slate-500 mt-1">Precisam de atenção</p>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Adaptadas</CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-blue-600">{stats.total}</div>
                            <p className="text-xs text-slate-500 mt-1">Provas prontas este mês</p>
                        </CardContent>
                    </Card>
                </div>

                {/* RECENT ACTIVITY TABLE/LIST */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <FileText size={18} className="text-slate-400"/> Provas Recentes
                        </h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                                type="text" 
                                placeholder="Buscar aluno ou prova..." 
                                className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-64"
                            />
                        </div>
                    </div>

                    {jobs.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="bg-slate-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="text-slate-300" size={32} />
                            </div>
                            <h4 className="text-slate-900 font-bold">Nenhuma prova encontrada</h4>
                            <p className="text-slate-500 text-sm mt-1">Comece adaptando uma nova prova para um aluno.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {jobs.map((job) => (
                                <div key={job.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100 shrink-0">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                                                {job.original_filename}
                                            </h4>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                <span>{format(new Date(job.created_at), "d 'de' MMM, HH:mm", { locale: ptBR })}</span>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full"/>
                                                <span>{job.schools?.name || 'Escola não vinculada'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="hidden md:block text-right">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                                            <StatusBadge status={job.adaptation_status} />
                                        </div>
                                        
                                        <Link href={`/portal/secretariat/adaptation/${job.id}`}>
                                            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-blue-600 hover:bg-blue-50">
                                                Ver prova <ArrowUpRight size={14} className="ml-1" />
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            ))}
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
    </div>
  );
}