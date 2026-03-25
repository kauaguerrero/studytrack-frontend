'use client'

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { reportError } from '@/lib/reportError';
import { SkeletonLoader } from '@/components/adaptation/SkeletonLoader';
import { 
  Loader2, UploadCloud, FileText, User, GraduationCap, CheckCircle2, 
  ChevronRight, AlertTriangle, ArrowLeft, X, ShieldAlert, Sparkles, FileType
} from 'lucide-react';

// ============================================================================
// --- 1. INDUSTRIAL UI COMPONENTS
// ============================================================================

const GRADE_OPTIONS = [
  '1º Ano - Ensino Fundamental',
  '2º Ano - Ensino Fundamental', 
  '3º Ano - Ensino Fundamental',
  '4º Ano - Ensino Fundamental',
  '5º Ano - Ensino Fundamental',
  '6º Ano - Ensino Fundamental',
  '7º Ano - Ensino Fundamental',
  '8º Ano - Ensino Fundamental',
  '9º Ano - Ensino Fundamental',
  '1º Ano - Ensino Médio',
  '2º Ano - Ensino Médio',
  '3º Ano - Ensino Médio'
];

const SUBJECT_OPTIONS = [
  'Português',
  'Matemática',
  'Ciências',
  'História',
  'Geografia',
  'Inglês',
  'Artes',
  'Educação Física',
  'Ciências da Natureza',
  'Ciências Humanas',
  'Linguagens',
  'Ensino Religioso'
];

const DIFFICULTY_OPTIONS = [
  'Dislexia',
  'Discalculia', 
  'TDAH',
  'Autismo',
  'Baixa visão',
  'Dificuldades de leitura',
  'Outros'
];

/** Retorna opção de ano/série: prioriza grade da turma (DB), depois inferência por nome/ano */
function resolveGradeFromClassroom(
  classroomGrade: string | null,
  classroomName: string | null,
  classroomYear: number | null
): string {
  const exact = (classroomGrade || '').trim();
  if (exact && GRADE_OPTIONS.includes(exact)) return exact;
  const name = (classroomName || '').toLowerCase();
  const year = classroomYear ?? 0;
  if (name.includes('1º') && (name.includes('fundamental') || name.includes('ef'))) return GRADE_OPTIONS[0];
  if (name.includes('2º') && (name.includes('fundamental') || name.includes('ef'))) return GRADE_OPTIONS[1];
  if (name.includes('3º') && (name.includes('fundamental') || name.includes('ef'))) return GRADE_OPTIONS[2];
  if (name.includes('4º') && (name.includes('fundamental') || name.includes('ef'))) return GRADE_OPTIONS[3];
  if (name.includes('5º') && (name.includes('fundamental') || name.includes('ef'))) return GRADE_OPTIONS[4];
  if (name.includes('6º') && (name.includes('fundamental') || name.includes('ef'))) return GRADE_OPTIONS[5];
  if (name.includes('7º') && (name.includes('fundamental') || name.includes('ef'))) return GRADE_OPTIONS[6];
  if (name.includes('8º') && (name.includes('fundamental') || name.includes('ef'))) return GRADE_OPTIONS[7];
  if (name.includes('9º') && (name.includes('fundamental') || name.includes('ef'))) return GRADE_OPTIONS[8];
  if (name.includes('1º') && (name.includes('médio') || name.includes('em'))) return GRADE_OPTIONS[9];
  if (name.includes('2º') && (name.includes('médio') || name.includes('em'))) return GRADE_OPTIONS[10];
  if (name.includes('3º') && (name.includes('médio') || name.includes('em'))) return GRADE_OPTIONS[11];
  if (year >= 1 && year <= 9) return GRADE_OPTIONS[year - 1] ?? '';
  if (year === 10) return GRADE_OPTIONS[9];
  if (year === 11) return GRADE_OPTIONS[10];
  if (year === 12) return GRADE_OPTIONS[11];
  return '';
}

/** Formata specific_needs/visual_preferences para exibição legível (não JSON bruto) */
function formatSpecificNeeds(specificNeeds: Record<string, unknown> | null, visualPreferences?: Record<string, unknown> | null): string[] {
  const lines: string[] = [];
  const label: Record<string, string> = {
    font_size: 'Tamanho da fonte',
    font_family: 'Fonte',
    line_height: 'Entrelinha',
    font_scale: 'Escala da fonte',
    mode: 'Modo visual'
  };
  const add = (obj: Record<string, unknown> | null) => {
    if (!obj || typeof obj !== 'object') return;
    Object.entries(obj).forEach(([key, value]) => {
      if (value == null || key === 'conditions') return;
      const l = label[key] || key.replace(/_/g, ' ');
      const v = typeof value === 'object' ? JSON.stringify(value) : String(value);
      lines.push(`${l}: ${v}`);
    });
  };
  add(visualPreferences ?? null);
  add(specificNeeds);
  return lines;
}

/** Extrai tags de dificuldade a partir do diagnóstico (condition_name + specific_needs) */
function tagsFromDiagnostic(conditionName: string | null, specificNeeds: Record<string, unknown> | null): string[] {
  const tags: string[] = [];
  const condition = (conditionName || '').trim();
  if (condition) {
    const match = DIFFICULTY_OPTIONS.find(
      opt => opt.toLowerCase() === condition.toLowerCase() || condition.toLowerCase().includes(opt.toLowerCase())
    );
    if (match) tags.push(match);
    else tags.push(condition); // condição custom (ex: "TEA Nível 1")
  }
  if (specificNeeds && typeof specificNeeds === 'object') {
    const keys = Object.keys(specificNeeds);
    for (const k of keys) {
      const v = specificNeeds[k];
      if (k === 'conditions' && Array.isArray(v)) {
        (v as string[]).forEach((c: string) => {
          if (c && !tags.includes(c)) tags.push(c);
        });
      }
    }
  }
  return tags;
}

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

const SelectField = ({ options, error, className, ...props }: any) => (
  <div className="relative group">
    <select 
      className={`
        w-full h-12 px-4 rounded-lg bg-white border text-sm font-medium transition-all duration-200 appearance-none
        placeholder:text-slate-400 focus:outline-none focus:ring-4 
        ${error 
          ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10 text-red-900' 
          : 'border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-blue-500/10 text-slate-900'}
        ${className}
      `} 
      {...props}
    >
      <option value="">Selecione uma opção</option>
      {options.map((option: string) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
    <div className="absolute right-3 top-3.5 text-slate-400 pointer-events-none">
      <ChevronRight size={16} className="rotate-90" />
    </div>
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
    hasMedicalReport: null as boolean | null,
    tags: [] as string[],
    currentTagInput: '',
    studentInputMode: 'manual' as 'manual' | 'database', // Novo campo
    selectedStudent: null as any // Novo campo
  });
  
  const [files, setFiles] = useState<{ profile?: File, exam?: File }>({});
  const [studentsWithDiagnostics, setStudentsWithDiagnostics] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // --- HANDLERS ---
  const handleNext = () => setStep(s => Math.min(s + 1, 4));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const fetchStudentsWithDiagnostics = async () => {
    if (studentsWithDiagnostics.length > 0) return; // Já carregados
    
    setIsLoadingStudents(true);
    try {
      // Buscar organization_id do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.organization_id) {
        console.log("No organization_id found for user");
        return;
      }

      // Buscar alunos da organização (turma: name, year, grade para auto-preenchimento de Ano/Série)
      const { data: studentsInOrg, error: studentsError } = await supabase
        .from('profiles')
        .select('id, full_name, email, classroom_id, classrooms(id, name, year, grade)')
        .eq('organization_id', profile.organization_id);

      if (studentsError) {
        console.error("Error fetching students in org:", studentsError);
        void reportError("SecretariatAdaptationError", String(studentsError));
        throw studentsError;
      }

      const studentIds = studentsInOrg?.map((s: { id: string }) => s.id) || [];

      if (studentIds.length === 0) {
        console.log("No students found in organization");
        return;
      }

      // Buscar diagnósticos (inclui visual_preferences e specific_needs)
      const { data: diagnostics, error } = await supabase
        .from('student_diagnostics')
        .select('*')
        .in('student_id', studentIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching diagnostics:", error);
        void reportError("SecretariatAdaptationError", String(error));
        throw error;
      }

      type ClassroomRow = { id?: string; name?: string; year?: number; grade?: string } | null;
      const getClassroom = (p: Record<string, unknown>): ClassroomRow =>
        (p?.classrooms as ClassroomRow) ?? (p?.classroom as ClassroomRow) ?? null;

      const studentsWithDiagnosticsData = (diagnostics ?? []).map((diagnostic: Record<string, unknown>) => {
        const studentProfile = studentsInOrg?.find((s: { id: string }) => s.id === diagnostic.student_id) as Record<string, unknown> | undefined;
        const classroom = studentProfile ? getClassroom(studentProfile) : null;
        return {
          ...diagnostic,
          profiles: studentProfile ? {
            full_name: studentProfile.full_name,
            email: studentProfile.email
          } : null,
          classroom_name: classroom?.name ?? null,
          classroom_year: classroom?.year ?? null,
          classroom_grade: classroom?.grade ?? null
        };
      });

      setStudentsWithDiagnostics(studentsWithDiagnosticsData);
    } catch (err) {
      console.error("Failed to fetch students with diagnostics", err);
      void reportError("SecretariatAdaptationError", String(err));
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const handleStudentSelect = (student: any) => {
    const grade = resolveGradeFromClassroom(
      student.classroom_grade ?? null,
      student.classroom_name ?? null,
      student.classroom_year ?? null
    );
    const tags = tagsFromDiagnostic(student.condition_name, student.specific_needs || null);
    setFormData({
      ...formData,
      selectedStudent: student,
      studentName: student.profiles?.full_name || '',
      grade: grade || formData.grade,
      tags: tags.length > 0 ? tags : formData.tags
    });
  };

  const handleInputModeChange = (mode: 'manual' | 'database') => {
    setFormData({
      ...formData,
      studentInputMode: mode,
      selectedStudent: null,
      studentName: mode === 'manual' ? '' : formData.studentName
    });
    
    if (mode === 'database') {
      fetchStudentsWithDiagnostics();
    }
  };

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
      payload.append('manual_conditions', formData.tags.join(', '));

      // Se aluno foi selecionado do banco, incluir informações do diagnóstico
      if (formData.selectedStudent) {
        payload.append('student_diagnostic_id', formData.selectedStudent.id);
        payload.append('condition_name', formData.selectedStudent.condition_name);
        if (formData.selectedStudent.cid_code) {
          payload.append('cid_code', formData.selectedStudent.cid_code);
        }
        if (formData.selectedStudent.specific_needs) {
          payload.append('specific_needs', JSON.stringify(formData.selectedStudent.specific_needs));
        }
      }

      // URL ATUALIZADA PARA O NOVO BACKEND UNIFICADO
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/enterprise/inclusion/job`, {
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
      {/* Show skeleton loader while processing */}
      {loading && (
        <SkeletonLoader 
          stage="uploading" 
          filename={files.exam?.name || 'prova.pdf'}
          studentName={formData.studentName || 'Aluno'}
        />
      )}

      {/* Show wizard when not loading */}
      {!loading && (
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-16 flex items-center justify-between">
            <div>
                <button onClick={() => router.back()} className="flex items-center text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium mb-3 group">
                    <ArrowLeft size={16} className="mr-1.5 group-hover:-translate-x-1 transition-transform"/> Voltar
                </button>
                <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Adaptar Prova</h1>
                <p className="text-slate-500 text-base mt-2">Vamos preparar uma versão personalizada passo a passo.</p>
            </div>
        </div>

        {/* PROGRESS WIZARD */}
        <div className="relative mb-12 mx-auto max-w-4xl">
          <div className="absolute top-6 left-12 right-12 h-0.5 bg-slate-200 -z-0" />
          <div 
             className="absolute top-6 left-12 h-0.5 bg-blue-600 -z-0 transition-all duration-700 ease-in-out" 
             style={{ width: step === 1 ? '0%' : step === 2 ? '25%' : step === 3 ? '50%' : step === 4 ? '75%' : '100%' }} 
          />
          
          <div className="flex justify-between relative z-10 w-full">
            <StepIndicator step={1} current={step} label="Aluno" icon={GraduationCap} />
            <StepIndicator step={2} current={step} label="Necessidades" icon={ShieldAlert} />
            <StepIndicator step={3} current={step} label="Prova" icon={UploadCloud} />
            <StepIndicator step={4} current={step} label="Gerar" icon={Sparkles} />
          </div>
        </div>

        {/* MAIN CARD */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 md:p-12 min-h-[500px] flex flex-col relative overflow-hidden">
          
          {/* STEP 1: WHO IS THE STUDENT */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
                 <div className="text-blue-600 mt-0.5"><User size={28}/></div>
                 <div>
                    <h2 className="text-2xl font-semibold text-slate-900">Quem é o aluno?</h2>
                    <p className="text-slate-500 text-sm mt-1 leading-relaxed">Informações básicas do aluno.</p>
                 </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* MODO DE IDENTIFICAÇÃO DO ALUNO */}
                 <div className="col-span-2 space-y-4">
                   <FormLabel required>Como identificar o aluno?</FormLabel>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <button
                       onClick={() => handleInputModeChange('manual')}
                       className={`p-4 border-2 rounded-lg text-left transition-all ${
                         formData.studentInputMode === 'manual'
                           ? 'border-blue-500 bg-blue-50 text-blue-900'
                           : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                       }`}
                     >
                       <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                           formData.studentInputMode === 'manual' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                         }`}>
                           <User size={16} />
                         </div>
                         <div>
                           <h3 className="font-semibold">Inserção Manual</h3>
                           <p className="text-xs text-slate-500 mt-0.5">Digitar nome e dados</p>
                         </div>
                       </div>
                     </button>

                     <button
                       onClick={() => handleInputModeChange('database')}
                       className={`p-4 border-2 rounded-lg text-left transition-all ${
                         formData.studentInputMode === 'database'
                           ? 'border-blue-500 bg-blue-50 text-blue-900'
                           : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                       }`}
                     >
                       <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                           formData.studentInputMode === 'database' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                         }`}>
                           <GraduationCap size={16} />
                         </div>
                         <div>
                           <h3 className="font-semibold">Buscar no Sistema</h3>
                           <p className="text-xs text-slate-500 mt-0.5">Alunos com diagnóstico</p>
                         </div>
                       </div>
                     </button>
                   </div>
                 </div>

                 {/* CAMPOS BASEADOS NO MODO SELECIONADO */}
                 {formData.studentInputMode === 'manual' && (
                   <div className="col-span-2 space-y-2">
                     <FormLabel required>Nome completo</FormLabel>
                     <InputField 
                       placeholder="Digite o nome completo do aluno" 
                       value={formData.studentName} 
                       onChange={(e:any) => setFormData({...formData, studentName: e.target.value})} 
                       autoFocus
                     />
                   </div>
                 )}

                 {formData.studentInputMode === 'database' && (
                   <div className="col-span-2 space-y-4">
                     <FormLabel required>Selecionar aluno</FormLabel>
                     
                     {/* BUSCA */}
                     <div className="relative">
                       <input
                         type="text"
                         placeholder="Buscar aluno por nome..."
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         className="w-full h-12 px-4 pr-10 rounded-lg bg-white border border-slate-200 text-sm font-medium transition-all duration-200 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:border-blue-500 focus:ring-blue-500/10"
                       />
                       <div className="absolute right-3 top-3.5 text-slate-400">
                         <User size={16} />
                       </div>
                     </div>

                     {/* LISTA DE ALUNOS */}
                     <div className="border border-slate-200 rounded-lg max-h-60 overflow-y-auto">
                       {isLoadingStudents ? (
                         <div className="p-4 text-center text-slate-500">
                           <Loader2 size={20} className="animate-spin mx-auto mb-2" />
                           Carregando alunos...
                         </div>
                       ) : studentsWithDiagnostics.length === 0 ? (
                         <div className="p-4 text-center text-slate-500">
                           Nenhum aluno com diagnóstico encontrado
                         </div>
                       ) : (
                         <div className="divide-y divide-slate-100">
                           {studentsWithDiagnostics
                             .filter(student => 
                               !searchTerm || 
                               student.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                               student.condition_name?.toLowerCase().includes(searchTerm.toLowerCase())
                             )
                             .map((student) => (
                               <button
                                 key={student.id}
                                 onClick={() => handleStudentSelect(student)}
                                 className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${
                                   formData.selectedStudent?.id === student.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                                 }`}
                               >
                                 <div className="flex items-center justify-between">
                                   <div>
                                     <h4 className="font-semibold text-slate-900">
                                       {student.profiles?.full_name || 'Nome não informado'}
                                     </h4>
                                     <p className="text-sm text-slate-500 mt-1">
                                       {student.condition_name}
                                     </p>
                                     {student.cid_code && (
                                       <p className="text-xs text-slate-400 mt-1">
                                         CID: {student.cid_code}
                                       </p>
                                     )}
                                   </div>
                                   {formData.selectedStudent?.id === student.id && (
                                     <CheckCircle2 size={20} className="text-blue-600" />
                                   )}
                                 </div>
                               </button>
                             ))}
                         </div>
                       )}
                     </div>

                     {/* ALUNO SELECIONADO */}
                     {formData.selectedStudent && (
                       <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                         <h4 className="font-semibold text-blue-900 mb-2">Aluno Selecionado</h4>
                         <div className="space-y-2 text-sm text-slate-700">
                           <p><strong>Nome:</strong> {formData.selectedStudent.profiles?.full_name}</p>
                           <p><strong>Condição:</strong> {formData.selectedStudent.condition_name}</p>
                           {formData.selectedStudent.cid_code && (
                             <p><strong>CID:</strong> {formData.selectedStudent.cid_code}</p>
                           )}
                           {(() => {
                             const needLines = formatSpecificNeeds(
                               formData.selectedStudent.specific_needs ?? null,
                               formData.selectedStudent.visual_preferences ?? null
                             );
                             if (needLines.length === 0) return null;
                             return (
                               <div>
                                 <strong>Necessidades específicas:</strong>
                                 <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600">
                                   {needLines.map((line, i) => (
                                     <li key={i}>{line}</li>
                                   ))}
                                 </ul>
                               </div>
                             );
                           })()}
                         </div>
                         <button
                           onClick={() => setFormData({
                             ...formData,
                             selectedStudent: null,
                             studentName: '',
                             grade: formData.studentInputMode === 'database' ? '' : formData.grade,
                             tags: formData.studentInputMode === 'database' ? [] : formData.tags
                           })}
                           className="mt-3 text-xs text-blue-600 hover:text-blue-800 underline"
                         >
                           Alterar seleção
                         </button>
                       </div>
                     )}
                   </div>
                 )}

                 <div className="space-y-2">
                   <FormLabel required>Ano/Série</FormLabel>
                   <SelectField 
                      options={GRADE_OPTIONS}
                      value={formData.grade} 
                      onChange={(e:any) => setFormData({...formData, grade: e.target.value})} 
                   />
                 </div>
                 <div className="space-y-2">
                   <FormLabel required>Disciplina</FormLabel>
                   <SelectField 
                      options={SUBJECT_OPTIONS}
                      value={formData.subject} 
                      onChange={(e:any) => setFormData({...formData, subject: e.target.value})} 
                   />
                 </div>
               </div>
               
               <div className="flex-1"></div>
               <div className="flex justify-end pt-4">
                 <button 
                    onClick={handleNext} 
                    disabled={
                      !formData.grade || 
                      !formData.subject || 
                      (formData.studentInputMode === 'manual' && !formData.studentName) ||
                      (formData.studentInputMode === 'database' && !formData.selectedStudent)
                    }
                    className="h-12 px-6 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-[0.97]"
                 >
                    Continuar
                 </button>
               </div>
            </div>
          )}

          {/* STEP 2: STUDENT NEEDS - MEDICAL REPORT */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="flex items-start gap-4 border-b border-slate-100 pb-6">
                 <div className="text-purple-600 mt-0.5"><ShieldAlert size={28}/></div>
                 <div>
                    <h2 className="text-2xl font-semibold text-slate-900">Laudo médico?</h2>
                    <p className="text-slate-500 text-sm mt-1 leading-relaxed">Você tem um documento médico do aluno?</p>
                 </div>
               </div>

               <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <button
                     onClick={() => {
                       setFormData({...formData, hasMedicalReport: true});
                       handleNext();
                     }}
                     className="p-6 border-2 border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                   >
                       <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-colors shrink-0">
                         <CheckCircle2 size={20} />
                       </div>
                       <div>
                         <h3 className="font-semibold text-slate-900">Sim, tenho o documento</h3>
                         <p className="text-xs text-slate-500 mt-0.5">Vou fazer upload</p>
                       </div>
                     </div>
                   </button>

                   <button
                     onClick={() => {
                       setFormData({...formData, hasMedicalReport: false});
                       handleNext();
                     }}
                     className="p-6 border-2 border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                   >
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 group-hover:bg-slate-200 transition-colors shrink-0">
                         <User size={20} />
                       </div>
                       <div>
                         <h3 className="font-semibold text-slate-900">Não tenho documento</h3>
                         <p className="text-xs text-slate-500 mt-0.5">Vou informar manualmente</p>
                       </div>
                     </div>
                   </button>
                 </div>
               </div>

               <div className="flex justify-start pt-4">
                 <button onClick={handleBack} className="text-slate-500 font-medium hover:text-slate-900 px-4 py-2 flex items-center">
                   <ArrowLeft size={16} className="mr-2" /> Voltar
                 </button>
               </div>
            </div>
          )}

          {/* STEP 3: STUDENT NEEDS - DIFFICULTIES */}
          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="flex items-start gap-5 border-b border-slate-100 pb-6">
                 <div className="bg-purple-50 p-3.5 rounded-xl text-purple-600 border border-purple-100 shadow-sm"><ShieldAlert size={32}/></div>
                 <div>
                    <h2 className="text-2xl font-bold text-slate-900">Quais dificuldades o aluno tem?</h2>
                    <p className="text-base text-slate-600 mt-2 max-w-md leading-relaxed">Selecione as dificuldades que o aluno apresenta.</p>
                 </div>
               </div>

               {formData.hasMedicalReport && (
                 <div className="space-y-4">
                   <FormLabel>Upload do documento médico</FormLabel>
                   <FileDropzone 
                      file={files.profile} 
                      setFile={(f: File) => setFiles({...files, profile: f})} 
                      accept=".pdf,.jpg,.jpeg,.png"
                      label="Documento do aluno (PDF ou foto)"
                      icon={FileText}
                   />
                 </div>
               )}

               {!formData.hasMedicalReport && (
                 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                   <ShieldAlert className="text-blue-600 shrink-0 mt-0.5" size={20} />
                   <div className="text-sm text-blue-900">
                     <p className="font-medium mb-1">ℹ️ Dica</p>
                     <p>Se não há laudo médico, selecione as dificuldades que você conhece do aluno.</p>
                   </div>
                 </div>
               )}

               <div className="space-y-4">
                 <FormLabel>Selecione as dificuldades</FormLabel>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                   {DIFFICULTY_OPTIONS.map((difficulty) => (
                     <button
                       key={difficulty}
                       onClick={() => {
                         if (formData.tags.includes(difficulty)) {
                           setFormData({...formData, tags: formData.tags.filter(t => t !== difficulty)});
                         } else {
                           setFormData({...formData, tags: [...formData.tags, difficulty]});
                         }
                       }}
                       className={`p-4 rounded-lg border-2 text-left transition-all ${
                         formData.tags.includes(difficulty)
                           ? 'border-blue-500 bg-blue-50 text-blue-700'
                           : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                       }`}
                     >
                       <span className="font-medium">{difficulty}</span>
                     </button>
                   ))}
                 </div>

                 <div className="space-y-2">
                   <FormLabel>Outros (opcional)</FormLabel>
                   <InputField 
                     placeholder="Digite outras dificuldades se necessário" 
                     value={formData.currentTagInput}
                     onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, currentTagInput: e.target.value})}
                     onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                       if (e.key === 'Enter' && formData.currentTagInput.trim()) {
                         e.preventDefault();
                         if(!formData.tags.includes(formData.currentTagInput.trim())) {
                           setFormData(prev => ({ ...prev, tags: [...prev.tags, prev.currentTagInput.trim()], currentTagInput: '' }));
                         }
                       }
                     }}
                   />
                 </div>

                 {formData.tags.length > 0 && (
                   <div className="bg-slate-50 rounded-lg p-4">
                     <p className="text-sm font-medium text-slate-700 mb-2">Dificuldades selecionadas:</p>
                     <div className="flex flex-wrap gap-2">
                       {formData.tags.map((tag, idx) => (
                         <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                           {tag}
                           <button 
                             onClick={() => removeTag(tag)} 
                             className="ml-2 text-blue-600 hover:text-blue-800"
                           >
                             <X size={14}/>
                           </button>
                         </span>
                       ))}
                     </div>
                   </div>
                 )}
               </div>

               <div className="flex justify-between pt-4">
                 <button onClick={handleBack} className="text-slate-500 font-medium hover:text-slate-900 px-4 py-2 flex items-center">
                   <ArrowLeft size={16} className="mr-2" /> Voltar
                 </button>
                 <button 
                   onClick={handleNext} 
                   disabled={formData.tags.length === 0}
                   className="h-14 px-8 rounded-xl bg-blue-600 text-white text-lg font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                 >
                    Continuar para upload da prova <ChevronRight size={20} className="ml-2"/>
                 </button>
               </div>
            </div>
          )}

          {/* STEP 4: UPLOAD THE EXAM */}
          {step === 4 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="flex items-start gap-5 border-b border-slate-100 pb-6">
                 <div className="bg-purple-50 p-3.5 rounded-xl text-purple-600 border border-purple-100 shadow-sm"><FileText size={32}/></div>
                 <div>
                    <h2 className="text-2xl font-bold text-slate-900">Upload da prova</h2>
                    <p className="text-base text-slate-600 mt-2 max-w-md leading-relaxed">Faça upload da prova original que será adaptada.</p>
                 </div>
               </div>

               <div className="space-y-6">
                 <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                   <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                   <div className="text-sm text-amber-900">
                     <p className="font-medium mb-1">⚠️ Importante</p>
                     <p>A prova deve estar em formato PDF ou imagem. Certifique-se de que o arquivo está legível.</p>
                   </div>
                 </div>

                 <div className="space-y-4">
                   <FormLabel>Arquivo da prova</FormLabel>
                   <FileDropzone 
                      file={files.exam} 
                      setFile={(f: File) => setFiles({...files, exam: f})} 
                      accept=".pdf,.jpg,.jpeg,.png"
                      label="Arraste o arquivo da prova aqui ou clique para selecionar"
                      icon={FileText}
                   />
                 </div>
               </div>

               <div className="flex justify-between pt-4">
                 <button onClick={handleBack} className="text-slate-500 font-medium hover:text-slate-900 px-4 py-2 flex items-center">
                   <ArrowLeft size={16} className="mr-2" /> Voltar
                 </button>
                 <button 
                   onClick={handleSubmit} 
                   disabled={!files.exam}
                   className="h-14 px-8 rounded-xl bg-blue-600 text-white text-lg font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                 >
                    Gerar prova adaptada <ChevronRight size={20} className="ml-2"/>
                 </button>
               </div>
            </div>
          )}

        </div>
      </div>
      )}
    </div>
  );
}