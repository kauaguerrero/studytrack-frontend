'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  DollarSign, Users, Brain, Activity, Lock, AlertTriangle, ArrowLeft,
  LayoutDashboard, Database, Server, HardDrive, RefreshCw, ShieldCheck, BarChart3,
  Layers
} from 'lucide-react';

// --- Interfaces ---
interface DistributionItem {
  name: string;
  count: number;
}

interface DistributionData {
  total: number; // Novo campo
  by_subject: DistributionItem[];
  by_topic: DistributionItem[];
  by_difficulty: DistributionItem[];
  by_year: DistributionItem[];
}

interface StatsData {
  users: { total: number; breakdown: { free: number; trial: number; basic: number; pro: number } };
  financial: { 
    gross_revenue_brl: number; 
    ai_cost_usd: number; 
    ai_cost_brl: number; 
    theoretical_cost_usd?: number;
    theoretical_cost_brl?: number;
    net_profit_brl: number;
    is_free_tier?: boolean; 
  };
  ai_usage: { total_requests: number; total_tokens: number };
  infrastructure: {
    db_size_bytes: number;
    db_limit_bytes: number;
    rows_history: number;
    rows_tasks: number;
  };
}
// --- Componentes Auxiliares ---

const ErrorScreen = ({ message, onBack }: { message: string, onBack: () => void }) => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-50 p-4">
    <div className="p-6 bg-red-50 text-red-600 rounded-full shadow-sm border border-red-100">
      <Lock size={48} strokeWidth={1.5} />
    </div>
    <div className="text-center space-y-2 max-w-md">
      <h1 className="text-2xl font-bold text-slate-900">Acesso Restrito</h1>
      <p className="text-slate-600 font-medium">{message}</p>
      {message.includes("conexão") && (
        <p className="text-xs text-slate-400">Verifique se o backend Python está rodando na porta 5000.</p>
      )}
    </div>
    <button 
      onClick={onBack} 
      className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all shadow-sm"
    >
      <ArrowLeft size={18} /> Voltar ao Dashboard
    </button>
  </div>
);

const UsageBar = ({ label, current, max, unit = "" }: { label: string, current: number, max: number, unit?: string }) => {
  const percentage = Math.min(100, (current / max) * 100);
  let color = "bg-blue-600";
  if (percentage > 70) color = "bg-yellow-500";
  if (percentage > 90) color = "bg-red-600";

  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500 font-mono text-xs">
            {current === 0 ? "Calculando..." : `${current.toLocaleString()}${unit} / ${max.toLocaleString()}${unit}`}
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <div 
          className={`h-2.5 rounded-full transition-all duration-1000 ${color}`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      {percentage > 90 && (
        <p className="text-[10px] text-red-600 mt-1 font-bold flex items-center gap-1">
          <AlertTriangle size={10} /> CRÍTICO
        </p>
      )}
    </div>
  );
};

const bytesToMB = (bytes: number) => Math.round(bytes / (1024 * 1024));

// --- Componente: ANALYTICS / DISTRIBUIÇÃO ---
const AnalyticsPanel = ({ sessionToken }: { sessionToken: string }) => {
  const [data, setData] = useState<DistributionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDist() {
      try {
        const res = await fetch('http://127.0.0.1:5000/api/admin/stats/distribution', {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        });
        if (res.ok) setData(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDist();
  }, [sessionToken]);

  const DistributionCard = ({ title, items, color = "bg-blue-600" }: { title: string, items: DistributionItem[], color?: string }) => {
    if (!items || items.length === 0) return null;
    const maxVal = Math.max(...items.map(i => i.count));

    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <BarChart3 size={16} /> {title}
        </h3>
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {items.map((item, idx) => (
            <div key={idx}>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>{item.name}</span>
                <span>{item.count}</span>
              </div>
              <div className="w-full bg-slate-50 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${color}`} 
                  style={{ width: `${(item.count / maxVal) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) return <div className="h-64 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-blue-600 rounded-full border-t-transparent"></div></div>;
  if (!data) return <div className="p-8 text-center text-slate-400">Falha ao carregar dados.</div>;

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* KPI Total */}
      <div className="flex items-center gap-4">
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md flex-1 md:flex-none md:w-64 border border-slate-800 relative overflow-hidden group">
            <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4">
                 <Layers size={100} />
            </div>
           <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2 relative z-10">
                <Database size={14} className="text-indigo-400" /> Total no Banco
           </h3>
           <div className="text-4xl font-extrabold relative z-10">
              {/* CORREÇÃO AQUI: Fallback para 0 se undefined */}
              {(data.total || 0).toLocaleString()}
           </div>
           <p className="text-[10px] text-slate-500 font-medium mt-1 relative z-10">Questões processadas e ativas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <DistributionCard title="Por Matéria (Subject)" items={data.by_subject} color="bg-indigo-600" />
        <DistributionCard title="Por Dificuldade" items={data.by_difficulty} color="bg-emerald-500" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <DistributionCard title="Top Tópicos (Discipline)" items={data.by_topic} color="bg-violet-600" />
        </div>
        <div>
            <DistributionCard title="Por Ano" items={data.by_year} color="bg-amber-500" />
        </div>
      </div>
    </div>
  );
};

// --- Componente: DASHBOARD (Stats) ---
const DashboardStats = ({ stats, loading }: { stats: StatsData, loading: boolean }) => {
  const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatUSD = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const StatCard = ({ icon: Icon, label, value, subtext, colorClass = "text-slate-900", bgClass = "bg-white", isFreeTier = false, theoreticalCost }: any) => (
    <div className={`${bgClass} p-6 rounded-2xl shadow-sm border border-slate-200 transition-all hover:shadow-md relative overflow-hidden`}>
      <div className="flex items-center gap-3 mb-3 text-slate-500 text-xs font-bold uppercase tracking-wider relative z-10">
        <Icon size={16} /> {label}
      </div>
      <div className={`text-3xl lg:text-4xl font-extrabold ${isFreeTier ? 'text-emerald-600' : colorClass} tracking-tight relative z-10`}>
        {value}
      </div>
      
      {isFreeTier ? (
        <div className="mt-3 flex flex-col gap-1.5 relative z-10">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md w-fit">
              <ShieldCheck size={12} />
              Dentro do limite free
          </div>
          {theoreticalCost && (
            <div className="text-[10px] text-slate-400 font-medium ml-1">
              Economia: <span className="line-through decoration-red-400">{theoreticalCost}</span> (Teórico)
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-400 mt-2 font-medium relative z-10">{subtext}</p>
      )}
    </div>
  );

  return (
    <div className={`space-y-6 transition-opacity duration-300 ${loading ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Users} label="Base de Usuários" value={stats.users.total} subtext={`Free: ${stats.users.breakdown.free} | Pro: ${stats.users.breakdown.pro}`} />
        
        <StatCard icon={DollarSign} label="Receita Bruta (MRR)" value={formatBRL(stats.financial.gross_revenue_brl)} subtext="Faturamento Mensal" colorClass="text-green-600" />
        
        <StatCard 
            icon={Brain} 
            label="Custo IA" 
            value={formatBRL(stats.financial.ai_cost_brl)} 
            subtext={`${formatUSD(stats.financial.ai_cost_usd)} USD`} 
            colorClass="text-red-500" 
            isFreeTier={stats.financial.is_free_tier}
            theoreticalCost={stats.financial.is_free_tier ? formatBRL(stats.financial.theoretical_cost_brl || 0) : undefined}
        />
        
        <StatCard icon={Activity} label="Lucro Líquido" value={formatBRL(stats.financial.net_profit_brl)} subtext="Margem Real" colorClass="text-blue-700" bgClass="bg-gradient-to-br from-blue-50 to-white border-blue-200" />
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 pt-4"><Server size={20} className="text-violet-600"/> Infraestrutura</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-4 text-slate-500 text-xs font-bold uppercase tracking-wider"><Database size={16} /> Armazenamento</div>
            <UsageBar label="Tamanho do Banco" current={bytesToMB(stats.infrastructure.db_size_bytes)} max={bytesToMB(stats.infrastructure.db_limit_bytes)} unit=" MB" />
            {stats.infrastructure.db_size_bytes === 0 && (
                <p className="text-[10px] text-slate-400 mt-2 text-center bg-slate-50 p-2 rounded">
                    ⚠️ RPC <code>get_db_size</code> indisponível.
                </p>
            )}
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-4 text-slate-500 text-xs font-bold uppercase tracking-wider"><HardDrive size={16} /> Volume de Dados</div>
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 font-medium">Questões Geradas</span> 
                <span className="font-bold text-lg bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{stats.infrastructure.rows_history.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 font-medium">Tarefas Criadas</span> 
                <span className="font-bold text-lg bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{stats.infrastructure.rows_tasks.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
             <div className="flex items-center gap-2 mb-4 text-slate-500 text-xs font-bold uppercase tracking-wider"><Brain size={16} /> Tokens AI</div>
             <div className="text-3xl font-mono font-bold text-slate-900">{stats.ai_usage.total_tokens.toLocaleString()}</div>
             <p className="text-xs text-slate-400 mt-1">{stats.ai_usage.total_requests} requisições totais.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- PÁGINA PRINCIPAL (ADMIN) ---
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'stats' | 'distribution'>('stats');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false); // Estado para o loading de filtro
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('30d');

  const supabase = createClient();
  const router = useRouter();

  // Inicialização (Login e Primeira Carga)
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/auth/login'); return; }
      
      setSessionToken(session.access_token);

      if (activeTab === 'stats') {
        try {
          const res = await fetch(`http://127.0.0.1:5000/api/admin/stats?period=${period}`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          });
          
          if (res.status === 403) { setError("Permissão negada."); setLoading(false); return; }
          if (!res.ok) throw new Error("Erro de conexão");
          
          setStats(await res.json());
        } catch (err) {
          setError("Erro de conexão com o backend.");
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }
    init();
  }, [router, supabase, activeTab]); 

  // Atualização de Filtro (Sem tela preta)
  useEffect(() => {
    if (!sessionToken || activeTab !== 'stats') return;

    async function updateStats() {
        setUpdating(true); // Ativa loading sutil
        try {
            const res = await fetch(`http://127.0.0.1:5000/api/admin/stats?period=${period}`, {
                headers: { 'Authorization': `Bearer ${sessionToken}` }
            });
            if (res.ok) {
                setStats(await res.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setUpdating(false);
        }
    }
    updateStats();
  }, [period, sessionToken, activeTab]); 

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin w-10 h-10 border-4 border-blue-600 rounded-full border-t-transparent"></div></div>;
  if (error) return <ErrorScreen message={error} onBack={() => router.push('/dashboard')} />;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/60 sticky top-0 bg-slate-100 z-20 pt-4">
          <div className="flex items-center gap-6">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3"><Lock className="text-slate-400 w-8 h-8" /> Painel Admin</h1>
            <div className="bg-white p-1 rounded-xl border border-slate-200 flex gap-1 shadow-sm">
              <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'stats' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><LayoutDashboard size={16} /> Visão Geral</button>
              <button onClick={() => setActiveTab('distribution')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'distribution' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><BarChart3 size={16} /> Distribuição</button>
            </div>
          </div>
          {activeTab === 'stats' && (
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 relative">
                {updating && (
                    <div className="absolute -top-8 right-0 text-xs font-bold text-blue-600 animate-pulse flex items-center gap-1">
                        <RefreshCw size={12} className="animate-spin"/> Atualizando...
                    </div>
                )}
                {[{ label: '24h', value: '24h' }, { label: '7 Dias', value: '7d' }, { label: '30 Dias', value: '30d' }, { label: 'Tudo', value: 'all' }].map((opt) => (
                    <button key={opt.value} onClick={() => setPeriod(opt.value)} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${period === opt.value ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>{opt.label}</button>
                ))}
            </div>
          )}
        </header>

        {activeTab === 'stats' && stats && <DashboardStats stats={stats} loading={updating} />}
        {activeTab === 'distribution' && sessionToken && <AnalyticsPanel sessionToken={sessionToken} />}
      </div>
    </div>
  );
}