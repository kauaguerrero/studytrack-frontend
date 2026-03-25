"use client";

import { useEffect, useState, useMemo } from "react";
import {
    getAllMyStudents,
    getAllMyGrades,
    GeneralStudent,
    GradeEntry
} from "../actions";
import { reportError } from '@/lib/reportError'; 
import { 
    Card, CardContent 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
    Search, GraduationCap, Medal, AlertCircle, Clock, 
    LayoutGrid, LayoutList, Users, Brain, Filter, Info
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Certifique-se que esse componente existe ou use title nativo

// Interface unificada
interface StudentReport {
  id: string;
  name: string;
  email: string;
  classroom_name: string;
  total_xp: number; 
  questions_done: number; 
  grade: number; 
  last_active: string | null;
}

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<StudentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [studentsData, gradesData] = await Promise.all([
            getAllMyStudents(),
            getAllMyGrades()
        ]);

        const processedData: StudentReport[] = studentsData.map((student: GeneralStudent) => {
            const studentGrades = gradesData.filter(
                (g: GradeEntry) => g.student_name === student.full_name && g.grade !== null
            );

            const totalGrades = studentGrades.reduce((acc, curr) => acc + (curr.grade || 0), 0);
            const avgGrade = studentGrades.length > 0 ? (totalGrades / studentGrades.length) : 0;

            return {
                id: student.id,
                name: student.full_name,
                email: student.email || 'Sem email',
                classroom_name: student.classroom_name || 'Sem Turma',
                total_xp: (student.streak || 0) * 150, // Simulação de XP
                questions_done: (student.streak || 0) * 5, // Simulação de Questões
                grade: Number(avgGrade.toFixed(1)),
                last_active: student.last_active_at
            };
        });

        setStudents(processedData);
      } catch (error) {
        console.error("Erro data:", error);
        void reportError("TeacherStudentsDataError", String(error));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const { filteredStudents, classrooms, metrics } = useMemo(() => {
    const uniqueClasses = Array.from(new Set(students.map(s => s.classroom_name))).sort();

    const filtered = students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                            s.email.toLowerCase().includes(search.toLowerCase());
      const matchesClass = classFilter === "all" || s.classroom_name === classFilter;
      return matchesSearch && matchesClass;
    });

    const totalStudents = filtered.length;
    const avgGrade = totalStudents > 0 
        ? filtered.reduce((acc, curr) => acc + curr.grade, 0) / totalStudents 
        : 0;
    
    const atRisk = filtered.filter(s => s.grade < 5 && s.grade > 0).length;

    return { filteredStudents: filtered, classrooms: uniqueClasses, metrics: { totalStudents, avgGrade, atRisk } };
  }, [students, search, classFilter]);

  const getGradeColor = (grade: number) => {
    if (grade === 0) return "bg-slate-100 text-slate-500 border-slate-200";
    if (grade >= 8) return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (grade >= 6) return "bg-blue-100 text-blue-700 border-blue-200";
    if (grade >= 4) return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-[#F8FAFC] p-6 space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-600" />
            Alunos e Desempenho
          </h1>
          <p className="text-slate-500 mt-1 text-lg">
            Visão geral de engajamento e notas médias.
          </p>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm ring-1 ring-slate-200">
            <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                    <GraduationCap size={24} />
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-500">Total de Alunos</p>
                    <h3 className="text-2xl font-bold text-slate-900">{metrics.totalStudents}</h3>
                </div>
            </CardContent>
        </Card>
        <Card className="border-0 shadow-sm ring-1 ring-slate-200">
            <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                    <Brain size={24} />
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-500">Nota Média Geral</p>
                    <h3 className="text-2xl font-bold text-slate-900">{metrics.avgGrade.toFixed(1)}</h3>
                </div>
            </CardContent>
        </Card>
        <Card className="border-0 shadow-sm ring-1 ring-slate-200">
            <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-red-50 rounded-xl text-red-600">
                    <AlertCircle size={24} />
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-500">Atenção Necessária</p>
                    <h3 className="text-2xl font-bold text-slate-900">{metrics.atRisk}</h3>
                </div>
            </CardContent>
        </Card>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-1 gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Buscar por nome ou email..."
                    className="pl-9 bg-slate-50 border-slate-200"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-[200px] bg-slate-50 border-slate-200">
                    <div className="flex items-center gap-2">
                        <Filter size={14} className="text-slate-500" />
                        <SelectValue placeholder="Todas as Turmas" />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todas as Turmas</SelectItem>
                    {classrooms.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-2 text-xs font-bold ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
                <LayoutList size={16} /> <span className="hidden sm:inline">Lista</span>
            </button>
            <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-2 text-xs font-bold ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
                <LayoutGrid size={16} /> <span className="hidden sm:inline">Cards</span>
            </button>
        </div>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 bg-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
          <GraduationCap className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Nenhum aluno encontrado.</p>
        </div>
      ) : viewMode === 'grid' ? (
        // VIEW GRID
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStudents.map((student) => (
              <Card key={student.id} className="hover:shadow-md transition-all duration-300 border-slate-200 group">
                <CardContent className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm border border-indigo-100">
                            {student.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <h3 className="font-bold text-slate-800 text-sm truncate" title={student.name}>{student.name}</h3>
                            <p className="text-xs text-slate-500 truncate">{student.email}</p>
                        </div>
                    </div>
                    
                    {/* AQUI ESTÁ O TOOLTIP DA NOTA */}
                    <Tooltip>
                        <TooltipTrigger>
                            <Badge variant="outline" className={`${getGradeColor(student.grade)} font-bold cursor-help`}>
                                {student.grade > 0 ? `Nota ${student.grade}` : 'S/ Nota'}
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Média das atividades entregues</p>
                        </TooltipContent>
                    </Tooltip>

                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-dashed border-slate-100">
                    <div className="bg-slate-50 p-2 rounded-lg text-center">
                        <span className="block text-slate-400 mb-0.5">Questões</span>
                        <span className="font-bold text-slate-700">{student.questions_done}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg text-center">
                        <span className="block text-slate-400 mb-0.5">XP Acumulado</span>
                        <span className="font-bold text-amber-600">{student.total_xp}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded truncate max-w-[120px]" title={student.classroom_name}>
                        <GraduationCap size={12} /> {student.classroom_name}
                    </span>
                    <span className="flex items-center gap-1" title="Último acesso">
                        <Clock size={12} /> {student.last_active ? new Date(student.last_active).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      ) : (
        // VIEW LISTA
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Aluno</th>
                  <th className="px-6 py-4">Turma</th>
                  <th className="px-6 py-4">Atividade</th>
                  <th className="px-6 py-4">XP</th>
                  <th className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                        Média
                        <Tooltip>
                            <TooltipTrigger><Info size={12} /></TooltipTrigger>
                            <TooltipContent>Média de todas as entregas</TooltipContent>
                        </Tooltip>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                            {student.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <div className="font-medium text-slate-900">{student.name}</div>
                            <div className="text-xs text-slate-400">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="font-normal bg-slate-100 text-slate-600 hover:bg-slate-200">
                        {student.classroom_name}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-700">
                      {student.questions_done} Questões
                    </td>
                    <td className="px-6 py-4 font-mono text-amber-600 font-bold flex items-center gap-1">
                      <Medal size={14} /> {student.total_xp}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold border ${getGradeColor(student.grade)}`}>
                        {student.grade > 0 ? student.grade : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}