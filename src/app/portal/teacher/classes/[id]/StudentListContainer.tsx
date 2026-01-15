'use client';

import { useState, useMemo } from "react";
import { 
    LayoutList, 
    LayoutGrid, 
    User, 
    Phone, 
    Clock, 
    MoreVertical, 
    Flame, 
    Target, 
    Brain,
    Crown
} from "lucide-react";
import { Student } from "../../actions"; 

interface StudentListContainerProps {
    students: Student[];
}

type StudentStatus = 'excellent' | 'warning' | 'critical' | 'neutral';

export function StudentListContainer({ students }: StudentListContainerProps) {
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');

    const getStudentStatus = (student: Student): StudentStatus => {
        const adherencePct = student.adherence.total > 0 
            ? (student.adherence.completed / student.adherence.total) * 100 
            : 0;
        
        const qualityPct = student.quality.percentage;

        const lastActive = student.last_active_at ? new Date(student.last_active_at) : new Date(0);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - lastActive.getTime());
        const daysInactive = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        if (adherencePct >= 70 && daysInactive <= 3 && qualityPct >= 70) return 'excellent';
        if (adherencePct >= 70 && qualityPct < 70) return 'warning';
        if (adherencePct < 50 && qualityPct < 50) return 'critical';
        
        return 'neutral';
    };

    // --- LÓGICA DE ORDENAÇÃO E TOP 1 ---
    const { sortedStudents, topStudentId } = useMemo(() => {
        // 1. Encontrar o ID do melhor aluno (Maior Soma de Aderência + Qualidade)
        let bestId = null;
        let highestScore = -1;

        students.forEach(s => {
            const adherence = s.adherence.total > 0 ? (s.adherence.completed / s.adherence.total) * 100 : 0;
            const score = adherence + s.quality.percentage;
            
            // Critério de desempate simples: O primeiro que encontrar com essa nota. 
            // Poderíamos usar o streak como desempate aqui se quisesse.
            if (score > highestScore) {
                highestScore = score;
                bestId = s.id;
            }
        });

        // 2. Ordenação Padrão
        const sorted = [...students].sort((a, b) => {
            const priority = { excellent: 0, warning: 1, critical: 2, neutral: 3 };
            const statusA = getStudentStatus(a);
            const statusB = getStudentStatus(b);
            
            if (priority[statusA] !== priority[statusB]) {
                return priority[statusA] - priority[statusB];
            }
            return a.full_name.localeCompare(b.full_name);
        });

        return { sortedStudents: sorted, topStudentId: bestId };
    }, [students]);


    const cardStyles = {
        excellent: "bg-emerald-50/70 border-emerald-200 hover:border-emerald-300 hover:shadow-emerald-100",
        warning: "bg-amber-100 border-amber-400 hover:border-amber-500 hover:shadow-amber-200",
        critical: "bg-red-50/70 border-red-200 hover:border-red-300 hover:shadow-red-100",
        neutral: "bg-white border-slate-200 hover:border-blue-200 hover:shadow-slate-100"
    };

    if (students.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="text-slate-300" size={32} />
                </div>
                <p className="font-medium text-slate-900">Nenhum aluno entrou nesta turma ainda.</p>
                <p className="text-sm mt-2 text-slate-500">Compartilhe o código de convite com eles.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            {/* Header com Controles - Mantido Igual */}
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                <div className="flex items-center gap-4">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <User className="text-blue-500" size={20} />
                        Painel de Desempenho
                        <span className="bg-white border border-slate-200 text-slate-600 text-xs px-2.5 py-0.5 rounded-full ml-2 shadow-sm">
                            {students.length} alunos
                        </span>
                    </h2>
                    <div className="hidden lg:flex items-center gap-2 text-[10px] font-medium text-slate-400 border-l border-slate-200 pl-4 ml-2">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400"></div>Excelente</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400"></div>Atenção</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400"></div>Crítico</span>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-2 text-xs font-bold ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
                        <LayoutList size={16} /> <span className="hidden sm:inline">Lista</span>
                    </button>
                    <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-2 text-xs font-bold ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
                        <LayoutGrid size={16} /> <span className="hidden sm:inline">Cards</span>
                    </button>
                </div>
            </div>

            <div className="p-0">
                {viewMode === 'list' ? (
                    // =================================================================
                    // VIEW: LISTA COM COROA NA FOTO
                    // =================================================================
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 min-w-[250px]">Aluno</th>
                                    {/* Tooltips do Header mantidos */}
                                    <th className="px-6 py-4 min-w-[140px]">
                                        <div className="flex items-center gap-1 cursor-help relative group/tooltip w-fit">
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block w-max max-w-[180px] px-3 py-2 bg-slate-800 text-white text-[10px] leading-tight rounded-md shadow-lg z-50 text-center font-normal normal-case">
                                                Dias seguidos que o aluno acessou/estudou
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                            </div>
                                            <Flame size={14} className="text-orange-500"/> Consistência
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 min-w-[180px]">
                                        <div className="flex items-center gap-1 cursor-help relative group/tooltip w-fit">
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block w-max max-w-[180px] px-3 py-2 bg-slate-800 text-white text-[10px] leading-tight rounded-md shadow-lg z-50 text-center font-normal normal-case">
                                                % das tarefas de HOJE que foram concluídas
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                            </div>
                                            <Target size={14} className="text-blue-500"/> Aderência
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 min-w-[140px]">
                                        <div className="flex items-center gap-1 cursor-help relative group/tooltip w-fit">
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block w-max max-w-[180px] px-3 py-2 bg-slate-800 text-white text-[10px] leading-tight rounded-md shadow-lg z-50 text-center font-normal normal-case">
                                                % de acertos em todas as questões respondidas
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                            </div>
                                            <Brain size={14} className="text-purple-500"/> Qualidade
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedStudents.map((student) => {
                                    const status = getStudentStatus(student);
                                    const isTop1 = student.id === topStudentId;

                                    return (
                                        <tr key={student.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold text-sm shadow-sm relative z-0
                                                            ${status === 'excellent' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                                                            status === 'warning' ? 'bg-amber-100 text-amber-700 border-amber-400' :
                                                            status === 'critical' ? 'bg-red-100 text-red-700 border-red-200' :
                                                            'bg-slate-100 text-slate-600 border-slate-300'
                                                            }`}>
                                                            {student.full_name.substring(0,2).toUpperCase()}
                                                        </div>
                                                        {isTop1 && (
                                                            <div className="absolute -top-3 -right-3 z-10 drop-shadow-md animate-bounce-slow" title="Melhor Aluno">
                                                                <Crown size={16} className="text-yellow-500 fill-yellow-500" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 flex items-center gap-2">
                                                            {student.full_name}
                                                            {isTop1 && <span className="text-[10px] font-bold text-yellow-600 bg-yellow-100 border border-yellow-200 px-1.5 py-0.5 rounded">#1</span>}
                                                        </p>
                                                        <div className="flex flex-col gap-0.5 mt-0.5">
                                                            {student.whatsapp_phone && (
                                                                <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                                                                    <Phone size={10} /> {student.whatsapp_phone}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Métricas mantidas igual */}
                                            <td className="px-6 py-4 align-middle">
                                                <span className={`font-bold text-lg ${student.streak > 2 ? 'text-orange-500' : 'text-slate-400'}`}>{student.streak}</span> <span className="text-xs text-slate-500">Dias</span>
                                            </td>
                                            <td className="px-6 py-4 align-middle">
                                                <div className="w-32">
                                                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${student.adherence.total > 0 ? (student.adherence.completed / student.adherence.total) * 100 : 0}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-middle">
                                                <span className="font-bold text-slate-700">{student.quality.percentage}%</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-slate-400 hover:text-blue-600 p-2 rounded-full hover:bg-slate-100 transition-colors"><MoreVertical size={18}/></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    // =================================================================
                    // VIEW: GRID COM COROA NO CARD
                    // =================================================================
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 bg-slate-50/50 min-h-[400px]">
                        {sortedStudents.map((student) => {
                            const status = getStudentStatus(student);
                            const isTop1 = student.id === topStudentId;

                            return (
                                // ALTERAÇÃO AQUI: Removido 'ring-2 ring-yellow-400'
                                <div key={student.id} className={`rounded-2xl border shadow-sm transition-all duration-300 p-5 flex flex-col gap-4 group relative overflow-visible
                                    ${cardStyles[status]}
                                `}>
                                    
                                    {/* COROA DO GRID */}
                                    {isTop1 && (
                                        <div className="absolute -top-3 -right-3 z-10 bg-yellow-400 text-white p-1.5 rounded-full shadow-md border-2 border-white animate-bounce-slow" title="Melhor Aluno">
                                            <Crown size={18} fill="currentColor" />
                                        </div>
                                    )}

                                    {/* Card Header */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center font-bold text-lg shadow-inner shrink-0
                                                ${status === 'excellent' ? 'bg-white border-emerald-200 text-emerald-600' : 
                                                  status === 'warning' ? 'bg-white border-amber-200 text-amber-600' :
                                                  status === 'critical' ? 'bg-white border-red-200 text-red-600' :
                                                  'bg-white border-slate-200 text-slate-600'
                                                }`}>
                                                {student.full_name.substring(0,2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-slate-800 text-sm truncate" title={student.full_name}>
                                                    {student.full_name}
                                                </h3>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                                                    <Clock size={12} className="text-slate-400"/>
                                                    {student.last_active_at 
                                                        ? new Date(student.last_active_at).toLocaleDateString('pt-BR') 
                                                        : "Nunca"}
                                                </div>
                                            </div>
                                        </div>
                                        <button className="text-slate-400 hover:text-slate-700 transition-colors p-1">
                                            <MoreVertical size={18} />
                                        </button>
                                    </div>

                                    {/* Metrics Grid (Com Tooltips) */}
                                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-dashed border-slate-200/50">
                                        
                                        {/* Tooltip Consistência */}
                                        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/60 border border-slate-100 cursor-help transition-colors hover:bg-white relative group/tooltip">
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block w-max max-w-[150px] px-3 py-2 bg-slate-800 text-white text-[10px] leading-tight rounded-md shadow-lg z-50 text-center">
                                                Dias seguidos que o aluno acessou/estudou
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                            </div>
                                            <Flame size={16} className="text-orange-500 mb-1" />
                                            <div className="text-sm font-bold text-slate-700">{student.streak}</div>
                                            <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wide">Dias</div>
                                        </div>

                                        {/* Tooltip Aderência */}
                                        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/60 border border-slate-100 cursor-help transition-colors hover:bg-white relative group/tooltip">
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block w-max max-w-[150px] px-3 py-2 bg-slate-800 text-white text-[10px] leading-tight rounded-md shadow-lg z-50 text-center">
                                                % das tarefas de HOJE que foram concluídas
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                            </div>
                                            <Target size={16} className="text-blue-500 mb-1" />
                                            <div className="text-sm font-bold text-slate-700">
                                                {Math.round(student.adherence.total > 0 ? (student.adherence.completed / student.adherence.total) * 100 : 0)}%
                                            </div>
                                            <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wide">Hoje</div>
                                        </div>

                                        {/* Tooltip Qualidade */}
                                        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/60 border border-slate-100 cursor-help transition-colors hover:bg-white relative group/tooltip">
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block w-max max-w-[150px] px-3 py-2 bg-slate-800 text-white text-[10px] leading-tight rounded-md shadow-lg z-50 text-center">
                                                % de acertos em todas as questões respondidas
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                            </div>
                                            <Brain size={16} className="text-purple-500 mb-1" />
                                            <div className="text-sm font-bold text-slate-700">{student.quality.percentage}%</div>
                                            <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wide">Global</div>
                                        </div>
                                    </div>

                                    {/* Footer Info */}
                                    <div className="flex items-center justify-between text-xs pt-1">
                                        <div className="flex items-center gap-1.5 bg-white/80 px-2 py-1 rounded border border-slate-100 max-w-full shadow-sm" title="WhatsApp">
                                            <Phone size={12} className={student.whatsapp_phone ? "text-green-600" : "text-slate-300"} />
                                            <span className={`truncate ${!student.whatsapp_phone ? "italic text-slate-400" : "text-slate-600 font-medium"}`}>
                                                {student.whatsapp_phone || "Sem contato"}
                                            </span>
                                        </div>
                                        
                                        {status === 'excellent' && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Exemplar</span>}
                                        {status === 'warning' && <span className="text-[10px] font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full">Atenção</span>}
                                        {status === 'critical' && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Crítico</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}