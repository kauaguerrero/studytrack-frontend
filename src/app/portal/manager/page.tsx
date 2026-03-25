'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { reportError } from '@/lib/reportError';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, ScatterChart, Scatter, ReferenceLine, Label, LabelList
} from 'recharts';
import { 
  Users, BookOpen, Target, Trophy, TrendingUp, Search, 
  MousePointerClick, Building2, Brain, FileText, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

// --- Cores e Constantes ---
const QUADRANT_COLORS = {
  highErrHighVol: "#ef4444", // Vermelho (Esforço Crítico)
  highErrLowVol: "#f59e0b",  // Amarelo (Evitação)
  lowErrHighVol: "#10b981",  // Verde (Domínio)
  lowErrLowVol: "#3b82f6"    // Azul (Conforto)
};

// --- Interfaces ---
interface School {
  id: string;
  name: string;
}

interface DashboardData {
  kpis: {
    active_students_wau: number;
    total_activities_completed: number;
    total_goals_completed: number;
    books_read_count: number;
  };
  charts: {
    subject_difficulty: Array<{
      subject_name: string;
      error_rate: number;      // Y: Ruim (100) -> Bom (0)
      receptivity_index: number; // X: Baixo (0) -> Alto (100)
    }>;
    class_ranking: Array<{
      name: string;
      engagement_score: number;
    }>;
  };
  behavior: {
    reading_vs_gaming: Array<{ name: string; value: number; fill: string }>;
    top_students: Array<{ full_name: string; total_points: number }>;
    // Novos campos para os rankings
    top_question_solvers: Array<{ full_name: string; total_questions: number }>;
    top_simulation_doers: Array<{ full_name: string; total_simulations: number }>;
  };
}

export default function PedagogicalDashboard() {
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [graphLoading, setGraphLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL; // CORREÇÃO: Consome a URL de ambiente

  // 1. Fetch Lista de Escolas
  useEffect(() => {
    async function fetchSchoolsList() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // CORREÇÃO: Usando a variável de ambiente no lugar do localhost chumbado
        const res = await fetch(`${apiUrl}/api/enterprise/manager/schools`, {
          headers: { 
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) throw new Error("Falha ao listar escolas.");

        const jsonData = await res.json();
        
        if (jsonData.schools && jsonData.schools.length > 0) {
          setSchools(jsonData.schools);
          setSelectedSchoolId(jsonData.schools[0].id);
        } else {
          setError("Nenhuma escola vinculada.");
        }
      } catch (err) {
        console.error(err);
        void reportError("ManagerPageError", String(err));
        setError("Erro de conexão com o servidor.");
      } finally {
        setLoading(false);
      }
    }
    fetchSchoolsList();
  }, [apiUrl, supabase.auth]);

  // 2. Fetch Dados do Dashboard
  useEffect(() => {
    if (!selectedSchoolId) return;

    async function fetchDashboardData() {
      setGraphLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // CORREÇÃO: Usando a variável de ambiente no lugar do localhost chumbado
        const res = await fetch(`${apiUrl}/api/enterprise/manager/dashboard/${selectedSchoolId}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });

        if (!res.ok) throw new Error("Erro ao carregar dados.");
        
        const jsonData = await res.json();
        setData(jsonData);
      } catch (err) {
        toast.error("Erro ao atualizar dados.");
      } finally {
        setGraphLoading(false);
      }
    }

    fetchDashboardData();
  }, [selectedSchoolId, apiUrl, supabase.auth]);

  // Handler de cores dos quadrantes
  const getPointColor = (errorRate: number, receptivity: number) => {
    if (errorRate > 50 && receptivity > 50) return QUADRANT_COLORS.highErrHighVol; // Crítico
    if (errorRate > 50 && receptivity <= 50) return QUADRANT_COLORS.highErrLowVol; // Perigo
    if (errorRate <= 50 && receptivity > 50) return QUADRANT_COLORS.lowErrHighVol; // Sucesso
    return QUADRANT_COLORS.lowErrLowVol; // Conforto
  };

  const scatterData = data?.charts.subject_difficulty.map(item => ({
    ...item,
    fill: getPointColor(item.error_rate, item.receptivity_index)
  }));

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-600"/></div>;
  if (error) return <div className="h-screen flex items-center justify-center text-red-600 font-medium">{error}</div>;

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
             <TrendingUp className="text-indigo-600" /> Cockpit Pedagógico
          </h1>
          <p className="text-slate-500 text-sm mt-1">Visão estratégica de engajamento e performance.</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                <SelectTrigger className="w-[260px] border-0 focus:ring-0 text-base font-semibold text-indigo-900 bg-transparent shadow-none">
                    <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                    {schools.map((school) => (
                        <SelectItem key={school.id} value={school.id} className="cursor-pointer">
                            <div className="flex items-center gap-2">
                                <Building2 size={16} className="text-slate-400"/>
                                <span>{school.name}</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>

      <div className={`transition-all duration-500 ${graphLoading ? 'opacity-50 blur-sm pointer-events-none' : 'opacity-100'}`}>
          
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <MetricCard 
                label="Alunos Ativos (7d)" 
                value={data?.kpis.active_students_wau} 
                icon={Users} 
                trend="+12% vs semana anterior"
                trendColor="text-emerald-600"
            />
             <MetricCard 
                label="Entregas Realizadas" 
                value={data?.kpis.total_activities_completed} 
                icon={Target} 
            />
             <MetricCard 
                label="Metas Concluídas" 
                value={data?.kpis.total_goals_completed} 
                icon={Trophy} 
            />
             <MetricCard 
                label="Livros Lidos" 
                value={data?.kpis.books_read_count} 
                icon={BookOpen} 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            
            {/* QUADRANT CHART */}
            <Card className="lg:col-span-2 shadow-sm border-slate-200 relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Search size={18} className="text-slate-400"/> 
                    Matriz de Diagnóstico de Matérias
                </CardTitle>
                <CardDescription>
                  Identifique matérias críticas cruzando <b>Receptividade</b> vs <b>Dificuldade</b>.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[420px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                        type="number" dataKey="receptivity_index" name="Receptividade" unit="%" domain={[0, 100]} 
                        label={{ value: 'Engajamento / Receptividade →', position: 'bottom', offset: 0, fontSize: 12, fill: '#64748b' }}
                        tick={{ fontSize: 11 }}
                    />
                    <YAxis 
                        type="number" dataKey="error_rate" name="Taxa de Erro" unit="%" domain={[0, 100]} 
                        label={{ value: 'Dificuldade / Taxa de Erro →', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12, fill: '#64748b' }}
                        tick={{ fontSize: 11 }}
                    />
                    <ReferenceLine x={50} stroke="#94a3b8" strokeDasharray="5 5" />
                    <ReferenceLine y={50} stroke="#94a3b8" strokeDasharray="5 5" />

                    <Label value="PERIGO" position="insideTopLeft" offset={20} fill={QUADRANT_COLORS.highErrLowVol} fontSize={10} fontWeight="bold" />
                    <Label value="CRÍTICO" position="insideTopRight" offset={20} fill={QUADRANT_COLORS.highErrHighVol} fontSize={10} fontWeight="bold" />
                    <Label value="CONFORTO" position="insideBottomLeft" offset={20} fill={QUADRANT_COLORS.lowErrLowVol} fontSize={10} fontWeight="bold" />
                    <Label value="DOMÍNIO" position="insideBottomRight" offset={20} fill={QUADRANT_COLORS.lowErrHighVol} fontSize={10} fontWeight="bold" />

                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={CustomScatterTooltip} />
                    
                    <Scatter name="Disciplinas" data={scatterData} shape="circle">
                        {scatterData?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={1} stroke="#fff"/>
                        ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
                
                {/* DONUT CHART */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <MousePointerClick size={16} className="text-indigo-500"/> Preferência de Estudo
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[220px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data?.behavior.reading_vs_gaming}
                                    cx="50%" cy="50%"
                                    innerRadius={60} outerRadius={80}
                                    paddingAngle={5} dataKey="value" stroke="none"
                                >
                                    {data?.behavior.reading_vs_gaming?.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.name === 'Leitores' ? '#3b82f6' : '#a855f7'} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                            <span className="text-xs font-bold text-slate-400">ATIVIDADE</span>
                        </div>
                    </CardContent>
                </Card>

                {/* LEADERBOARD XP */}
                <Card className="shadow-sm border-slate-200 flex-1">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Trophy size={16} className="text-amber-500"/> Top Performers (XP)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {data?.behavior.top_students?.map((student, idx) => (
                                <li key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {idx + 1}
                                        </div>
                                        <span className="font-medium text-sm text-slate-700">{student.full_name?.split(' ')[0] || "Aluno"}</span>
                                    </div>
                                    <Badge variant="secondary" className="font-mono text-xs">{student.total_points} XP</Badge>
                                </li>
                            ))}
                            {(!data?.behavior.top_students?.length) && <div className="text-center py-4 text-xs text-slate-400">Sem dados.</div>}
                        </ul>
                    </CardContent>
                </Card>
            </div>
          </div>

          {/* --- NOVO: HALL DA FAMA (RANKINGS) --- */}
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Trophy className="text-amber-500" /> Hall da Fama
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            
            {/* Top Questões */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="pb-2 border-b border-slate-50">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Brain size={18} className="text-indigo-600"/> Top Resolutores de Questões
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={data?.behavior.top_question_solvers} margin={{ left: 0, right: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="full_name" width={100} tick={{fontSize: 12}} tickFormatter={(val) => val ? val.split(' ')[0] : ''} />
                            <Tooltip cursor={{fill: '#f1f5f9'}} />
                            <Bar dataKey="total_questions" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={20} name="Questões">
                                <LabelList dataKey="total_questions" position="right" fontSize={12} fontWeight="bold" fill="#4f46e5"/>
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Top Simulados */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="pb-2 border-b border-slate-50">
                    <CardTitle className="text-base flex items-center gap-2">
                        <FileText size={18} className="text-emerald-600"/> Top Simulados Concluídos
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={data?.behavior.top_simulation_doers} margin={{ left: 0, right: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="full_name" width={100} tick={{fontSize: 12}} tickFormatter={(val) => val ? val.split(' ')[0] : ''} />
                            <Tooltip cursor={{fill: '#f1f5f9'}} />
                            <Bar dataKey="total_simulations" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} name="Simulados">
                                <LabelList dataKey="total_simulations" position="right" fontSize={12} fontWeight="bold" fill="#10b981"/>
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
          </div>

          {/* RANKING DE TURMAS */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 size={18} className="text-slate-400"/> Engajamento Geral por Turma
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.charts.class_ranking} barSize={50}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                        <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} dy={10}/>
                        <YAxis hide/>
                        <Tooltip cursor={{fill: '#f8fafc'}} />
                        <Bar dataKey="engagement_score" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}

// --- Componentes Auxiliares (Definições) ---

function MetricCard({ label, value, icon: Icon, trend, trendColor = "text-emerald-600" }: any) {
    return (
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-5">
                <div className="flex justify-between items-start mb-2">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                        <Icon size={20} />
                    </div>
                    {trend && (
                        <span className={`text-[10px] font-bold ${trendColor} bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1`}>
                            <TrendingUp size={10} /> {trend}
                        </span>
                    )}
                </div>
                <div>
                    <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                        {value !== undefined ? value.toLocaleString() : "-"}
                    </span>
                    <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wide">
                        {label}
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}

function CustomScatterTooltip({ active, payload }: any) {
    if (active && payload && payload.length) {
        const d = payload[0].payload;
        return (
            <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-lg text-xs z-50 min-w-[180px]">
                <p className="font-bold text-sm mb-2 text-slate-800 border-b pb-1">{d.subject_name}</p>
                <div className="space-y-1">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Erro:</span>
                        <span className={`font-mono font-bold ${d.error_rate > 50 ? 'text-red-600' : 'text-emerald-600'}`}>{d.error_rate}%</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Engajamento:</span>
                        <span className="font-mono font-bold text-blue-600">{d.receptivity_index}%</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
}