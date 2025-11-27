'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { DollarSign, Users, Brain, Activity, Lock, AlertTriangle, ArrowLeft } from 'lucide-react';

// --- Interfaces para Tipagem ---
interface StatsData {
  users: {
    total: number;
    breakdown: {
      free: number;
      trial: number;
      basic: number;
      pro: number;
    };
  };
  financial: {
    gross_revenue_brl: number;
    ai_cost_usd: number;
    ai_cost_brl: number;
    net_profit_brl: number;
  };
  ai_usage: {
    total_requests: number;
    total_tokens: number;
  };
}

// --- Componentes Auxiliares (Para limpar o código principal) ---

const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 gap-3">
    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    <p className="text-sm font-medium animate-pulse">Carregando métricas financeiras...</p>
  </div>
);

const ErrorScreen = ({ message, onBack }: { message: string, onBack: () => void }) => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-50 p-4">
    <div className="p-6 bg-red-50 text-red-600 rounded-full shadow-sm border border-red-100">
      <Lock size={48} strokeWidth={1.5} />
    </div>
    <div className="text-center space-y-2 max-w-md">
      <h1 className="text-2xl font-bold text-slate-900">Acesso Restrito</h1>
      <p className="text-slate-600">{message}</p>
    </div>
    <button 
      onClick={onBack} 
      className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all shadow-sm"
    >
      <ArrowLeft size={18} /> Voltar ao Dashboard
    </button>
  </div>
);

const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  subtext, 
  colorClass = "text-slate-900", 
  bgClass = "bg-white" 
}: any) => (
  <div className={`${bgClass} p-6 rounded-2xl shadow-sm border border-slate-200 transition-all hover:shadow-md`}>
    <div className="flex items-center gap-3 mb-3 text-slate-500 text-xs font-bold uppercase tracking-wider">
      <Icon size={16} /> {label}
    </div>
    <div className={`text-4xl font-extrabold ${colorClass} tracking-tight`}>
      {value}
    </div>
    <p className="text-xs text-slate-400 mt-2 font-medium">{subtext}</p>
  </div>
);

// --- Componente Principal ---

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const supabase = createClient();
  const router = useRouter();

  // Formatadores de Moeda
  const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatUSD = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  useEffect(() => {
    async function fetchStats() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/auth/login');
        return;
      }

      try {
        const res = await fetch('http://127.0.0.1:5000/api/admin/stats', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (res.status === 403) {
          setError('Você não tem permissão de administrador para ver estes dados.');
          setLoading(false);
          return;
        }

        if (!res.ok) throw new Error('Falha na comunicação com o servidor.');

        const data: StatsData = await res.json();
        setStats(data);
      } catch (err) {
        console.error(err);
        setError('Não foi possível carregar as estatísticas. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [router, supabase]); // Dependências do useEffect

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onBack={() => router.push('/dashboard')} />;
  if (!stats) return null; // Fallback final

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/60">
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                  <Lock className="text-slate-400 w-8 h-8" /> 
                  Painel do Dono
                </h1>
                <p className="text-slate-500 mt-1 ml-11">Visão estratégica de performance, receita e custos de IA.</p>
            </div>
            
            <div className="text-right flex flex-col items-end">
                <span className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wide">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-600"></span>
                  </span>
                  Sistema Operacional
                </span>
            </div>
        </header>

        {/* Grid de Cards Financeiros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <StatCard 
            icon={Users}
            label="Base de Usuários"
            value={stats.users.total}
            subtext={`Free: ${stats.users.breakdown.free} | Pro: ${stats.users.breakdown.pro}`}
          />

          <StatCard 
            icon={DollarSign}
            label="Receita Bruta (MRR)"
            value={formatBRL(stats.financial.gross_revenue_brl)}
            subtext="Faturamento Mensal Recorrente"
            colorClass="text-green-600"
          />

          <StatCard 
            icon={Brain}
            label="Custo Operacional IA"
            value={formatBRL(stats.financial.ai_cost_brl)}
            subtext={`${formatUSD(stats.financial.ai_cost_usd)} (Gemini API)`}
            colorClass="text-red-500"
          />

          <StatCard 
            icon={Activity}
            label="Lucro Líquido"
            value={formatBRL(stats.financial.net_profit_brl)}
            subtext="Margem após custos variáveis"
            colorClass="text-blue-700"
            bgClass="bg-gradient-to-br from-blue-50 to-white border-blue-200"
          />

        </div>

        {/* Detalhes de IA e Infraestrutura */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Brain size={20} className="text-violet-600"/> Métricas de Inteligência Artificial
                </h3>
                <p className="text-sm text-slate-500 mt-1">Detalhamento do consumo de tokens do modelo Gemini 2.5 Flash Lite.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                <div className="p-8 hover:bg-slate-50 transition-colors">
                    <p className="text-xs text-slate-400 mb-2 uppercase font-bold tracking-wider">Volume Total de Tokens</p>
                    <p className="text-3xl font-mono font-bold text-slate-900">{stats.ai_usage.total_tokens.toLocaleString('pt-BR')}</p>
                    <p className="text-xs text-slate-400 mt-2 font-medium">Input (Prompt) + Output (Resposta)</p>
                </div>
                
                <div className="p-8 hover:bg-slate-50 transition-colors">
                    <p className="text-xs text-slate-400 mb-2 uppercase font-bold tracking-wider">Requisições Geradas</p>
                    <p className="text-3xl font-mono font-bold text-slate-900">{stats.ai_usage.total_requests}</p>
                    <p className="text-xs text-slate-400 mt-2 font-medium">Chamadas à API do Google</p>
                </div>
                
                <div className="p-8 hover:bg-slate-50 transition-colors">
                    <p className="text-xs text-slate-400 mb-2 uppercase font-bold tracking-wider">Custo Médio / Requisição</p>
                    <p className="text-3xl font-mono font-bold text-slate-900">
                        {stats.ai_usage.total_requests > 0 
                          ? `$ ${(stats.financial.ai_cost_usd / stats.ai_usage.total_requests).toFixed(5)}` 
                          : '$ 0.00000'}
                    </p>
                    <p className="text-xs text-slate-400 mt-2 font-medium">Custo unitário em Dólares</p>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}