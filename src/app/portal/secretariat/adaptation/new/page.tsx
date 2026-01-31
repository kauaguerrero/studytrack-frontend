'use client'

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  Loader2, UploadCloud, FileText, User, GraduationCap, CheckCircle2, 
  ChevronRight, AlertTriangle, ArrowLeft, X, ShieldAlert, Sparkles, FileType
} from 'lucide-react';

// ============================================================================
// --- 1. INDUSTRIAL UI COMPONENTS
// ============================================================================

const StepIndicator = ({ step, current, label, icon: Icon }: any) => {
  const status = step === current ? 'active' : step < current ? 'completed' : 'pending';
  
  const styles = {
    active: "bg-blue-600 border-blue-600 text-white shadow-[0_0_0_4px_rgba(37,99,235,0.2)]",
    completed: "bg-emerald-500 border-emerald-500 text-white",
    pending: "bg-white border-slate-200 text-slate-300"
  };

  return (
    <div className="flex flex-col items-center gap-3 relative z-10 w-32">
      <div className={`
        w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-2 transition-all duration-500 ease-out
        ${styles[status]}
      `}>
        {status === 'completed' ? <CheckCircle2 size={24} /> : <Icon size={20} />}
      </div>
      <div className="text-center">
         <span className={`text-xs font-bold uppercase tracking-wider block transition-colors duration-300 ${status === 'active' ? 'text-blue-700' : status === 'completed' ? 'text-emerald-600' : 'text-slate-400'}`}>
            Passo 0{step}
         </span>
         <span className={`text-sm font-semibold mt-0.5 block ${status === 'pending' ? 'text-slate-400' : 'text-slate-700'}`}>
            {label}
         </span>
      </div>
    </div>
  );
};

const FormLabel = ({ children, required }: { children: React.ReactNode, required?: boolean }) => (
  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 ml-1">
    {children} {required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const InputField = ({ error, className, ...props }: any) => (
  <div className="relative group">
    <input 
      className={`
        w-full h-12 px-4 rounded-lg bg-white border text-sm font-medium transition-all duration-200
        placeholder:text-slate-400 focus:outline-none focus:ring-4 
        ${error 
          ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10 text-red-900' 
          : 'border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-blue-500/10 text-slate-900'}
        ${className}
      `} 
      {...props} 
    />
    {error && <div className="absolute right-3 top-3.5 text-red-500 animate-pulse"><AlertTriangle size={18}/></div>}
  </div>
);

// --- DROPZONE COMPONENT ---
const FileDropzone = ({ file, setFile, accept, label, icon: Icon, required = false }: any) => {
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
        else if (e.type === "dragleave") setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <div 
            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`
                relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer group overflow-hidden
                ${isDragging ? 'border-blue-500 bg-blue-50/50 scale-[1.01]' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}
                ${file ? 'bg-blue-50/30 border-blue-200' : ''}
            `}
        >
            <input ref={inputRef} type="file" className="hidden" accept={accept} onChange={(e) => setFile(e.target.files?.[0])} />
            
            {file ? (
                <div className="flex items-center gap-4 justify-center animate-in zoom-in duration-300">
                    <div className="h-14 w-14 bg-white rounded-lg shadow-sm border border-blue-100 flex items-center justify-center text-blue-600">
                        <FileType size={32} />
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{file.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${isDragging ? 'bg-blue-100 text-blue-600 scale-110' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
                        <Icon size={32} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">{label} {required && <span className="text-red-500">*</span>}</h3>
                        <p className="text-xs text-slate-500 mt-1">Arraste ou clique para selecionar</p>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// --- 2. MAIN WIZARD COMPONENT
// ============================================================================

export default function NewAdaptationWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // --- FORM STATE ---
  const [formData, setFormData] = useState({
    studentName: '',
    grade: '',
    subject: '',
    tags: [] as string[], // Estrutura de tags robusta
    currentTagInput: ''
  });
  
  const [files, setFiles] = useState<{ profile?: File, exam?: File }>({});

  // --- HANDLERS ---
  const handleNext = () => setStep(s => Math.min(s + 1, 3));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && formData.currentTagInput.trim()) {
        e.preventDefault();
        if(!formData.tags.includes(formData.currentTagInput.trim())) {
            setFormData(prev => ({ ...prev, tags: [...prev.tags, prev.currentTagInput.trim()], currentTagInput: '' }));
        }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
  };

  const handleSubmit = async () => {
    if (!files.exam) return;
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Faça login novamente.");

      const payload = new FormData();
      payload.append('file', files.exam);
      if (files.profile) payload.append('profile_file', files.profile);
      
      payload.append('student_name', formData.studentName);
      payload.append('grade', formData.grade);
      payload.append('subject', formData.subject);
      payload.append('manual_conditions', formData.tags.join(', ')); // Converte array para string

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/enterprise/secretariat/adaptation/job`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: payload
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro no processamento da solicitação.");

      router.push(`/portal/secretariat/adaptation/${data.job_id}`);

    } catch (err: any) {
      alert("Erro Crítico: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-12 flex items-center justify-between">
            <div>
                <button onClick={() => router.back()} className="flex items-center text-slate-400 hover:text-slate-800 transition-colors text-sm font-medium mb-2 group">
                    <ArrowLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform"/> Voltar ao Dashboard
                </button>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Nova Adaptação</h1>
                <p className="text-slate-500 font-medium">Configure os parâmetros de engenharia pedagógica.</p>
            </div>
            <div className="hidden md:block">
                <div className="bg-white border border-slate-200 rounded-lg px-4 py-2 flex items-center gap-3 shadow-sm">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"/>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">StudyTrack AI Engine: Online</span>
                </div>
            </div>
        </div>

        {/* PROGRESS WIZARD */}
        <div className="relative mb-12 mx-auto max-w-3xl">
          <div className="absolute top-6 left-16 right-16 h-0.5 bg-slate-200 -z-0" />
          <div 
             className="absolute top-6 left-16 h-0.5 bg-blue-600 -z-0 transition-all duration-700 ease-in-out" 
             style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }} 
          />
          
          <div className="flex justify-between relative z-10 w-full">
            <StepIndicator step={1} current={step} label="Dados do Aluno" icon={GraduationCap} />
            <StepIndicator step={2} current={step} label="Diagnóstico Clínico" icon={ShieldAlert} />
            <StepIndicator step={3} current={step} label="Upload & Processamento" icon={UploadCloud} />
          </div>
        </div>

        {/* MAIN CARD */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 md:p-12 min-h-[500px] flex flex-col relative overflow-hidden">
          
          {/* STEP 1: CONTEXTO */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="flex items-start gap-5 border-b border-slate-100 pb-6">
                 <div className="bg-blue-50 p-3.5 rounded-xl text-blue-600 border border-blue-100 shadow-sm"><User size={32}/></div>
                 <div>
                    <h2 className="text-xl font-bold text-slate-900">Identificação do Beneficiário</h2>
                    <p className="text-sm text-slate-500 mt-1 max-w-md leading-relaxed">Informe os dados acadêmicos para personalizar o cabeçalho e o nível de linguagem da adaptação.</p>
                 </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="col-span-2 space-y-1">
                   <FormLabel required>Nome Completo do Aluno</FormLabel>
                   <InputField 
                     placeholder="Ex: João Victor Silva" 
                     value={formData.studentName} 
                     onChange={(e:any) => setFormData({...formData, studentName: e.target.value})} 
                     autoFocus
                   />
                 </div>
                 <div className="space-y-1">
                   <FormLabel required>Ano / Série Escolar</FormLabel>
                   <InputField 
                      placeholder="Ex: 9º Ano - Ensino Fundamental" 
                      value={formData.grade} 
                      onChange={(e:any) => setFormData({...formData, grade: e.target.value})} 
                   />
                 </div>
                 <div className="space-y-1">
                   <FormLabel required>Componente Curricular</FormLabel>
                   <InputField 
                      placeholder="Ex: Ciências da Natureza" 
                      value={formData.subject} 
                      onChange={(e:any) => setFormData({...formData, subject: e.target.value})} 
                   />
                 </div>
               </div>
               
               <div className="flex-1"></div>
               <div className="flex justify-end pt-4">
                 <button 
                    onClick={handleNext} 
                    disabled={!formData.studentName || !formData.grade}
                    className="h-12 px-8 rounded-lg bg-slate-900 text-white font-medium hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg shadow-slate-900/10 active:scale-[0.98]"
                 >
                    Avançar para Diagnóstico <ChevronRight size={18} className="ml-2"/>
                 </button>
               </div>
            </div>
          )}

          {/* STEP 2: DIAGNÓSTICO */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="flex items-start gap-5 border-b border-slate-100 pb-6">
                 <div className="bg-purple-50 p-3.5 rounded-xl text-purple-600 border border-purple-100 shadow-sm"><ShieldAlert size={32}/></div>
                 <div>
                    <h2 className="text-xl font-bold text-slate-900">Perfil de Acessibilidade</h2>
                    <p className="text-sm text-slate-500 mt-1 max-w-md leading-relaxed">Anexe laudos médicos ou defina manualmente as condições para a IA ajustar o conteúdo.</p>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {/* File Upload Laudo */}
                   <div>
                       <FormLabel>Laudo Médico (PDF/IMG)</FormLabel>
                       <div className="mt-2 h-full">
                           <FileDropzone 
                              file={files.profile} 
                              setFile={(f: File) => setFiles({...files, profile: f})} 
                              accept=".pdf,.jpg,.jpeg,.png"
                              label="Upload do Laudo"
                              icon={FileText}
                           />
                       </div>
                   </div>

                   {/* Tags Input */}
                   <div className="space-y-4">
                       <div>
                           <FormLabel>Condições e Necessidades</FormLabel>
                           <p className="text-[11px] text-slate-500 mb-2">Digite a condição e pressione <kbd className="font-mono bg-slate-100 border border-slate-200 rounded px-1 text-[10px]">ENTER</kbd></p>
                           <InputField 
                              placeholder="Ex: TDAH, Discalculia, Baixa Visão..." 
                              value={formData.currentTagInput}
                              onChange={(e:any) => setFormData({...formData, currentTagInput: e.target.value})}
                              onKeyDown={addTag}
                           />
                       </div>
                       
                       <div className="min-h-[120px] bg-slate-50 rounded-xl border border-slate-200 p-4">
                           {formData.tags.length === 0 ? (
                               <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                   <Sparkles size={24} className="mb-2"/>
                                   <span className="text-xs font-medium">Nenhuma tag adicionada</span>
                               </div>
                           ) : (
                               <div className="flex flex-wrap gap-2">
                                   {formData.tags.map((tag, idx) => (
                                       <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-700 shadow-sm animate-in zoom-in duration-200">
                                           {tag}
                                           <button onClick={() => removeTag(tag)} className="ml-2 text-slate-400 hover:text-red-500"><X size={12}/></button>
                                       </span>
                                   ))}
                               </div>
                           )}
                       </div>
                   </div>
               </div>

               <div className="flex justify-between pt-4">
                 <button onClick={handleBack} className="text-slate-500 font-medium hover:text-slate-900 px-4 py-2">Voltar</button>
                 <button onClick={handleNext} className="h-12 px-8 rounded-lg bg-slate-900 text-white font-medium hover:bg-blue-600 transition-all flex items-center shadow-lg shadow-slate-900/10 active:scale-[0.98]">
                    Confirmar e Prosseguir <ChevronRight size={18} className="ml-2"/>
                 </button>
               </div>
            </div>
          )}

          {/* STEP 3: EXAM UPLOAD */}
          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="flex items-start gap-5 border-b border-slate-100 pb-6">
                 <div className="bg-emerald-50 p-3.5 rounded-xl text-emerald-600 border border-emerald-100 shadow-sm"><UploadCloud size={32}/></div>
                 <div>
                    <h2 className="text-xl font-bold text-slate-900">Conteúdo da Avaliação</h2>
                    <p className="text-sm text-slate-500 mt-1 max-w-md leading-relaxed">Envie o arquivo original da prova. O sistema manterá o layout original sempre que possível.</p>
                 </div>
               </div>

               <div className="bg-amber-50 border border-amber-200/60 rounded-lg p-4 flex gap-4">
                   <AlertTriangle className="text-amber-600 shrink-0" size={24} />
                   <div className="text-sm text-amber-900">
                       <p className="font-bold mb-1">Atenção ao Processamento</p>
                       <p className="opacity-90">Certifique-se que o arquivo da prova contenha texto selecionável. Imagens digitalizadas podem ter menor precisão na adaptação.</p>
                   </div>
               </div>

               <div className="py-2">
                   <FileDropzone 
                      file={files.exam} 
                      setFile={(f: File) => setFiles({...files, exam: f})} 
                      accept=".pdf,.docx,.doc"
                      label="Arquivo da Prova Original"
                      icon={UploadCloud}
                      required
                   />
               </div>

               <div className="flex justify-between pt-4 border-t border-slate-100 mt-4">
                 <button onClick={handleBack} className="text-slate-500 font-medium hover:text-slate-900 px-4 py-2" disabled={loading}>Voltar</button>
                 
                 <button 
                    onClick={handleSubmit} 
                    disabled={loading || !files.exam}
                    className="h-12 px-8 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center shadow-lg shadow-emerald-600/20 active:scale-[0.98] w-full md:w-auto justify-center"
                 >
                    {loading ? (
                        <> <Loader2 className="animate-spin mr-2" size={20} /> Processando IA Neural... </>
                    ) : (
                        <> <Sparkles className="mr-2" size={20} /> Iniciar Engenharia de Adaptação </>
                    )}
                 </button>
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}