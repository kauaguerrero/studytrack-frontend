'use client'

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { reportError } from '@/lib/reportError';
import { 
  Plus, 
  FileText, 
  Calendar, 
  MoreVertical, 
  Loader2, 
  Download, 
  Trash2, 
  Pencil, 
  Copy,
  Search,
  Filter,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- TYPES ---
interface Exam {
    id: string;
    title: string;
    description: string;
    created_at: string;
    status: 'draft' | 'published' | 'archived';
    teacher_id: string;
    exam_questions: { count: number }[];
}

// --- COMPONENTES AUXILIARES ---

function SkeletonCard() {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 animate-pulse">
            <div className="flex justify-between">
                <div className="h-5 w-20 bg-slate-200 rounded-md"></div>
                <div className="h-8 w-8 bg-slate-200 rounded-md"></div>
            </div>
            <div className="space-y-2">
                <div className="h-6 w-3/4 bg-slate-200 rounded-md"></div>
                <div className="h-4 w-full bg-slate-100 rounded-md"></div>
            </div>
            <div className="pt-4 border-t border-slate-50 flex justify-between">
                <div className="h-4 w-24 bg-slate-100 rounded-md"></div>
                <div className="h-4 w-24 bg-slate-100 rounded-md"></div>
            </div>
        </div>
    );
}

// --- MENU DROPDOWN ---
function ExamMenu({ exam, onDelete, onDownload }: { exam: Exam, onDelete: (id: string) => void, onDownload: (id: string, title: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 rounded-lg transition-all duration-200 ${isOpen ? 'bg-slate-100 text-slate-900 shadow-inner' : 'text-slate-400 hover:text-slate-700 hover:bg-white hover:shadow-sm'}`}
            >
                <MoreVertical size={18} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="p-1.5 flex flex-col gap-0.5">
                        <button 
                            onClick={() => { onDownload(exam.id, exam.title); setIsOpen(false); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-left font-medium"
                        >
                            <Download size={16} /> Baixar PDF
                        </button>
                        
                        <Link 
                            href={`/portal/teacher/assessments/edit/${exam.id}`}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors text-left font-medium"
                        >
                            <Pencil size={16} /> Editar
                        </Link>

                        <button 
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors text-left font-medium opacity-50 cursor-not-allowed"
                            onClick={() => { alert("Funcionalidade em breve: Duplicar Prova"); setIsOpen(false); }}
                        >
                            <Copy size={16} /> Duplicar
                        </button>
                    </div>
                    
                    <div className="border-t border-slate-100 p-1.5 bg-slate-50/50">
                        <button 
                            onClick={() => { onDelete(exam.id); setIsOpen(false); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left font-semibold"
                        >
                            <Trash2 size={16} /> Excluir
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- PÁGINA PRINCIPAL ---
export default function AssessmentsDashboard() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de Filtro e Busca
  const [searchQuery, setSearchQuery] = useState('');
  
  // Estados de ação global
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('exams')
      .select('*, exam_questions(count)')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setExams(data as Exam[]);
    setLoading(false);
  };

  // Lógica de Filtragem no Cliente
  const filteredExams = exams.filter(exam => 
    exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (exam.description && exam.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // --- AÇÃO: DOWNLOAD PDF ---
  const handleDownloadPDF = async (examId: string, title: string) => {
      setDownloadingId(examId);
      try {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

          const res = await fetch(`${apiUrl}/api/enterprise/assessment/exams/${examId}/pdf`, {
              headers: { 'Authorization': `Bearer ${session?.access_token}` }
          });

          if (!res.ok) throw new Error("Erro ao gerar PDF");

          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `prova_${title.replace(/\s+/g, '_')}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
      } catch (e) {
          console.error(e);
          void reportError("TeacherAssessmentsError", String(e));
          alert("Não foi possível baixar o PDF. Tente novamente.");
      } finally {
          setDownloadingId(null);
      }
  };

  // --- AÇÃO: EXCLUIR ---
  const handleDeleteExam = async (examId: string) => {
      if (!confirm("Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita.")) return;

      setDeletingId(examId);
      try {
          const supabase = createClient();
          
          await supabase.from('exam_questions').delete().eq('exam_id', examId);
          const { error } = await supabase.from('exams').delete().eq('id', examId);
          
          if (error) throw error;

          setExams(prev => prev.filter(e => e.id !== examId));
      } catch (e) {
          console.error(e);
          void reportError("TeacherAssessmentsError", String(e));
          alert("Erro ao excluir a prova.");
      } finally {
          setDeletingId(null);
      }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] font-sans text-slate-900">
      
      {/* Container Principal */}
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Avaliações e Provas</h1>
                <p className="text-slate-500 mt-1 font-medium">Gerencie seu banco de avaliações, aplique provas e analise resultados.</p>
            </div>
            <div>
                <Link 
                    href="/portal/teacher/assessments/create" 
                    className="group px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
                >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300"/>
                    Criar Nova Prova
                </Link>
            </div>
        </div>

        {/* Toolbar de Filtros */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                <input 
                    type="text" 
                    placeholder="Buscar por título ou descrição..." 
                    className="w-full pl-11 pr-4 py-3 bg-transparent outline-none text-slate-700 placeholder:text-slate-400 font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="w-px bg-slate-100 hidden md:block"></div>
            <div className="flex items-center gap-2 px-2">
                <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors">
                    <Filter size={16} /> Mais Filtros
                </button>
            </div>
        </div>

        {/* Grid de Conteúdo */}
        {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
            </div>
        ) : filteredExams.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-16 flex flex-col items-center justify-center text-center">
                {searchQuery ? (
                    <>
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-400">
                            <Search size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Nenhum resultado encontrado</h3>
                        <p className="text-slate-500">Não encontramos provas com o termo "{searchQuery}".</p>
                        <button onClick={() => setSearchQuery('')} className="mt-4 text-blue-600 font-bold hover:underline">Limpar busca</button>
                    </>
                ) : (
                    <>
                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 text-blue-500 shadow-lg shadow-blue-50">
                            <FileText size={40} />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Você ainda não tem avaliações</h3>
                        <p className="text-slate-500 max-w-md mx-auto mb-8 text-lg leading-relaxed">
                            Crie sua primeira prova agora utilizando nosso Banco de Questões Inteligente ou o Gerador via IA.
                        </p>
                        <Link 
                            href="/portal/teacher/assessments/create" 
                            className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                        >
                            Começar Agora
                        </Link>
                    </>
                )}
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredExams.map((exam) => (
                    <div key={exam.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-blue-200 transition-all p-6 flex flex-col group relative">
                        
                        {/* Loading Overlay (Exclusão/Download) */}
                        {(deletingId === exam.id || downloadingId === exam.id) && (
                            <div className="absolute inset-0 bg-white/90 backdrop-blur-[2px] z-30 flex items-center justify-center rounded-2xl animate-in fade-in duration-200">
                                <div className="flex flex-col items-center gap-3 text-slate-600 font-bold text-sm">
                                    <Loader2 size={32} className="animate-spin text-blue-600"/>
                                    {deletingId === exam.id ? 'Excluindo...' : 'Gerando PDF...'}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-start mb-5">
                            <span className={`text-[11px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 ${
                                exam.status === 'published' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${exam.status === 'published' ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                                {exam.status === 'published' ? 'Publicada' : 'Rascunho'}
                            </span>
                            
                            {/* MENU DROPDOWN */}
                            <ExamMenu 
                                exam={exam} 
                                onDelete={handleDeleteExam} 
                                onDownload={handleDownloadPDF} 
                            />
                        </div>
                        
                        <div className="mb-6 flex-1">
                            <Link href={`/portal/teacher/assessments/edit/${exam.id}`} className="group-hover:text-blue-600 transition-colors">
                                <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2 leading-tight">
                                    {exam.title}
                                </h3>
                            </Link>
                            <p className="text-sm text-slate-500 line-clamp-2 h-10 leading-relaxed font-medium">
                                {exam.description || "Sem descrição definida."}
                            </p>
                        </div>

                        <div className="mt-auto flex items-center justify-between pt-5 border-t border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wide">
                            <div className="flex items-center gap-2" title="Quantidade de Questões">
                                <FileText size={16} className="text-blue-500"/>
                                {exam.exam_questions?.[0]?.count || 0} Questões
                            </div>
                            <div className="flex items-center gap-2" title="Data de Criação">
                                <Calendar size={16} className="text-slate-400"/>
                                {format(new Date(exam.created_at), "d MMM", { locale: ptBR })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}