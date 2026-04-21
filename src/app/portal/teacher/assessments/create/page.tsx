'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { reportError } from '@/lib/reportError';
import { formatScientificText } from '@/lib/scientific-text';
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  LayoutList, 
  PlusCircle, 
  Plus, 
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
  FileText,
  Sparkles,
  Copy,
  Sliders,
  ImageIcon,
  GraduationCap
} from 'lucide-react';
import Link from 'next/link';

// Componentes Reais
import { QuestionBankExplorer } from '@/components/assessments/QuestionBankExplorer';
import { ManualQuestionForm } from '@/components/assessments/ManualQuestionForm';

// --- TYPES & INTERFACES (Robustez Enterprise) ---
interface Alternative {
  letter: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  external_id?: string;
  title?: string;
  subject?: string;
  discipline?: string;
  difficulty?: string;
  context?: string;
  alternatives_intro?: string; // O enunciado da questão
  statement?: string; // Fallback para enunciado
  alternatives?: string | Alternative[]; // Pode vir como string do banco ou objeto da IA
  correct_answer?: string;
  images?: string | any[];
  is_ai_generated?: boolean;
  ai_reasoning?: any;
  [key: string]: any;
}

interface Classroom {
  id: string;
  name: string;
}

// --- SUB-COMPONENTES DE UI (Industrial Grade - High Contrast & Accessibility) ---

function StepIndicator({ current, total }: { current: number, total: number }) {
    const steps = [
        { label: "Detalhes da Prova", icon: FileText },
        { label: "Curadoria de Questões", icon: LayoutList }, 
        { label: "Revisão e Envio", icon: Send }
    ];

    return (
        <div className="w-full max-w-3xl mx-auto mb-14 px-4">
            <div className="flex items-center justify-between relative">
                {/* Linha de Fundo */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1.5 bg-slate-200 rounded-full -z-10" />
                {/* Linha de Progresso */}
                <div 
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-blue-600 rounded-full -z-10 transition-all duration-700 ease-out shadow-sm" 
                    style={{ width: `${((current - 1) / (total - 1)) * 100}%` }}
                />
                {steps.map((s, i) => {
                    const stepNum = i + 1;
                    const isActive = stepNum <= current;
                    const isCurrent = stepNum === current;
                    const Icon = s.icon;
                    return (
                        <div key={i} className="flex flex-col items-center gap-3 bg-[#F8FAFC] px-4 rounded-xl z-10">
                            <div className={`
                                w-12 h-12 rounded-full flex items-center justify-center border-[3px] transition-all duration-300 shadow-md
                                ${isActive 
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-blue-200 scale-110' 
                                    : 'bg-white border-slate-300 text-slate-300'}
                            `}>
                                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className={`text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${isCurrent ? 'text-blue-800' : 'text-slate-400'}`}>
                                {s.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function ModeButton({ icon: Icon, title, desc, color, onClick }: any) {
    const colors: any = {
        blue: 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-blue-100 ring-blue-100',
        purple: 'bg-white border-slate-200 hover:border-purple-400 hover:shadow-purple-100 ring-purple-100',
        emerald: 'bg-white border-slate-200 hover:border-emerald-400 hover:shadow-emerald-100 ring-emerald-100'
    };
    
    const iconColors: any = {
        blue: 'text-blue-600 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white',
        purple: 'text-purple-600 bg-purple-50 group-hover:bg-purple-600 group-hover:text-white',
        emerald: 'text-emerald-600 bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white'
    };

    const colorClass = colors[color] || colors.blue;
    const iconClass = iconColors[color] || iconColors.blue;

    return (
        <button 
            onClick={onClick} 
            className={`
                group relative p-8 rounded-2xl border-2 transition-all duration-300 text-left flex flex-col gap-5 h-full
                hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] ${colorClass} hover:ring-4
            `}
        >
            <div className={`
                w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm ${iconClass}
            `}>
                <Icon size={32} strokeWidth={1.5} />
            </div>
            <div>
                <h4 className="text-xl font-bold text-slate-800 group-hover:text-black mb-2">{title}</h4>
                <p className="text-sm text-slate-500 font-medium leading-relaxed group-hover:text-slate-700">{desc}</p>
            </div>
            <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                <ArrowRight size={24} className={color === 'blue' ? 'text-blue-500' : color === 'purple' ? 'text-purple-500' : 'text-emerald-500'} />
            </div>
        </button>
    );
}

// --- COMPONENTE DE EDIÇÃO DE CANDIDATO IA (ATUALIZADO - UX OTIMIZADA PARA LEITURA) ---
function CandidateEditor({ question, index, onChange, onRemove }: { question: Question, index: number, onChange: (q: Question) => void, onRemove: () => void }) {
    
    // Parser de Alternativas para State Local
    let initialAlts: Alternative[] = [];
    if (typeof question.alternatives === 'string') {
        try { initialAlts = JSON.parse(question.alternatives); } catch(e){}
    } else if (Array.isArray(question.alternatives)) {
        initialAlts = question.alternatives;
    }

    const handleChange = (field: string, value: any) => {
        onChange({ ...question, [field]: value });
    };

    const handleAltChange = (altIndex: number, text: string) => {
        const newAlts = [...initialAlts];
        newAlts[altIndex].text = text;
        handleChange('alternatives', newAlts);
    };

    const handleCorrectChange = (altIndex: number) => {
        const newAlts = initialAlts.map((a, i) => ({ ...a, isCorrect: i === altIndex }));
        handleChange('alternatives', newAlts);
        handleChange('correct_alternative', initialAlts[altIndex].letter);
    };

    // --- PARSER DE IMAGENS ---
    let imageUrl = null;
    if (question.images && typeof question.images === 'string') {
        const markdownMatch = question.images.match(/!\[.*?\]\((.*?)\)/);
        if (markdownMatch) imageUrl = markdownMatch[1];
        else if (question.images.startsWith('http')) imageUrl = question.images;
    }
    if (!imageUrl && typeof question.context === 'string') {
        const markdownMatch = question.context.match(/!\[.*?\]\((.*?)\)/);
        if (markdownMatch) imageUrl = markdownMatch[1];
    }

    return (
        <div className="bg-white p-8 rounded-xl border-l-4 border-l-purple-500 border-y border-r border-slate-200 shadow-md relative group transition-all hover:shadow-lg">
            
            {/* Header com Controles Principais */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-6 border-b border-slate-100 gap-4">
                <div className="flex gap-3 items-center">
                    <span className="bg-purple-100 text-purple-800 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider border border-purple-200">
                        Opção {index + 1}
                    </span>
                    <div className="flex gap-2 flex-wrap">
                        <input 
                            className="bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-purple-500 rounded-md px-3 py-1.5 text-xs font-bold text-slate-700 w-32 focus:ring-2 focus:ring-purple-100 transition-all outline-none"
                            value={question.subject}
                            onChange={(e) => handleChange('subject', e.target.value)}
                            placeholder="Matéria"
                            aria-label="Matéria"
                        />
                        <input 
                            className="bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-purple-500 rounded-md px-3 py-1.5 text-xs font-bold text-slate-700 w-32 focus:ring-2 focus:ring-purple-100 transition-all outline-none"
                            value={question.discipline}
                            onChange={(e) => handleChange('discipline', e.target.value)}
                            placeholder="Tópico"
                            aria-label="Tópico"
                        />
                    </div>
                </div>
                <button 
                    onClick={onRemove} 
                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all flex items-center gap-2 text-sm font-semibold"
                    title="Excluir esta sugestão"
                >
                    <Trash2 size={18}/> <span className="md:hidden">Remover</span>
                </button>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="text-xs font-extrabold text-slate-600 uppercase mb-2 block tracking-wide">Contexto / Texto de Apoio</label>
                    <textarea 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:bg-white outline-none transition-all"
                        rows={3}
                        value={question.context || ''}
                        onChange={(e) => handleChange('context', e.target.value)}
                        placeholder="Insira o texto base ou contexto da questão..."
                    />
                </div>

                {imageUrl && (
                    <div className="flex flex-col items-center gap-3 bg-slate-50 p-4 rounded-lg border-2 border-dashed border-slate-200">
                         <span className="text-xs uppercase font-bold text-slate-500 flex items-center gap-2"><ImageIcon size={14}/> Imagem Detectada</span>
                         <img src={imageUrl} alt="Imagem da Questão" className="h-48 object-contain rounded bg-white p-2 shadow-sm border border-slate-100"/>
                    </div>
                )}

                <div>
                    <label className="text-xs font-extrabold text-slate-600 uppercase mb-2 block tracking-wide">Enunciado (Pergunta)</label>
                    <textarea 
                        className="w-full p-4 bg-white border border-slate-300 rounded-lg text-base font-medium text-slate-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none shadow-sm transition-all"
                        rows={3}
                        value={question.alternatives_intro || question.statement || ''}
                        onChange={(e) => handleChange('alternatives_intro', e.target.value)}
                        placeholder="Digite o enunciado principal da questão..."
                    />
                </div>

                <div className="space-y-3">
                    <label className="text-xs font-extrabold text-slate-600 uppercase mb-2 block tracking-wide">Alternativas (Marque a correta)</label>
                    {initialAlts.map((alt, i) => (
                        <div key={i} className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${alt.isCorrect ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                            <button 
                                onClick={() => handleCorrectChange(i)}
                                className={`
                                    w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center border-2 font-bold text-sm transition-all focus:ring-offset-2
                                    ${alt.isCorrect 
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                                        : 'bg-white text-slate-400 border-slate-300 hover:border-slate-400 hover:bg-slate-50'}
                                `}
                                title={alt.isCorrect ? "Alternativa Correta" : "Marcar como correta"}
                            >
                                {alt.letter}
                            </button>
                            <input 
                                className={`flex-1 bg-transparent outline-none text-sm font-medium p-2 rounded transition-colors ${alt.isCorrect ? 'text-emerald-900 placeholder-emerald-400' : 'text-slate-700 focus:bg-slate-50'}`}
                                value={alt.text}
                                onChange={(e) => handleAltChange(i, e.target.value)}
                            />
                            {alt.isCorrect && <CheckCircle className="text-emerald-600 hidden md:block" size={20} />}
                        </div>
                    ))}
                </div>

                <div className="bg-purple-50/60 p-4 rounded-lg border border-purple-100 mt-2">
                    <label className="text-xs font-bold text-purple-700 uppercase mb-2 block flex items-center gap-2">
                        <Sparkles size={14}/> Raciocínio da IA (Uso Interno)
                    </label>
                    <textarea 
                        className="w-full p-2 bg-white/50 border border-purple-100 rounded-md text-xs text-purple-900 focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                        rows={2}
                        value={question.ai_reasoning?.thought || ''}
                        onChange={(e) => handleChange('ai_reasoning', { thought: e.target.value })}
                    />
                </div>
            </div>
        </div>
    );
}

// --- RENDERIZADOR DE QUESTÃO (TIPO "FOLHA DE PROVA") ---
function QuestionCard({ question, index, onRemove }: { question: Question, index: number, onRemove: () => void }) {
    let alternativesData: Alternative[] = [];
    try {
        if (typeof question.alternatives === 'string') {
            alternativesData = JSON.parse(question.alternatives);
        } else if (Array.isArray(question.alternatives)) {
            alternativesData = question.alternatives;
        }
    } catch (e) { console.error("Erro ao parsear alternativas", e); void reportError("AssessmentParseAlternativasError", String(e)); }

    let imageUrl = null;
    let imageDescription = "";
    let contextText = question.context; 
    const markdownRegex = /!\[.*?\]\s*\((.*?)\)/;

    if (question.images && typeof question.images === 'string') {
        const markdownMatch = question.images.match(markdownRegex);
        if (markdownMatch) imageUrl = markdownMatch[1]; 
        else if (question.images.startsWith('http')) imageUrl = question.images; 
        else imageDescription = question.images; 
    }

    if (!imageUrl && typeof question.context === 'string') {
        const markdownMatch = question.context.match(markdownRegex);
        if (markdownMatch) {
            imageUrl = markdownMatch[1];
            contextText = question.context.replace(markdownMatch[0], '').trim();
        }
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow duration-300">
            
            {/* Header Técnico */}
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <span className="bg-slate-800 text-white px-3 py-1 rounded text-sm font-bold shadow-sm">
                            #{index + 1}
                        </span>
                        {question.is_ai_generated && (
                            <span className="bg-purple-100 text-purple-700 border border-purple-200 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1">
                                <Sparkles size={12}/> IA
                            </span>
                        )}
                    </div>

                    <div className="h-4 w-px bg-slate-300 hidden md:block"></div>

                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                        {question.discipline && <span className="text-slate-600 bg-white border px-2 py-0.5 rounded shadow-sm">{question.discipline}</span>}
                        {question.difficulty && (
                            <span className={`px-2 py-0.5 rounded border ${
                                question.difficulty === 'Fácil' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                question.difficulty === 'Médio' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                'bg-red-50 text-red-700 border-red-200'
                            }`}>
                                {question.difficulty}
                            </span>
                        )}
                    </div>
                </div>

                <button 
                    onClick={onRemove} 
                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    title="Remover da prova"
                >
                    <Trash2 size={18}/>
                </button>
            </div>

            {/* Corpo da Questão - Estilo "Folha de Papel" */}
            <div className="p-8 space-y-6 bg-white text-slate-800">
                
                {/* Contexto */}
                {contextText && (
                    <div className="pl-5 border-l-4 border-slate-300 py-1">
                         <p className="text-slate-600 text-sm leading-7 italic whitespace-pre-line font-serif">
                             {contextText}
                         </p>
                    </div>
                )}

                {/* Imagem */}
                {imageUrl ? (
                    <div className="flex justify-center my-6 bg-slate-50 py-6 rounded-lg border border-slate-100">
                        <img 
                            src={imageUrl} 
                            alt="Suporte Visual" 
                            className="max-h-[350px] rounded shadow-sm object-contain mix-blend-multiply"
                        />
                    </div>
                ) : imageDescription ? (
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 border-dashed text-slate-500 text-xs">
                        <ImageIcon size={18} />
                        <span className="italic">Descrição da imagem: {imageDescription.replace('[image: ', '').replace(']', '')}</span>
                    </div>
                ) : null}

                {/* Enunciado */}
                <div className="text-slate-900 font-semibold text-lg leading-relaxed">
                    {formatScientificText(question.alternatives_intro || question.statement || "Texto da questão indisponível.")}
                </div>

                {/* Alternativas */}
                {alternativesData.length > 0 && (
                    <div className="space-y-3 mt-6">
                        {alternativesData.map((alt, i) => {
                            const isCorrect = String(alt.isCorrect) === 'true' || alt.isCorrect === true;
                            
                            return (
                                <div key={i} className={`
                                    flex gap-4 p-4 rounded-lg border transition-all items-start group
                                    ${isCorrect 
                                        ? 'bg-emerald-50/50 border-emerald-200' 
                                        : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'}
                                `}>
                                    <div className={`
                                        w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold border mt-0.5
                                        ${isCorrect 
                                            ? 'bg-emerald-600 text-white border-emerald-600' 
                                            : 'bg-slate-100 text-slate-500 border-slate-300 group-hover:border-blue-400 group-hover:text-blue-600'}
                                    `}>
                                        {alt.letter || String.fromCharCode(65 + i)}
                                    </div>
                                    <div className={`text-base leading-relaxed ${isCorrect ? 'text-emerald-900 font-medium' : 'text-slate-700'}`}>
                                        {formatScientificText(alt.text)}
                                        {isCorrect && <span className="ml-3 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider align-middle">Gabarito</span>}
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

// --- MAIN COMPONENT ---

export default function CreateExamWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [examData, setExamData] = useState({ title: '', description: '' });
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]); 
  const [createdExamId, setCreatedExamId] = useState<string | null>(null);
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [distributing, setDistributing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<'MENU' | 'BANK' | 'MANUAL' | 'AI_FLOW' | 'BANK_DECISION'>('MENU');

  // IA Config
  const [aiConfig, setAiConfig] = useState({
    topic: '',
    count: 3, 
    difficulty: 'Médio',
    gradeLevel: 'Ensino Médio',
    sourceQuestion: null as Question | null
  });
  const [aiStage, setAiStage] = useState<'CONFIG' | 'LOADING' | 'REVIEW'>('CONFIG');
  const [aiCandidates, setAiCandidates] = useState<Question[]>([]);
  const [pendingBankQuestion, setPendingBankQuestion] = useState<Question | null>(null);

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
      const qToAdd = { ...question, id: question.id || crypto.randomUUID() };
      if (!selectedQuestions.find(q => q.id === qToAdd.id)) {
          setSelectedQuestions(prev => [...prev, qToAdd]);
      }
      setShowAddModal(false);
      setAddMode('MENU');
      setPendingBankQuestion(null);
      setAiConfig({ topic: '', count: 3, difficulty: 'Médio', gradeLevel: 'Ensino Médio', sourceQuestion: null });
      setAiCandidates([]);
      setAiStage('CONFIG');
  };

  const handleBankSelection = (question: Question) => {
      setPendingBankQuestion(question);
      setAddMode('BANK_DECISION'); 
  };

  const handleGenerateAiQuestions = async () => {
      if (!aiConfig.topic && !aiConfig.sourceQuestion) return alert("Defina um tópico ou use uma questão base.");
      setAiStage('LOADING');
      try {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

          const res = await fetch(`${apiUrl}/api/enterprise/assessment/questions/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
              body: JSON.stringify({
                  topic: aiConfig.topic,
                  difficulty: aiConfig.difficulty,
                  grade_level: aiConfig.gradeLevel, 
                  count: aiConfig.count,
                  source_question: aiConfig.sourceQuestion,
              })
          });

          const data = await res.json();
          if (data.success && data.questions) {
              setAiCandidates(data.questions);
              setAiStage('REVIEW');
          } else {
              throw new Error(data.error || "Falha na geração.");
          }
      } catch (error) {
          console.error(error);
          void reportError("AssessmentCreateError", String(error));
          alert("Erro ao gerar questões. Tente novamente.");
          setAiStage('CONFIG');
      }
  };

  const handleAiCandidateChange = (index: number, updatedQuestion: Question) => {
      const newCandidates = [...aiCandidates];
      newCandidates[index] = updatedQuestion;
      setAiCandidates(newCandidates);
  };

  const handleRemoveCandidate = (index: number) => {
      setAiCandidates(prev => prev.filter((_, i) => i !== index));
  };

  const handleApproveCandidates = () => {
      aiCandidates.forEach(q => handleAddQuestion(q));
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
              body: JSON.stringify({ ...examData, questions: selectedQuestions.map(q => q.id) })
          });
          const data = await res.json();
          if (data.success) {
              setCreatedExamId(data.exam_id);
              setStep(3);
          } else {
              alert("Erro ao salvar: " + (data.error || "Erro desconhecido"));
          }
      } catch (e) { console.error(e); void reportError("AssessmentSubmitError", String(e)); alert("Erro de conexão."); }
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
          document.body.appendChild(a);
          a.click();
          a.remove();
      } catch (e) { console.error(e); void reportError("AssessmentPdfError", String(e)); alert("Erro ao baixar PDF."); }
      finally { setDistributing(false); }
  };

  const handleSendOnline = async () => {
      if (!selectedClass) return alert("Selecione uma turma.");
      if (!createdExamId) return;
      setDistributing(true);
      try {
          await new Promise(resolve => setTimeout(resolve, 1500));
          alert(`Prova enviada com sucesso!`);
          router.push('/portal/teacher/assessments');
      } catch (e) { console.error(e); void reportError("AssessmentOpError", String(e)); alert("Erro."); }
      finally { setDistributing(false); }
  };

  const renderBankDecision = () => (
    <div className="flex flex-col h-full items-center justify-center max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-300">
        <div className="w-full mb-8">
            <h4 className="text-sm font-bold text-slate-500 uppercase mb-4 text-center tracking-wider">Pré-visualização da Questão Selecionada</h4>
            {pendingBankQuestion && (
                <div className="pointer-events-none opacity-100 scale-95 origin-top shadow-xl">
                    <QuestionCard question={pendingBankQuestion} index={0} onRemove={() => {}} />
                </div>
            )}
        </div>
        <div className="bg-slate-50 p-8 rounded-2xl w-full max-w-2xl border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">O que deseja fazer com esta questão?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => pendingBankQuestion && handleAddQuestion(pendingBankQuestion)} className="p-5 rounded-xl border-2 border-slate-300 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-800 transition-all flex flex-col items-center gap-3 group bg-white">
                    <div className="bg-slate-100 p-3 rounded-full group-hover:bg-blue-200 text-slate-600 group-hover:text-blue-700 transition-colors"><CheckCircle size={24} /></div>
                    <span className="font-bold">Usar Como Está</span>
                </button>
                <button onClick={() => {
                    setAiConfig({ ...aiConfig, sourceQuestion: pendingBankQuestion, topic: `Variações de: ${pendingBankQuestion?.subject}` });
                    setAddMode('AI_FLOW');
                }} className="p-5 rounded-xl border-2 border-purple-200 bg-purple-50 hover:border-purple-500 hover:bg-purple-100 hover:text-purple-900 transition-all flex flex-col items-center gap-3 group">
                    <div className="bg-purple-100 p-3 rounded-full group-hover:bg-purple-200 transition-colors text-purple-600"><Sparkles size={24} /></div>
                    <span className="font-bold">Criar Variações (IA)</span>
                </button>
            </div>
        </div>
    </div>
  );

  const renderAiFlow = () => {
    if (aiStage === 'CONFIG') {
        return (
            <div className="max-w-3xl mx-auto mt-6 p-4">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-purple-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-200"><Bot size={32} /></div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Assistente de Criação</h2>
                    <p className="text-lg text-slate-600 mt-2">Diga o que você precisa e a IA criará questões inéditas.</p>
                </div>
                <div className="bg-white p-8 md:p-10 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 space-y-8">
                    {aiConfig.sourceQuestion && (
                        <div className="bg-blue-50 p-5 rounded-xl border border-blue-200 flex items-start gap-4">
                            <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Copy size={20} /></div>
                            <div className="flex-1">
                                <p className="text-xs font-bold text-blue-700 uppercase mb-1">Modo Isomorfismo Ativo</p>
                                <p className="text-base text-blue-900 line-clamp-2 font-medium">Baseado em: "{aiConfig.sourceQuestion.alternatives_intro?.substring(0, 100)}..."</p>
                            </div>
                            <button onClick={() => setAiConfig({...aiConfig, sourceQuestion: null})} className="text-blue-400 hover:text-blue-700 p-1 hover:bg-blue-100 rounded"><X size={20}/></button>
                        </div>
                    )}
                    {!aiConfig.sourceQuestion && (
                        <div>
                            <label className="block text-base font-bold text-slate-800 mb-3">Sobre o que é a questão?</label>
                            <input 
                                value={aiConfig.topic} 
                                onChange={(e) => setAiConfig({...aiConfig, topic: e.target.value})} 
                                placeholder="Ex: Interpretação de texto sobre Machado de Assis, Equações de 2º Grau..." 
                                className="w-full p-4 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all text-lg" 
                            />
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-base font-bold text-slate-800 mb-3">Dificuldade</label>
                            <select value={aiConfig.difficulty} onChange={(e) => setAiConfig({...aiConfig, difficulty: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-4 focus:ring-purple-100 focus:border-purple-500 cursor-pointer">
                                <option>Fácil</option>
                                <option>Médio</option>
                                <option>Difícil</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-base font-bold text-slate-800 mb-3">Nível de Ensino</label>
                            <select value={aiConfig.gradeLevel} onChange={(e) => setAiConfig({...aiConfig, gradeLevel: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-4 focus:ring-purple-100 focus:border-purple-500 cursor-pointer">
                                <option>Fundamental I (1º ao 5º)</option>
                                <option>Fundamental II (6º ao 9º)</option>
                                <option>Ensino Médio</option>
                                <option>Pré-Vestibular / Superior</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-4">
                             <label className="text-base font-bold text-slate-800 flex items-center gap-2"><Sliders size={18} className="text-slate-400"/> Quantidade de Questões</label>
                             <span className="text-xl font-bold text-purple-600 bg-purple-50 px-4 py-1 rounded-lg border border-purple-100">{aiConfig.count}</span>
                        </div>
                        <input type="range" min="1" max="5" step="1" value={aiConfig.count} onChange={(e) => setAiConfig({...aiConfig, count: parseInt(e.target.value)})} className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                        <div className="flex justify-between text-xs text-slate-400 font-bold mt-2 px-1">
                            <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                        </div>
                    </div>
                    <button onClick={handleGenerateAiQuestions} disabled={!aiConfig.topic && !aiConfig.sourceQuestion} className="w-full py-5 bg-purple-600 text-white text-lg font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-purple-200 flex items-center justify-center gap-3 transform active:scale-95">
                        <Sparkles size={24}/> Gerar {aiConfig.count} Questões
                    </button>
                </div>
            </div>
        );
    }

    if (aiStage === 'LOADING') return (
        <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="relative">
                <div className="absolute inset-0 bg-purple-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
                <div className="relative bg-white p-6 rounded-2xl shadow-lg border border-purple-100">
                    <Loader2 size={48} className="text-purple-600 animate-spin" />
                </div>
            </div>
            <div className="text-center">
                <h3 className="text-2xl font-bold text-slate-800">Criando questões...</h3>
                <p className="text-slate-500 mt-2">Nossa IA está elaborando o conteúdo pedagógico.</p>
            </div>
        </div>
    );

    // REVIEW STAGE
    return (
        <div className="max-w-5xl mx-auto p-4 pb-20">
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 sticky top-0 bg-[#F8FAFC]/95 backdrop-blur z-20 py-4 border-b border-slate-200 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Revisar Sugestões</h2>
                    <p className="text-base text-slate-500">Edite o conteúdo antes de adicionar à prova.</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <button onClick={() => setAiStage('CONFIG')} className="px-6 py-3 text-slate-600 hover:bg-slate-200 rounded-xl font-bold text-sm transition-colors flex-1 md:flex-none">Descartar</button>
                    <button onClick={handleApproveCandidates} className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 flex-1 md:flex-none">
                        <CheckCircle size={20}/> Adicionar Todas
                    </button>
                </div>
            </div>
            <div className="space-y-10">
                {aiCandidates.map((q, idx) => (
                    <CandidateEditor 
                        key={idx} 
                        question={q} 
                        index={idx} 
                        onChange={(updated) => handleAiCandidateChange(idx, updated)}
                        onRemove={() => handleRemoveCandidate(idx)} 
                    />
                ))}
            </div>
        </div>
    );
  };

  const renderModalContent = () => {
      switch(addMode) {
          case 'BANK': return <QuestionBankExplorer selectedIds={selectedQuestions.map(q => q.id)} onSelectQuestion={handleBankSelection} />;
          case 'BANK_DECISION': return renderBankDecision();
          case 'MANUAL': return <ManualQuestionForm onSuccess={handleAddQuestion} />;
          case 'AI_FLOW': return renderAiFlow();
          default:
             return (
                <div className="flex flex-col h-full justify-center">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-slate-900">Como deseja adicionar?</h2>
                        <p className="text-lg text-slate-500 mt-2">Escolha uma das ferramentas abaixo.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto w-full px-4">
                        <ModeButton icon={Search} title="Banco de Questões" desc="Explore milhares de questões prontas e verificadas." color="blue" onClick={() => setAddMode('BANK')} />
                        <ModeButton icon={Sparkles} title="Gerador IA Pro" desc="Crie questões inéditas e contextualizadas em segundos." color="purple" onClick={() => { setAiConfig({ topic: '', count: 3, difficulty: 'Médio', gradeLevel: 'Ensino Médio', sourceQuestion: null }); setAiStage('CONFIG'); setAddMode('AI_FLOW'); }} />
                        <ModeButton icon={PenTool} title="Editor Manual" desc="Escreva sua própria questão do zero." color="emerald" onClick={() => setAddMode('MANUAL')} />
                    </div>
                </div>
             );
      }
  };

  // STEP 1: CONFIGURAÇÃO INICIAL (Foco: Clareza e Inputs Grandes)
  if (step === 1) {
      return (
          <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans text-slate-900">
              <StepIndicator current={1} total={3} />
              <div className="max-w-2xl w-full bg-white p-12 rounded-[2rem] shadow-2xl shadow-slate-200/60 border border-slate-100 animate-in fade-in zoom-in-95 duration-500">
                  <div className="mb-10 text-center md:text-left">
                      <h1 className="text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">Nova Avaliação</h1>
                      <p className="text-slate-500 text-lg">Defina os dados básicos para começar.</p>
                  </div>
                  <div className="space-y-8">
                      <div className="group">
                          <label className="block text-base font-bold text-slate-700 mb-3 uppercase tracking-wide">Título da Prova <span className="text-red-500">*</span></label>
                          <input 
                              autoFocus 
                              className="w-full text-xl p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-slate-300" 
                              placeholder="Ex: Prova Bimestral de História..."
                              value={examData.title} 
                              onChange={e => setExamData({...examData, title: e.target.value})} 
                          />
                      </div>
                      <div className="group">
                          <label className="block text-base font-bold text-slate-700 mb-3 uppercase tracking-wide">Instruções ou Descrição</label>
                          <textarea 
                              className="w-full p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none h-40 resize-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all text-lg placeholder:text-slate-300" 
                              placeholder="Instruções para os alunos..."
                              value={examData.description} 
                              onChange={e => setExamData({...examData, description: e.target.value})} 
                          />
                      </div>
                      <div className="flex justify-end pt-8 border-t border-slate-100">
                          <button 
                              disabled={!examData.title} 
                              onClick={() => setStep(2)} 
                              className="w-full md:w-auto px-10 py-4 bg-blue-600 text-white text-lg font-bold rounded-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 hover:-translate-y-1"
                          >
                              Continuar <ArrowRight size={22} />
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // STEP 3: FINALIZAÇÃO (Foco: Sucesso e Ações Claras)
  if (step === 3) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans text-slate-900">
            <StepIndicator current={3} total={3} />
            <div className="max-w-5xl w-full bg-white p-12 rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 animate-in slide-in-from-bottom-4 duration-700">
                <div className="text-center mb-16">
                    <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-100 animate-bounce"><CheckCircle size={48} strokeWidth={3} /></div>
                    <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Prova Criada com Sucesso!</h1>
                    <p className="text-xl text-slate-500">A avaliação <strong className="text-slate-900">"{examData.title}"</strong> já está salva no seu banco.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* Card Impressão */}
                    <div className="border-2 border-slate-100 rounded-3xl p-10 hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-100/50 transition-all flex flex-col items-center text-center bg-slate-50/50 group">
                        <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 group-hover:scale-110 transition-transform"><Printer size={48} className="text-blue-500"/></div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Imprimir PDF</h3>
                        <p className="text-slate-500 mb-8 flex-1">Gerar arquivo formatado padrão ENEM pronto para impressão.</p>
                        <button onClick={handlePrintPDF} disabled={distributing} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex justify-center items-center gap-3 shadow-lg shadow-blue-200 transition-all hover:-translate-y-1">
                            {distributing ? <Loader2 className="animate-spin"/> : <Download size={24}/>} 
                            <span className="text-lg">Baixar PDF</span>
                        </button>
                    </div>

                    {/* Card Online */}
                    <div className="border-2 border-slate-100 rounded-3xl p-10 hover:border-purple-400 hover:shadow-2xl hover:shadow-purple-100/50 transition-all flex flex-col items-center text-center bg-slate-50/50 group">
                        <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 group-hover:scale-110 transition-transform"><Send size={48} className="text-purple-500"/></div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Aplicar Online</h3>
                        <p className="text-slate-500 mb-8 flex-1">Enviar link para os alunos responderem digitalmente.</p>
                        
                        <div className="w-full space-y-4 mt-auto">
                            <select 
                                className="w-full p-4 border-2 border-slate-200 rounded-xl bg-white text-lg font-medium text-slate-700 outline-none focus:border-purple-500 cursor-pointer" 
                                value={selectedClass} 
                                onChange={e => setSelectedClass(e.target.value)}
                            >
                                <option value="">Selecione a Turma...</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <button onClick={handleSendOnline} disabled={distributing || !selectedClass} className="w-full py-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 flex justify-center items-center gap-3 shadow-lg shadow-purple-200 transition-all hover:-translate-y-1 disabled:opacity-50">
                                <Send size={24}/> <span className="text-lg">Enviar Agora</span>
                            </button>
                        </div>
                    </div>
                </div>
                <div className="mt-16 text-center border-t border-slate-100 pt-8">
                    <Link href="/portal/teacher/assessments" className="text-slate-400 font-bold hover:text-slate-700 text-lg flex items-center justify-center gap-2 transition-colors">
                        <ArrowLeft size={20}/> Voltar ao Painel Principal
                    </Link>
                </div>
            </div>
        </div>
      );
  }

  // STEP 2: BUILDER PRINCIPAL (Foco: Organização e Facilidade)
  return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900">
          {/* Header Fixo */}
          <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-6 py-4 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-4 md:gap-6">
                  <button onClick={() => setStep(1)} className="p-3 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 border border-transparent hover:border-slate-200" title="Voltar"><ArrowLeft size={22}/></button>
                  <div className="flex flex-col">
                      <h2 className="font-bold text-xl text-slate-900 leading-tight">{examData.title}</h2>
                      <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-0.5 rounded-full border border-blue-200 uppercase tracking-wide">
                            {selectedQuestions.length} {selectedQuestions.length === 1 ? 'questão' : 'questões'}
                          </span>
                      </div>
                  </div>
              </div>
              <button 
                onClick={handleSaveExam} 
                disabled={loading || selectedQuestions.length === 0} 
                className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-200 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:shadow-none"
              >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20}/>} 
                  <span className="hidden md:inline">Finalizar Prova</span>
              </button>
          </div>

          {/* Área de Conteúdo */}
          <div className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8 pb-40">
              {selectedQuestions.length === 0 ? (
                  <div className="mt-12 bg-white border-4 border-dashed border-slate-200 rounded-[2.5rem] p-12 md:p-20 flex flex-col items-center justify-center text-center hover:border-blue-300 hover:bg-blue-50/10 transition-all group cursor-pointer" onClick={() => { setShowAddModal(true); setAddMode('MENU'); }}>
                      <div className="w-28 h-28 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition-transform group-hover:bg-blue-100 group-hover:text-blue-500 shadow-inner"><LayoutList size={56} /></div>
                      <h3 className="text-3xl font-bold text-slate-800 mb-4">Sua prova está vazia</h3>
                      <p className="text-lg text-slate-500 max-w-md mb-8">Comece adicionando questões do banco ou criando com nossa IA.</p>
                      <button className="px-10 py-4 bg-blue-600 text-white text-lg font-bold rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 flex items-center gap-3 hover:-translate-y-1 transition-all">
                          <PlusCircle size={24} /> Adicionar Primeira Questão
                      </button>
                  </div>
              ) : (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      {selectedQuestions.map((q, idx) => (
                          <QuestionCard key={idx} question={q} index={idx} onRemove={() => setSelectedQuestions(prev => prev.filter((_, i) => i !== idx))} />
                      ))}
                      
                      <button onClick={() => { setShowAddModal(true); setAddMode('MENU'); }} className="w-full py-8 border-4 border-dashed border-slate-300 text-slate-500 text-xl font-bold rounded-3xl hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-all flex items-center justify-center gap-4 group mt-12">
                          <div className="bg-slate-200 text-slate-500 rounded-full p-2 group-hover:bg-blue-200 group-hover:text-blue-700 transition-colors"><Plus size={32} /></div>
                          Adicionar Mais Questões
                      </button>
                  </div>
              )}
          </div>

          {/* Modal Overlay Otimizado */}
          {showAddModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
                  <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowAddModal(false)} />
                  <div className="bg-[#F8FAFC] rounded-[2rem] w-full max-w-[90rem] h-[95vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 relative z-10 border border-white/20 ring-1 ring-white/10">
                      {/* Header Modal */}
                      <div className="px-8 py-5 border-b border-slate-200 flex justify-between items-center bg-white z-20 sticky top-0 shadow-sm">
                          <div className="flex items-center gap-4">
                              {addMode !== 'MENU' && (
                                  <button onClick={() => setAddMode('MENU')} className="hover:bg-slate-100 p-2.5 rounded-xl text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-2 text-sm font-bold border border-transparent hover:border-slate-200">
                                      <ArrowLeft size={20}/> <span className="hidden md:inline">Menu Principal</span>
                                  </button>
                              )}
                              <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>
                              <h3 className="font-extrabold text-xl text-slate-800 flex items-center gap-3">
                                  {addMode === 'MENU' ? 'Adicionar Nova Questão' : addMode === 'BANK' ? 'Explorar Banco de Questões' : 'Editor Avançado'}
                              </h3>
                          </div>
                          <button onClick={() => setShowAddModal(false)} className="bg-slate-100 hover:bg-red-100 p-3 rounded-full text-slate-500 hover:text-red-600 transition-all transform hover:rotate-90">
                              <X size={24}/>
                          </button>
                      </div>
                      
                      {/* Content Modal */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#F8FAFC]">
                          <div className="min-h-full p-6 md:p-10">
                              {renderModalContent()}
                          </div>
                      </div>
                  </div>
              </div>
          )}
      </div>
  );
}
