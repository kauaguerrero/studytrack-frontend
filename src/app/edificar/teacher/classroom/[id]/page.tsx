'use client';

import { useState } from "react";
import Link from "next/link";
import { 
    LayoutDashboard, 
    Users, 
    TrendingUp, 
    TrendingDown, 
    AlertTriangle, 
    Brain, 
    Search, 
    Bell, 
    ChevronDown, 
    MoreVertical,
    FileText,
    Calendar,
    ArrowUpRight,
    Clock,
    CheckCircle2,
    XCircle,
    Crown,
    Download
} from "lucide-react";

// ============================================================================
// MOCK DATA - DADOS PARA SIMULAÇÃO
// ============================================================================
const STUDENTS = [
    { id: 1, name: "Ana Clara Souza", avatar: "AC", status: "excellent", score: 92, attendance: 98, trend: "up", weak_topic: "Nenhum", last_seen: "2 min atrás" },
    { id: 2, name: "Bruno Oliveira", avatar: "BO", status: "warning", score: 68, attendance: 85, trend: "down", weak_topic: "Geometria", last_seen: "2 dias atrás" },
    { id: 3, name: "Carlos Mendes", avatar: "CM", status: "critical", score: 45, attendance: 60, trend: "down", weak_topic: "Álgebra", last_seen: "5 dias atrás" },
    { id: 4, name: "Daniela Lima", avatar: "DL", status: "neutral", score: 75, attendance: 90, trend: "stable", weak_topic: "Trigonometria", last_seen: "Hoje" },
    { id: 5, name: "Eduardo Rocha", avatar: "ER", status: "excellent", score: 95, attendance: 100, trend: "up", weak_topic: "Nenhum", last_seen: "1 hora atrás" },
];

const WEAK_TOPICS = [
    { name: "Geometria Analítica", error_rate: 65 },
    { name: "Funções de 2º Grau", error_rate: 48 },
    { name: "Logaritmos", error_rate: 42 },
    { name: "Probabilidade", error_rate: 35 },
];

// ============================================================================
// COMPONENTES VISUAIS (GRÁFICOS CSS PURO)
// ============================================================================

// Gráfico de Barras Simples
const BarChart = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <div className="flex items-center gap-3 text-sm">
        <span className="w-32 truncate text-slate-500 font-medium">{label}</span>
        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }}></div>
        </div>
        <span className="font-bold text-slate-700 w-10 text-right">{value}%</span>
    </div>
);

// Card de Métrica KPI
const KpiCard = ({ title, value, change, icon: Icon, trend }: any) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : trend === 'down' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                <Icon size={20} />
            </div>
            {change && (
                <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1
                    ${change > 0 ? 'text-emerald-700 bg-emerald-100' : 'text-red-700 bg-red-100'}`}>
                    {change > 0 ? '+' : ''}{change}%
                    {change > 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                </span>
            )}
        </div>
        <h3 className="text-slate-500 text-xs uppercase font-bold tracking-wider">{title}</h3>
        <p className="text-2xl font-black text-slate-800 mt-1">{value}</p>
    </div>
);

export default function TeacherAnalyticsDashboard() {
    const [selectedClass, setSelectedClass] = useState("3º Ano A");

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 pb-20">
            
            {/* --- NAVBAR --- */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 py-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-orange-600 to-orange-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                        <LayoutDashboard size={18} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 leading-tight">Edificar</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Painel Docente</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-6">
                    {/* Class Selector */}
                    <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 cursor-pointer hover:border-orange-300 transition-colors">
                        <Users size={14} className="text-slate-500" />
                        <span className="text-sm font-bold text-slate-700">{selectedClass}</span>
                        <ChevronDown size={14} className="text-slate-400" />
                    </div>

                    <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
                        <button className="relative p-2 text-slate-400 hover:text-orange-600 transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="w-9 h-9 bg-slate-900 rounded-full text-white flex items-center justify-center font-bold text-sm border-2 border-slate-200 ring-2 ring-transparent hover:ring-orange-200 cursor-pointer transition-all">
                            PR
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-6 space-y-8">
                
                {/* --- HEADER DA PÁGINA --- */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            Visão Geral da Turma
                            <span className="text-sm font-normal bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">Em tempo real</span>
                        </h2>
                        <p className="text-slate-500 mt-1">Acompanhe o engajamento e desempenho do 3º Ano A.</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
                            <Download size={18} /> Exportar Relatório
                        </button>
                        <button className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-lg shadow-slate-900/10">
                            <Brain size={18} className="text-orange-500" /> Gerar Plano de Ação
                        </button>
                    </div>
                </div>

                {/* --- KPI CARDS --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard 
                        title="Média Geral" 
                        value="7.8" 
                        change={2.4} 
                        icon={TrendingUp} 
                        trend="up" 
                    />
                    <KpiCard 
                        title="Engajamento Semanal" 
                        value="84%" 
                        change={-1.2} 
                        icon={Users} 
                        trend="down" 
                    />
                    <KpiCard 
                        title="Atividades Entregues" 
                        value="128/140" 
                        change={5.0} 
                        icon={FileText} 
                        trend="up" // Blue neutral/up
                    />
                    <KpiCard 
                        title="Alunos em Risco" 
                        value="3" 
                        change={0} 
                        icon={AlertTriangle} 
                        trend="down" // Red indicator for alert
                    />
                </div>

                {/* --- SEÇÃO PRINCIPAL (GRÁFICOS E INSIGHTS) --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Coluna Esquerda: Gráfico de Engajamento */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                <TrendingUp className="text-orange-500" size={20} />
                                Evolução de Desempenho
                            </h3>
                            <select className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-600 outline-none">
                                <option>Últimos 30 dias</option>
                                <option>Este Bimestre</option>
                            </select>
                        </div>
                        
                        {/* Simulação Visual de Gráfico (Placeholder Bonito) */}
                        <div className="h-64 w-full bg-gradient-to-b from-orange-50/50 to-transparent rounded-xl border border-dashed border-orange-100 relative flex items-end justify-between px-4 pb-0 overflow-hidden group cursor-crosshair">
                            {/* Linha SVG Simulada */}
                            <svg className="absolute bottom-0 left-0 w-full h-full" preserveAspectRatio="none">
                                <path d="M0,200 C150,200 100,50 300,100 C450,150 500,20 800,80 L800,300 L0,300 Z" fill="url(#grad)" opacity="0.2" />
                                <path d="M0,200 C150,200 100,50 300,100 C450,150 500,20 800,80" fill="none" stroke="#f97316" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                                <defs>
                                    <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" style={{stopColor:"#f97316", stopOpacity:1}} />
                                        <stop offset="100%" style={{stopColor:"#fff", stopOpacity:0}} />
                                    </linearGradient>
                                </defs>
                            </svg>
                            
                            {/* Barras de fundo para dar contexto */}
                            {[40, 60, 35, 70, 55, 80, 65, 90, 75, 50, 85, 95].map((h, i) => (
                                <div key={i} className="w-8 bg-slate-900/5 rounded-t-md hover:bg-orange-500/20 transition-all relative group/bar" style={{ height: `${h}%` }}>
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        Dia {i+1}: {h}%
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between text-xs font-bold text-slate-400 mt-4 px-2 uppercase tracking-wide">
                            <span>Início do Mês</span>
                            <span>Meio do Período</span>
                            <span>Hoje</span>
                        </div>
                    </div>

                    {/* Coluna Direita: Tópicos Críticos */}
                    <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col">
                        <div className="mb-6">
                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                <AlertTriangle className="text-red-500" size={20} />
                                Pontos de Atenção
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">Tópicos com maior taxa de erro na turma.</p>
                        </div>

                        <div className="space-y-6 flex-1">
                            {WEAK_TOPICS.map((topic, index) => (
                                <div key={index} className="group">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-bold text-slate-700 group-hover:text-red-600 transition-colors">{topic.name}</span>
                                        <span className="font-bold text-red-500">{topic.error_rate}% Erro</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${topic.error_rate}%` }}></div>
                                    </div>
                                    <div className="mt-2 flex justify-end">
                                        <button className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            Verquestões <ArrowUpRight size={10} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button className="w-full mt-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 transition-all">
                            Recomendar Revisão Automática
                        </button>
                    </div>
                </div>

                {/* --- LISTA DE ALUNOS (RANKING E RISCO) --- */}
                <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg">Desempenho Individual</h3>
                            <p className="text-sm text-slate-500">Lista ordenada por prioridade de atenção.</p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Buscar aluno..." 
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                            <button className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100">
                                <Filter size={18} className="text-slate-600" />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Aluno</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Nota Média</th>
                                    <th className="px-6 py-4">Frequência</th>
                                    <th className="px-6 py-4">Tópico Crítico</th>
                                    <th className="px-6 py-4 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {STUDENTS.map((student) => {
                                    const isTop = student.status === 'excellent';
                                    const isCritical = student.status === 'critical';

                                    return (
                                        <tr key={student.id} className={`group transition-colors ${isCritical ? 'bg-red-50/30 hover:bg-red-50/60' : 'hover:bg-slate-50'}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 
                                                            ${isTop ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                                                              isCritical ? 'bg-red-100 text-red-700 border-red-200' : 
                                                              'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                            {student.avatar}
                                                        </div>
                                                        {isTop && (
                                                            <div className="absolute -top-2 -right-2 bg-yellow-400 text-white p-0.5 rounded-full shadow-sm border border-white">
                                                                <Crown size={12} fill="currentColor" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800">{student.name}</p>
                                                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                                            <Clock size={10} /> Visto: {student.last_seen}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {isTop && <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200 inline-flex items-center gap-1"><CheckCircle2 size={12}/> Exemplar</span>}
                                                {student.status === 'warning' && <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold border border-amber-200 inline-flex items-center gap-1"><AlertTriangle size={12}/> Atenção</span>}
                                                {isCritical && <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold border border-red-200 inline-flex items-center gap-1"><XCircle size={12}/> Risco</span>}
                                                {student.status === 'neutral' && <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold border border-slate-200">Regular</span>}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-700">
                                                {student.score}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${student.attendance < 75 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${student.attendance}%` }}></div>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-500">{student.attendance}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {student.weak_topic !== "Nenhum" ? (
                                                    <span className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-bold border border-red-100">
                                                        {student.weak_topic}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-xs italic">--</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-orange-600">
                                                    <MoreVertical size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>
        </div>
    );
}