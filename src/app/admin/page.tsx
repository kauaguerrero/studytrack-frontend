'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  DollarSign, Users, Brain, Activity, Lock, AlertTriangle, ArrowLeft,
  CheckCircle2, XCircle, Edit3, Save, Trash2, LayoutDashboard, ListChecks
} from 'lucide-react';

// --- Interfaces ---
interface Question {
  id: string;
  statement: string;
  subject: string;
  metadata: { ai_topic?: string };
  alternatives: { label: string; text: string; isCorrect: boolean }[];
}

interface StatsData {
  users: { total: number; breakdown: { free: number; trial: number; basic: number; pro: number } };
  financial: { gross_revenue_brl: number; ai_cost_usd: number; ai_cost_brl: number; net_profit_brl: number };
  ai_usage: { total_requests: number; total_tokens: number };
}

// --- Componente: CURADORIA (Aba Nova) ---
const CurationPanel = ({ sessionToken }: { sessionToken: string }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQ, setSelectedQ] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // NOVO: Estado para controlar qual lista estamos vendo
  const [viewMode, setViewMode] = useState<'pending' | 'verified'>('pending');

  const fetchQuestions = async () => {
    setLoading(true);
    setSelectedQ(null);
    try {
      // 1. Define a URL base
      let url = viewMode === 'pending'
        ? 'http://127.0.0.1:5000/api/admin/curation/pending'
        : 'http://127.0.0.1:5000/api/admin/curation/verified';

      // 2. O TRUQUE DE ELITE (Cache Buster) 💣
      // Adicionamos um número aleatório no final (?t=12345678)
      // O navegador acha que é uma página nova e é obrigado a baixar de novo.
      url += `?t=${new Date().getTime()}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
        // Removemos o 'cache: no-store' daqui para parar o erro vermelho
      });

      const data = await res.json();
      setQuestions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Recarrega sempre que mudar o modo (Pendentes <-> Aprovadas)
  useEffect(() => { fetchQuestions(); }, [viewMode]);

  const handleApprove = async () => {
    if (!selectedQ) return;
    setSaving(true);
    try {
      // 1. Manda pro Backend
      await fetch(`http://127.0.0.1:5000/api/admin/curation/approve/${selectedQ.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          statement: selectedQ.statement,
          subject: selectedQ.subject,
          topic: selectedQ.metadata?.ai_topic,
          alternatives: selectedQ.alternatives
        })
      });

      // 2. Atualiza a Interface (AQUI MUDOU)
      if (viewMode === 'pending') {
        // Se estava pendente, remove da lista (foi pra outra aba)
        setQuestions(prev => prev.filter(q => q.id !== selectedQ.id));
        setSelectedQ(null); // Limpa seleção
      } else {
        // Se já estava aprovada (edição), mantém na lista e atualiza os dados visuais
        setQuestions(prev => prev.map(q =>
          q.id === selectedQ.id ? { ...q, ...selectedQ } : q
        ));
        // Opcional: Mostrar um toast de sucesso aqui
        alert("Atualizado com sucesso!");
      }

    } catch (err) {
      alert("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedQ || !confirm("Tem certeza que quer apagar esta questão do banco?")) return;
    try {
      await fetch(`http://127.0.0.1:5000/api/admin/curation/delete/${selectedQ.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      setQuestions(prev => prev.filter(q => q.id !== selectedQ.id));
      setSelectedQ(null);
    } catch (err) {
      alert("Erro ao excluir");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* Lista Lateral */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-y-auto flex flex-col">

        {/* Header da Lista com Toggle */}
        <div className="p-4 border-b bg-slate-50 sticky top-0 z-10 space-y-3">
          <div className="flex bg-slate-200 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('pending')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'pending' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setViewMode('verified')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'verified' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Aprovadas
            </button>
          </div>
          <div className="text-xs font-bold text-slate-400 uppercase">
            {viewMode === 'pending' ? 'Fila de Trabalho' : 'Histórico Recente'} ({questions.length})
          </div>
        </div>

        {/* Lista de Itens */}
        <div className="divide-y flex-1">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Carregando...</div>
          ) : questions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">Nenhuma questão encontrada.</div>
          ) : (
            questions.map(q => (
              <div
                key={q.id}
                onClick={() => setSelectedQ(q)}
                className={`p-4 cursor-pointer hover:bg-blue-50 transition-colors ${selectedQ?.id === q.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-400 uppercase">{q.subject}</span>
                  {viewMode === 'verified' && <CheckCircle2 size={14} className="text-green-500" />}
                </div>
                <div className="text-sm text-slate-800 line-clamp-2">{q.statement}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor Principal */}
      <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        {selectedQ ? (
          <>
            <div className="p-6 flex-1 overflow-y-auto space-y-6 relative">
              {/* Aviso se estiver editando algo já aprovado */}
              {viewMode === 'verified' && (
                <div className="absolute top-0 right-0 left-0 bg-green-50 text-green-700 text-xs font-bold p-2 text-center border-b border-green-100">
                  Esta questão já foi verificada. Editar aqui atualizará os dados ao vivo.
                </div>
              )}

              {/* ... (O resto do formulário de edição é IDÊNTICO ao anterior) ... */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Matéria</label>
                  <input
                    value={selectedQ.subject}
                    onChange={e => setSelectedQ({ ...selectedQ, subject: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Tópico IA</label>
                  <input
                    value={selectedQ.metadata?.ai_topic || ''}
                    onChange={e => setSelectedQ({ ...selectedQ, metadata: { ...selectedQ.metadata, ai_topic: e.target.value } })}
                    className="w-full p-2 border rounded-lg text-sm bg-purple-50 text-purple-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Enunciado</label>
                <textarea
                  value={selectedQ.statement}
                  onChange={e => setSelectedQ({ ...selectedQ, statement: e.target.value })}
                  className="w-full p-4 border rounded-lg text-sm leading-relaxed min-h-[150px]"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-500">Alternativas</label>
                {selectedQ.alternatives.map((alt, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <button
                      onClick={() => {
                        const newAlts = selectedQ.alternatives.map((a, i) => ({ ...a, isCorrect: i === idx }));
                        setSelectedQ({ ...selectedQ, alternatives: newAlts });
                      }}
                      className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold ${alt.isCorrect ? 'bg-green-500 text-white border-green-600' : 'bg-white text-slate-400'}`}
                    >
                      {alt.label}
                    </button>
                    <input
                      value={alt.text}
                      onChange={(e) => {
                        const newAlts = [...selectedQ.alternatives];
                        newAlts[idx].text = e.target.value;
                        setSelectedQ({ ...selectedQ, alternatives: newAlts });
                      }}
                      className="flex-1 p-2 border rounded-lg text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Barra de Ação */}
            <div className="p-4 border-t bg-slate-50 flex justify-between items-center">
              <button
                onClick={handleDelete}
                className="text-red-500 hover:bg-red-100 p-2 rounded-lg flex items-center gap-2 text-sm font-bold px-4"
              >
                <Trash2 size={18} /> Excluir
              </button>

              {/* Botão Dinâmico */}
              <button
                onClick={handleApprove}
                disabled={saving}
                className={`text-white p-2 rounded-lg flex items-center gap-2 text-sm font-bold px-6 shadow-sm transition-all ${saving ? 'bg-gray-400' : viewMode === 'pending' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {saving ? 'Salvando...' : viewMode === 'pending' ? <><CheckCircle2 size={18} /> Aprovar</> : <><Save size={18} /> Salvar Edição</>}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Edit3 size={48} className="mb-4 opacity-20" />
            <p>Selecione uma questão ao lado.</p>
          </div>
        )}
      </div>
    </div>
  );
};


// --- Componente: DASHBOARD (O que você já tinha, encapsulado) ---
const DashboardStats = ({ stats }: { stats: StatsData }) => {
  // Formatadores
  const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatUSD = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const StatCard = ({ icon: Icon, label, value, subtext, colorClass = "text-slate-900", bgClass = "bg-white" }: any) => (
    <div className={`${bgClass} p-6 rounded-2xl shadow-sm border border-slate-200 transition-all hover:shadow-md`}>
      <div className="flex items-center gap-3 mb-3 text-slate-500 text-xs font-bold uppercase tracking-wider">
        <Icon size={16} /> {label}
      </div>
      <div className={`text-4xl font-extrabold ${colorClass} tracking-tight`}>{value}</div>
      <p className="text-xs text-slate-400 mt-2 font-medium">{subtext}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Grid de Cards Financeiros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Users} label="Base de Usuários" value={stats.users.total} subtext={`Free: ${stats.users.breakdown.free} | Pro: ${stats.users.breakdown.pro}`} />
        <StatCard icon={DollarSign} label="Receita Bruta (MRR)" value={formatBRL(stats.financial.gross_revenue_brl)} subtext="Faturamento Mensal Recorrente" colorClass="text-green-600" />
        <StatCard icon={Brain} label="Custo Operacional IA" value={formatBRL(stats.financial.ai_cost_brl)} subtext={`${formatUSD(stats.financial.ai_cost_usd)} (Gemini API)`} colorClass="text-red-500" />
        <StatCard icon={Activity} label="Lucro Líquido" value={formatBRL(stats.financial.net_profit_brl)} subtext="Margem após custos variáveis" colorClass="text-blue-700" bgClass="bg-gradient-to-br from-blue-50 to-white border-blue-200" />
      </div>
      {/* Detalhes de IA */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Brain size={20} className="text-violet-600" /> Métricas de Inteligência Artificial</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          <div className="p-8"><p className="text-xs text-slate-400 mb-2 uppercase font-bold">Total Tokens</p><p className="text-3xl font-mono font-bold">{stats.ai_usage.total_tokens.toLocaleString()}</p></div>
          <div className="p-8"><p className="text-xs text-slate-400 mb-2 uppercase font-bold">Requisições</p><p className="text-3xl font-mono font-bold">{stats.ai_usage.total_requests}</p></div>
          <div className="p-8"><p className="text-xs text-slate-400 mb-2 uppercase font-bold">Custo/Req</p><p className="text-3xl font-mono font-bold">{stats.ai_usage.total_requests > 0 ? `$ ${(stats.financial.ai_cost_usd / stats.ai_usage.total_requests).toFixed(5)}` : '$0'}</p></div>
        </div>
      </div>
    </div>
  )
}

// --- PÁGINA PRINCIPAL (ADMIN) ---
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'stats' | 'curation'>('stats');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function init() {
      /*
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/auth/login'); return; }
      setSessionToken(session.access_token);
      */
      console.warn("🔓 MODO DEV: Autenticação desativada no Admin");
      setSessionToken("token-falso-de-desenvolvimento"); // Um token qualquer para não dar erro de null

      try {
        const res = await fetch('http://127.0.0.1:5000/api/admin/stats', {
          headers: { 'Authorization': `Bearer token-falso-de-desenvolvimento` }
        });
        // if (res.status === 403) throw new Error("Sem permissão");
        if (!res.ok) throw new Error("Erro no servidor");
        setStats(await res.json());
      } catch (err) {
        setError("Acesso negado ou erro de conexão.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-blue-600 rounded-full border-t-transparent"></div></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600 font-bold">{error}</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header com Navegação */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/60">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                <Lock className="text-slate-400 w-8 h-8" /> Painel Admin
              </h1>
            </div>

            {/* Navegação de Abas */}
            <div className="bg-white p-1 rounded-xl border border-slate-200 flex gap-1 shadow-sm">
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'stats' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <LayoutDashboard size={16} /> Visão Geral
              </button>
              <button
                onClick={() => setActiveTab('curation')}
                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'curation' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <ListChecks size={16} /> Curadoria <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">New</span>
              </button>
            </div>
          </div>
        </header>

        {/* Conteúdo Dinâmico */}
        {activeTab === 'stats' && stats && <DashboardStats stats={stats} />}
        {activeTab === 'curation' && sessionToken && <CurationPanel sessionToken={sessionToken} />}

      </div>
    </div>
  );
}