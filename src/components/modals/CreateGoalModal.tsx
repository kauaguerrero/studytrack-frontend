'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Calendar, Target, Type, Users, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CreateGoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    teacherId?: string;       // Agora Opcional
    onSuccess?: () => void;   // Agora Opcional
    initialData?: any;
    classroomId?: string;     // Novo: Para modo turma única
    classroomName?: string;   // Novo: Para exibir nome no modo turma única
}

interface ClassroomOption {
    id: string;
    name: string;
    students_count?: number;
}

export function CreateGoalModal({ 
    isOpen, 
    onClose, 
    teacherId, 
    onSuccess, 
    classroomId, 
    classroomName 
}: CreateGoalModalProps) {
    
    // Auth State
    const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(teacherId || null);

    // Form States
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [targetValue, setTargetValue] = useState<number>(1);
    const [metricType, setMetricType] = useState<'manual' | 'questions'>('manual');
    const [deadline, setDeadline] = useState('');
    
    // Class Selection States
    const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
    const [isLoadingClasses, setIsLoadingClasses] = useState(false);

    // UI States
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isSingleClassMode = !!classroomId;

    // 1. Inicialização: Busca usuário se necessário e configura turmas
    useEffect(() => {
        if (isOpen) {
            // Reset form
            setTitle('');
            setDescription('');
            setTargetValue(1);
            setDeadline('');
            setError(null);

            const initialize = async () => {
                let id = teacherId;
                
                // Se não veio teacherId via props, busca do Supabase
                if (!id) {
                    const supabase = createClient();
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        id = user.id;
                        setCurrentTeacherId(user.id);
                    }
                }

                // Configura turmas
                if (classroomId && classroomName) {
                    // Modo Turma Única (vindo do ClassroomActions)
                    setClassrooms([{ id: classroomId, name: classroomName }]);
                    setSelectedClassIds([classroomId]);
                } else if (id) {
                    // Modo Multi-turma (vindo do Dashboard)
                    fetchTeacherClasses(id);
                }
            };

            initialize();
        }
    }, [isOpen, teacherId, classroomId, classroomName]);

    const fetchTeacherClasses = async (id: string) => {
        setIsLoadingClasses(true);
        const supabase = createClient();
        
        try {
            // 1. Busca N:N (teacher_classrooms)
            const { data: pivotData } = await supabase
                .from('teacher_classrooms')
                .select('classroom_id, classrooms(id, name)')
                .eq('teacher_id', id);

            // 2. Busca 1:N (classrooms com teacher_id direto)
            const { data: directData } = await supabase
                .from('classrooms')
                .select('id, name')
                .eq('teacher_id', id);

            const options: ClassroomOption[] = [];
            const seenIds = new Set();

            const addOption = (cid: string, cname: string) => {
                if (!seenIds.has(cid)) {
                    seenIds.add(cid);
                    options.push({ id: cid, name: cname });
                }
            };

            pivotData?.forEach((item: any) => {
                if (item.classrooms) addOption(item.classrooms.id, item.classrooms.name);
            });

            directData?.forEach((item: any) => {
                addOption(item.id, item.name);
            });

            setClassrooms(options);
            
            if (options.length === 1) {
                setSelectedClassIds([options[0].id]);
            }

        } catch (err) {
            console.error("Erro ao buscar turmas:", err);
            setError("Não foi possível carregar suas turmas.");
        } finally {
            setIsLoadingClasses(false);
        }
    };

    const toggleClass = (id: string) => {
        if (isSingleClassMode) return; // Trava seleção no modo único
        setSelectedClassIds(prev => 
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const toggleAllClasses = () => {
        if (isSingleClassMode) return;
        if (selectedClassIds.length === classrooms.length) {
            setSelectedClassIds([]);
        } else {
            setSelectedClassIds(classrooms.map(c => c.id));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!currentTeacherId) {
            setError("Erro de autenticação. Recarregue a página.");
            return;
        }
        if (selectedClassIds.length === 0) {
            setError("Selecione pelo menos uma turma.");
            return;
        }
        if (!deadline) {
            setError("Defina uma data de entrega.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const promises = selectedClassIds.map(classId => 
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/enterprise/goals/create-batch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        teacher_id: currentTeacherId,
                        classroom_id: classId,
                        title,
                        description,
                        deadline: new Date(deadline).toISOString(),
                        target_value: targetValue,
                        metric_type: metricType
                    })
                })
            );

            const results = await Promise.all(promises);
            const errors = results.filter(r => !r.ok);
            
            if (errors.length > 0) {
                throw new Error(`Falha ao criar meta em ${errors.length} turma(s).`);
            }

            if (onSuccess) onSuccess();
            onClose();
            alert("Meta criada com sucesso!");
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Erro ao criar metas.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Target className="text-blue-600" size={20} />
                            Nova Meta {isSingleClassMode && <span className="text-slate-400 font-normal text-base">| {classroomName}</span>}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Defina objetivos para engajar seus alunos.</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {/* SELEÇÃO DE TURMAS (Escondida ou Simplificada no Modo Single) */}
                    {!isSingleClassMode && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                                    <Users size={14} /> Destinatários
                                </label>
                                <button 
                                    type="button" 
                                    onClick={toggleAllClasses}
                                    className="text-xs font-bold text-blue-600 hover:underline"
                                >
                                    {selectedClassIds.length === classrooms.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                                </button>
                            </div>

                            {isLoadingClasses ? (
                                <div className="flex gap-2 animate-pulse">
                                    <div className="h-8 w-24 bg-slate-100 rounded-lg"></div>
                                    <div className="h-8 w-24 bg-slate-100 rounded-lg"></div>
                                </div>
                            ) : classrooms.length === 0 ? (
                                <div className="p-3 bg-amber-50 border border-amber-100 text-amber-700 text-sm rounded-lg flex items-center gap-2">
                                    <AlertCircle size={16} /> Você não possui turmas vinculadas.
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {classrooms.map(cls => {
                                        const isSelected = selectedClassIds.includes(cls.id);
                                        return (
                                            <div 
                                                key={cls.id}
                                                onClick={() => toggleClass(cls.id)}
                                                className={`cursor-pointer text-sm font-medium px-3 py-2 rounded-lg border transition-all flex items-center justify-between group ${
                                                    isSelected 
                                                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' 
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                                }`}
                                            >
                                                <span className="truncate">{cls.name}</span>
                                                {isSelected && <Check size={14} className="text-blue-600 shrink-0" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <p className="text-[10px] text-slate-400 text-right">
                                {selectedClassIds.length} turma(s) selecionada(s)
                            </p>
                            <div className="h-px bg-slate-100 my-2"></div>
                        </div>
                    )}

                    {/* DADOS DA META */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2 mb-1.5">
                                <Type size={14} /> Título da Meta
                            </label>
                            <Input 
                                required
                                placeholder="Ex: Resolver lista de Logaritmos"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="font-medium bg-white text-slate-900 border-slate-200"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
                                Descrição (Opcional)
                            </label>
                            <textarea 
                                className="w-full min-h-[80px] rounded-md border border-slate-200 bg-white text-slate-900 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                                placeholder="Detalhes sobre o que deve ser feito..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2 mb-1.5">
                                    <Target size={14} /> Quantidade Alvo
                                </label>
                                <div className="flex gap-2">
                                    <Input 
                                        type="number"
                                        min="1"
                                        required
                                        value={targetValue}
                                        onChange={e => setTargetValue(Number(e.target.value))}
                                        className="bg-white text-slate-900 border-slate-200"
                                    />
                                    <select 
                                        className="text-sm bg-white border border-slate-200 rounded-md px-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-ring"
                                        value={metricType}
                                        onChange={e => setMetricType(e.target.value as any)}
                                    >
                                        <option value="manual">Itens</option>
                                        <option value="questions">Questões</option>
                                        <option value="hours">Horas</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2 mb-1.5">
                                    <Calendar size={14} /> Prazo Final
                                </label>
                                <Input 
                                    type="date"
                                    required
                                    value={deadline}
                                    onChange={e => setDeadline(e.target.value)}
                                    className="bg-white text-slate-900 border-slate-200"
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs flex items-center gap-2">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                </form>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting || selectedClassIds.length === 0}
                        className="bg-blue-600 hover:bg-blue-700 min-w-[140px]"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <Loader2 size={16} className="animate-spin" />
                                Enviando...
                            </span>
                        ) : (
                            `Criar Meta`
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}