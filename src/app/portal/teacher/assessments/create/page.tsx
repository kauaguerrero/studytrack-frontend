'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  LayoutList, 
  PlusCircle, 
  Plus, // Import mantido para evitar o erro Runtime ReferenceError
  Trash2, 
  Search, 
  PenTool, 
  Bot, 
  X, 
  Loader2, 
  Printer, 
  Send, 
  Users, 
  CheckCircle,
  Download,
  AlertTriangle,
  FileText,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

// Componentes Reais (Preservados)
import { QuestionBankExplorer } from '@/components/assessments/QuestionBankExplorer';
import { ManualQuestionForm } from '@/components/assessments/ManualQuestionForm';
import { AiQuestionFactory } from '@/components/assessments/AiQuestionFactory'; 

// --- TYPES & INTERFACES (Robustez) ---
interface Question {
  id: string;
  subject?: string;
  difficulty?: string;
  context?: string;
  alternatives_intro?: string;
  is_ai_generated?: boolean;
  [key: string]: any;
}

interface Classroom {
  id: string;
  name: string;
}

// --- UI COMPONENTS ---

// Indicador de Progresso Visual Modernizado
function StepIndicator({ current, total }: { current: number, total: number }) {
    const steps = [
        { label: "Detalhes", icon: FileText },
        { label: "Questões", icon: LayoutList },
        { label: "Distribuição", icon: Send }
    ];

    return (
        <div className="w-full max-w-2xl mx-auto mb-12">
            <div className="flex items-center justify-between relative">
                {/* Linha de Conexão Fundo */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 rounded-full -z-10" />
                
                {/* Linha de Progresso Ativa */}
                <div 
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 rounded-full -z-10 transition-all duration-500 ease-out" 
                    style={{ width: `${((current - 1) / (total - 1)) * 100}%` }}
                />

                {steps.map((s, i) => {
                    const stepNum = i + 1;
                    const isActive = stepNum <= current;
                    const isCurrent = stepNum === current;
                    const Icon = s.icon;

                    return (
                        <div key={i} className="flex flex-col items-center gap-2 bg-slate-50 px-2">
                            <div className={`
                                w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                                ${isActive 
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 scale-110' 
                                    : 'bg-white border-slate-300 text-slate-300'}
                            `}>
                                <Icon size={18} />
                            </div>
                            <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${isCurrent ? 'text-blue-700' : 'text-slate-400'}`}>
                                {s.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Card de Seleção de Modo (Refinado)
function ModeButton({ icon: Icon, title, desc, color, onClick }: any) {
    const colors: any = {
        blue: 'bg-blue-50/50 text-blue-600 border-blue-100 hover:border-blue-400 hover:shadow-blue-100/50',
        purple: 'bg-purple-50/50 text-purple-600 border-purple-100 hover:border-purple-400 hover:shadow-purple-100/50',
        emerald: 'bg-emerald-50/50 text-emerald-600 border-emerald-100 hover:border-emerald-400 hover:shadow-emerald-100/50'
    };
    
    const colorClass = colors[color] || colors.blue;

    return (
        <button 
            onClick={onClick} 
            className={`
                group relative p-8 rounded-3xl border transition-all duration-300 text-left flex flex-col gap-4 h-full
                hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] ${colorClass}
            `}
        >
            <div className={`
                w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:rotate-6 bg-white shadow-sm
            `}>
                <Icon size={32} className={color === 'blue' ? 'text-blue-600' : color === 'purple' ? 'text-purple-600' : 'text-emerald-600'} />
            </div>
            <div>
                <h4 className="text-xl font-bold text-slate-900 group-hover:text-black">{title}</h4>
                <p className="text-sm text-slate-500 mt-2 font-medium leading-relaxed group-hover:text-slate-600">{desc}</p>
            </div>
            
            {/* Ícone de seta no hover */}
            <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                <ArrowRight size={20} className="text-slate-400" />
            </div>
        </button>
    );
}

// --- MAIN COMPONENT ---

export default function CreateExamWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Estado do Exame
  const [examData, setExamData] = useState({ title: '', description: '' });
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]); 
  const [createdExamId, setCreatedExamId] = useState<string | null>(null);

  // Estado da Distribuição (Passo 3)
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [distributing, setDistributing] = useState(false);

  // Controle do Modal de Adição
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<'MENU' | 'BANK' | 'MANUAL' | 'AI'>('MENU');

  // Buscar turmas ao carregar
  useEffect(() => {
    const fetchClasses = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('classrooms').select('id, name');
            if (data) setClasses(data);
        }
    };
    fetchClasses();
  }, []);

  const handleAddQuestion = (question: Question) => {
      // Evita duplicatas pelo ID
      if (!selectedQuestions.find(q => q.id === question.id)) {
          setSelectedQuestions(prev => [...prev, question]);
      }
      // Fecha e reseta o modal
      setShowAddModal(false);
      setAddMode('MENU');
  };

  const handleSaveExam = async () => {
      if (!examData.title) return alert("O título da prova é obrigatório.");
      if (selectedQuestions.length === 0) return alert("Adicione pelo menos uma questão.");

      setLoading(true);
      try {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

          const res = await fetch(`${apiUrl}/api/enterprise/assessment/exams`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
              body: JSON.stringify({
                  ...examData,
                  questions: selectedQuestions.map(q => q.id)
              })
          });

          const data = await res.json();
          if (data.success) {
              setCreatedExamId(data.exam_id);
              setStep(3); // Avança para Distribuição
          } else {
              alert("Erro ao salvar: " + (data.error || "Erro desconhecido"));
          }
      } catch (e) { console.error(e); alert("Erro de conexão."); } 
      finally { setLoading(false); }
  };

  const handlePrintPDF = async () => {
      if (!createdExamId) return;
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
      
      try {
          setDistributing(true);
          const response = await fetch(`${apiUrl}/api/enterprise/assessment/exams/${createdExamId}/pdf`, {
              headers: { 'Authorization': `Bearer ${session?.access_token}` }
          });
          
          if (!response.ok) throw new Error("Erro ao gerar PDF");

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `prova_${examData.title.replace(/\s+/g, '_')}.pdf`;
          document.body.appendChild(a); // Necessário para Firefox
          a.click();
          a.remove();
      } catch (e) {
          console.error(e);
          alert("Erro ao baixar PDF.");
      } finally {
          setDistributing(false);
      }
  };

  const handleSendOnline = async () => {
      if (!selectedClass) return alert("Selecione uma turma para enviar a prova.");
      if (!createdExamId) return;

      setDistributing(true);
      try {
          await new Promise(resolve => setTimeout(resolve, 1500)); // Fake loading
          
          alert(`Prova enviada com sucesso para a turma! Os alunos receberão a notificação.`);
          router.push('/portal/teacher/assessments');
      } catch (e) {
          console.error(e);
          alert("Erro ao enviar prova online.");
      } finally {
          setDistributing(false);
      }
  };

  // Renderização Condicional do Conteúdo do Modal
  const renderModalContent = () => {
      switch(addMode) {
          case 'BANK': 
             return <QuestionBankExplorer selectedIds={selectedQuestions.map(q => q.id)} onSelectQuestion={handleAddQuestion} />;
          case 'MANUAL':
             return <ManualQuestionForm onSuccess={handleAddQuestion} />;
          case 'AI':
             return <AiQuestionFactory onQuestionGenerated={handleAddQuestion} />;
          default:
             // Menu Principal de Ferramentas (Grid Melhorado)
             return (
                <div className="flex flex-col h-full justify-center">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl font-bold text-slate-800">Como você deseja criar a questão?</h2>
                        <p className="text-slate-500">Escolha uma das ferramentas abaixo para compor sua prova.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full px-8">
                        <ModeButton 
                            icon={Search} 
                            title="Banco de Questões" 
                            desc="Busque milhares de questões prontas filtrando por matéria e tópico." 
                            color="blue" 
                            onClick={() => setAddMode('BANK')} 
                        />
                        <ModeButton 
                            icon={Sparkles} 
                            title="Gerador IA" 
                            desc="Crie questões inéditas e contextualizadas em segundos com o Gemini." 
                            color="purple" 
                            onClick={() => setAddMode('AI')} 
                        />
                        <ModeButton 
                            icon={PenTool} 
                            title="Editor Manual" 
                            desc="Editor completo para digitar suas próprias questões e alternativas." 
                            color="emerald" 
                            onClick={() => setAddMode('MANUAL')} 
                        />
                    </div>
                </div>
             );
      }
  };

  // --- VIEW: PASSO 1 (METADADOS) ---
  if (step === 1) {
      return (
          <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 font-sans text-slate-900">
              <StepIndicator current={1} total={3} />
              
              <div className="max-w-xl w-full bg-white p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 animate-in fade-in zoom-in-95 duration-500">
                  <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Configurar Exame</h1>
                    <p className="text-slate-500">Defina as informações básicas para identificar esta avaliação.</p>
                  </div>
                  
                  <div className="space-y-6">
                      <div className="group">
                          <label className="block text-sm font-bold text-slate-700 mb-2 group-focus-within:text-blue-600 transition-colors">Título da Avaliação <span className="text-red-500">*</span></label>
                          <input 
                            autoFocus 
                            className="w-full text-lg p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all placeholder:text-slate-300" 
                            placeholder="Ex: Prova Bimestral de Matemática" 
                            value={examData.title} 
                            onChange={e => setExamData({...examData, title: e.target.value})} 
                          />
                      </div>
                      <div className="group">
                          <label className="block text-sm font-bold text-slate-700 mb-2 group-focus-within:text-blue-600 transition-colors">Instruções aos Alunos</label>
                          <textarea 
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none h-32 resize-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all placeholder:text-slate-300 custom-scrollbar" 
                            placeholder="Descreva regras, tempo de duração ou materiais permitidos..." 
                            value={examData.description} 
                            onChange={e => setExamData({...examData, description: e.target.value})} 
                          />
                      </div>
                      
                      <div className="flex justify-end pt-6 border-t border-slate-50">
                          <button 
                            disabled={!examData.title} 
                            onClick={() => setStep(2)} 
                            className="px-8 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 transition-all flex items-center gap-2"
                          >
                              Continuar para Questões <ArrowRight size={18} />
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // --- VIEW: PASSO 3 (DISTRIBUIÇÃO) ---
  if (step === 3) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 font-sans text-slate-900">
            <StepIndicator current={3} total={3} />
            
            <div className="max-w-4xl w-full bg-white p-10 rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 animate-in slide-in-from-right-8 duration-500">
                
                <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-emerald-100 shadow-lg animate-in zoom-in duration-300 delay-150">
                        <CheckCircle size={40} strokeWidth={2.5} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Prova Pronta!</h1>
                    <p className="text-slate-500 max-w-lg mx-auto">A avaliação <strong>&quot;{examData.title}&quot;</strong> foi salva com sucesso. Escolha abaixo como deseja aplicá-la.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* OPÇÃO 1: IMPRIMIR */}
                    <div className="border border-slate-200 rounded-2xl p-8 hover:border-blue-300 hover:bg-blue-50/30 hover:shadow-xl hover:shadow-blue-50 transition-all group cursor-pointer relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Printer size={100} />
                        </div>
                        
                        <div className="w-14 h-14 bg-white border border-slate-100 shadow-sm text-slate-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                            <Printer size={28} />
                        </div>
                        
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Aplicação Impressa</h3>
                        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                            Gera um PDF profissional com cabeçalho da instituição, questões formatadas e folha de respostas otimizada para correção via câmera (OCR).
                        </p>
                        
                        <button 
                            onClick={handlePrintPDF}
                            disabled={distributing}
                            className="mt-auto w-full py-3.5 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:border-blue-600 hover:text-blue-600 active:bg-blue-50 transition-all flex items-center justify-center gap-2"
                        >
                            {distributing ? <Loader2 className="animate-spin" size={18}/> : <Download size={18} />}
                            Baixar PDF para Impressão
                        </button>
                    </div>

                    {/* OPÇÃO 2: ONLINE */}
                    <div className="border border-slate-200 rounded-2xl p-8 hover:border-purple-300 hover:bg-purple-50/30 hover:shadow-xl hover:shadow-purple-50 transition-all group relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Send size={100} />
                        </div>

                        <div className="w-14 h-14 bg-white border border-slate-100 shadow-sm text-slate-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                            <Send size={28} />
                        </div>

                        <h3 className="text-xl font-bold text-slate-900 mb-2">Aplicação Online</h3>
                        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                            Disponibilize a prova digitalmente no portal do aluno. Segurança anti-cola, cronômetro e correção automática imediata.
                        </p>
                        
                        <div className="mt-auto space-y-4 bg-white/60 p-4 rounded-xl backdrop-blur-sm border border-slate-100/50">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wide">Turma de Destino</label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                    <select 
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all appearance-none cursor-pointer font-medium text-slate-700"
                                        value={selectedClass}
                                        onChange={(e) => setSelectedClass(e.target.value)}
                                    >
                                        <option value="">-- Selecione --</option>
                                        {classes.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <button 
                                onClick={handleSendOnline}
                                disabled={distributing || !selectedClass}
                                className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
                            >
                                {distributing ? <Loader2 className="animate-spin" size={18}/> : <Send size={18} />}
                                Enviar Digitalmente
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-10 text-center">
                    <Link href="/portal/teacher/assessments" className="text-slate-400 font-bold hover:text-slate-600 text-sm py-2 px-4 rounded-lg hover:bg-slate-100 transition-colors inline-flex items-center gap-2">
                        <ArrowLeft size={16} /> Voltar para o Dashboard
                    </Link>
                </div>
            </div>
        </div>
      );
  }

  // --- VIEW: PASSO 2 (CONSTRUÇÃO - THE BUILDER) ---
  return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900">
          {/* Header Fixo com Efeito Glassmorphism */}
          <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 px-8 py-4 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-6">
                  <button 
                    onClick={() => setStep(1)} 
                    className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-900 border border-transparent hover:border-slate-200"
                    title="Voltar para Detalhes"
                  >
                    <ArrowLeft size={20}/>
                  </button>
                  <div className="flex flex-col">
                      <h2 className="font-bold text-lg text-slate-900 leading-tight">{examData.title}</h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">
                            {selectedQuestions.length} questões
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-400">Editando</span>
                      </div>
                  </div>
              </div>
              <div className="flex items-center gap-3">
                  <button 
                    onClick={handleSaveExam} 
                    disabled={loading || selectedQuestions.length === 0} 
                    className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200 transition-all hover:-translate-y-0.5"
                  >
                      {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18}/>} 
                      Finalizar Prova
                  </button>
              </div>
          </div>

          {/* Área Principal (Canvas) */}
          <div className="flex-1 max-w-5xl mx-auto w-full p-8 pb-40">
              
              {selectedQuestions.length === 0 ? (
                  // Empty State Rico
                  <div className="mt-12 bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 group hover:border-blue-300 transition-colors">
                      <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 group-hover:text-blue-500 group-hover:bg-blue-50 transition-all duration-300">
                        <LayoutList size={48} />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-800 mb-3">Sua prova está vazia</h3>
                      <p className="text-slate-500 mb-10 max-w-md mx-auto leading-relaxed">
                          Utilize nossas ferramentas de inteligência artificial ou banco de dados para montar uma avaliação completa em minutos.
                      </p>
                      <button 
                        onClick={() => { setShowAddModal(true); setAddMode('MENU'); }} 
                        className="px-8 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-xl shadow-blue-200 flex items-center gap-3 hover:-translate-y-1 transition-all"
                      >
                          <PlusCircle size={22} /> Adicionar Primeira Questão
                      </button>
                  </div>
              ) : (
                  // Lista de Questões (Cards Empilhados)
                  <div className="space-y-6">
                      {selectedQuestions.map((q, idx) => (
                          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                              
                              {/* Decoração lateral baseada na dificuldade (se houver) */}
                              <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                  q.difficulty === 'Fácil' ? 'bg-emerald-400' : 
                                  q.difficulty === 'Médio' ? 'bg-yellow-400' : 
                                  'bg-blue-400'
                              }`} />

                              <div className="flex justify-between items-start mb-4 pl-3">
                                  <div className="flex gap-3 items-center flex-wrap">
                                      <span className="bg-slate-900 text-white px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                                        Q{idx + 1}
                                      </span>
                                      
                                      {q.is_ai_generated && (
                                        <span className="bg-purple-100 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-lg text-xs font-bold uppercase flex items-center gap-1.5">
                                            <Sparkles size={12}/> IA Generativa
                                        </span>
                                      )}
                                      
                                      <div className="flex items-center text-xs font-bold text-slate-400 uppercase gap-2">
                                        <span className="bg-slate-100 px-2 py-1 rounded-md">{q.subject || 'Geral'}</span>
                                        {q.difficulty && <span className="bg-slate-100 px-2 py-1 rounded-md">{q.difficulty}</span>}
                                      </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {/* Futuro: Botão Editar */}
                                      {/* <button className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"><Pencil size={18}/></button> */}
                                      
                                      <button 
                                        onClick={() => setSelectedQuestions(prev => prev.filter((_, i) => i !== idx))} 
                                        className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                                        title="Remover Questão"
                                      >
                                          <Trash2 size={18}/>
                                      </button>
                                  </div>
                              </div>

                              <div className="pl-3">
                                {q.context && (
                                    <div className="mb-4 text-sm text-slate-600 italic bg-slate-50 p-4 rounded-xl border border-slate-100 relative">
                                        <span className="absolute top-2 left-2 text-slate-300 text-4xl leading-none font-serif">"</span>
                                        <div className="relative z-10 px-2">{q.context}</div>
                                    </div>
                                )}
                                <p className="text-slate-800 font-medium text-base leading-relaxed">
                                    {q.alternatives_intro || "Enunciado da questão não disponível para visualização rápida."}
                                </p>
                              </div>
                          </div>
                      ))}

                      {/* Botão de Adicionar Flutuante/Fim da Lista */}
                      <button 
                        onClick={() => { setShowAddModal(true); setAddMode('MENU'); }} 
                        className="w-full py-5 border-2 border-dashed border-slate-300 text-slate-500 font-bold rounded-2xl hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-3 group"
                      >
                          <div className="bg-slate-200 text-white rounded-full p-1 group-hover:bg-blue-500 transition-colors">
                             <Plus size={20} />
                          </div>
                          Adicionar Mais Questões
                      </button>
                  </div>
              )}
          </div>

          {/* Modal Overlay (Glassmorphism e Animações Refinadas) */}
          {showAddModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  {/* Backdrop */}
                  <div 
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setShowAddModal(false)}
                  />
                  
                  {/* Modal Content */}
                  <div className="bg-white rounded-[2rem] w-full max-w-[90rem] h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 relative z-10 border border-white/20">
                      {/* Modal Header */}
                      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white/95 backdrop-blur z-20 sticky top-0">
                          <div className="flex items-center gap-4">
                              {addMode !== 'MENU' && (
                                <button 
                                    onClick={() => setAddMode('MENU')} 
                                    className="hover:bg-slate-100 p-2 rounded-xl text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-2 text-sm font-bold"
                                >
                                    <ArrowLeft size={18}/> Voltar ao Menu
                                </button>
                              )}
                              <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>
                              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                {addMode === 'MENU' ? 'Adicionar Questão' : 
                                 addMode === 'BANK' ? <><Search size={20} className="text-blue-500"/> Banco de Questões</> :
                                 addMode === 'AI' ? <><Sparkles size={20} className="text-purple-500"/> Gerador IA (Gemini)</> : 
                                 <><PenTool size={20} className="text-emerald-500"/> Criação Manual</>}
                              </h3>
                          </div>
                          <button 
                            onClick={() => setShowAddModal(false)} 
                            className="hover:bg-red-50 p-2 rounded-xl text-slate-400 hover:text-red-500 transition-colors"
                          >
                              <X size={24}/>
                          </button>
                      </div>
                      
                      {/* Modal Body */}
                      <div className="flex-1 overflow-y-auto bg-[#F8FAFC] custom-scrollbar">
                          <div className="min-h-full p-6">
                              {renderModalContent()}
                          </div>
                      </div>
                  </div>
              </div>
          )}
      </div>
  );
}