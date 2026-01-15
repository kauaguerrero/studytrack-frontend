'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Trophy, Clock, Target, AlertCircle, CheckCircle, Zap, TrendingUp, Calendar, Plus, User, BookOpen, Minus, Sparkles, X, Trash2, Edit2, Save } from 'lucide-react';
import { SubmitProofModal } from '@/components/modals/SubmitProofModal';
import { GoalRanking } from '@/components/widgets/GoalRanking';
import { UnifiedGoal, GoalStatus } from '@/types/goals';

// --- COMPONENT 1: CREATE GOAL MODAL (With AI Support & Input Fixes) ---

interface CreateGoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    onSuccess: () => void;
    initialData?: { 
        title: string; 
        description: string; 
        target?: number; 
        target_value?: number; 
        deadline: string 
    } | null;
}

function CreatePersonalGoalModal({ isOpen, onClose, userId, onSuccess, initialData }: CreateGoalModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [target, setTarget] = useState<number | string>(1);
    const [deadline, setDeadline] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && initialData) {
            setTitle(initialData.title || '');
            setDescription(initialData.description || '');
            // Fix: Handle API field naming differences
            setTarget(initialData.target_value || initialData.target || 1);
            setDeadline(initialData.deadline || '');
        } else if (isOpen && !initialData) {
            setTitle(''); 
            setDescription(''); 
            setTarget(1); 
            setDeadline('');
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/goals/create-personal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    title,
                    description,
                    target_value: Number(target),
                    deadline: new Date(deadline).toISOString(),
                    metric_type: 'manual'
                })
            });
            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                alert('Erro ao criar meta.');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
                <div className="flex justify-between items-center mb-5">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                        {initialData ? <Sparkles className="text-purple-600" size={22} /> : <Plus className="text-blue-600" size={22} />}
                        {initialData ? 'Aceitar Sugestão IA' : 'Nova Meta Pessoal'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Título</label>
                        <input 
                            required 
                            className="w-full mt-1 border border-slate-300 rounded-xl p-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" 
                            placeholder="Ex: Ler Cap. 3" 
                            value={title || ''} 
                            onChange={e => setTitle(e.target.value)} 
                        />
                    </div>
                    
                    {initialData && (
                        <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                            <label className="text-xs font-bold text-purple-700 uppercase tracking-wide">Motivo da Sugestão</label>
                            <p className="text-xs text-purple-800 mt-1 leading-relaxed">{description}</p>
                        </div>
                    )}
                    
                    {!initialData && (
                        <div>
                             <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Descrição (Opcional)</label>
                             <input 
                                className="w-full mt-1 border border-slate-300 rounded-xl p-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" 
                                placeholder="Detalhes da meta..." 
                                value={description || ''}
                                onChange={e => setDescription(e.target.value)} 
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Meta (Qtd)</label>
                            <input 
                                required 
                                type="number" 
                                min="1" 
                                className="w-full mt-1 border border-slate-300 rounded-xl p-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" 
                                value={target || ''} 
                                onChange={e => setTarget(e.target.value)} 
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Prazo</label>
                            <input 
                                required 
                                type="date" 
                                className="w-full mt-1 border border-slate-300 rounded-xl p-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" 
                                value={deadline || ''} 
                                onChange={e => setDeadline(e.target.value)} 
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl text-sm hover:bg-slate-200 transition-colors">Cancelar</button>
                        <button type="submit" disabled={loading} className={`flex-1 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg active:scale-95 ${initialData ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}>
                            {loading ? 'Salvando...' : 'Confirmar Meta'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- COMPONENT 2: GOAL DETAILS & EDIT MODAL ---

function GoalDetailsModal({ goal, userId, onClose, onUpdate, onDelete }: { goal: UnifiedGoal; userId: string; onClose: () => void; onUpdate: () => void; onDelete: () => void }) {
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Form States
    const [title, setTitle] = useState(goal.title);
    const [description, setDescription] = useState(goal.description || '');
    const [target, setTarget] = useState(goal.target);
    const [deadline, setDeadline] = useState(new Date(goal.date).toISOString().split('T')[0]);

    // Permissions: Only Personal or AI goals can be edited/deleted
    const canEdit = goal.source === 'personal' || goal.source === 'ai';

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/goals/edit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    goal_id: goal.id,
                    user_id: userId,
                    title, description, target_value: target, deadline: new Date(deadline).toISOString()
                })
            });
            if (res.ok) {
                onUpdate();
                setIsEditing(false);
                onClose();
            } else {
                alert("Erro ao salvar.");
            }
        } catch(e) { console.error(e); }
        setLoading(false);
    };

    const handleDelete = async () => {
        if (!confirm("Tem certeza que deseja excluir esta meta?")) return;
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/goals/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goal_id: goal.id, user_id: userId })
            });
            if (res.ok) {
                onDelete();
                onClose();
            } else {
                alert("Erro ao excluir.");
            }
        } catch(e) { console.error(e); }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                    <div className="flex gap-3">
                        <div className={`p-2 rounded-lg ${goal.source === 'teacher' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {goal.source === 'teacher' ? <BookOpen size={24} /> : <User size={24} />}
                        </div>
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                {goal.source === 'teacher' ? 'Meta da Turma' : 'Meta Pessoal'}
                            </span>
                            {isEditing ? (
                                <input className="block w-full text-xl font-bold border-b border-slate-300 focus:border-blue-500 outline-none mt-1" value={title} onChange={e => setTitle(e.target.value)} />
                            ) : (
                                <h3 className="text-xl font-bold text-slate-800 leading-tight">{goal.title}</h3>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={24} /></button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Description */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">Descrição</label>
                        {isEditing ? (
                            <textarea className="w-full mt-2 p-3 border border-slate-200 rounded-xl text-sm min-h-[100px]" value={description} onChange={e => setDescription(e.target.value)} />
                        ) : (
                            <div className="mt-2 text-slate-600 text-sm leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                                {goal.description || "Sem descrição."}
                            </div>
                        )}
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 border border-slate-100 rounded-xl">
                            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Clock size={12}/> Prazo</label>
                            {isEditing ? (
                                <input type="date" className="mt-1 w-full text-sm font-bold" value={deadline} onChange={e => setDeadline(e.target.value)} />
                            ) : (
                                <div className="font-bold text-slate-700 mt-1">{new Date(goal.date).toLocaleDateString('pt-BR')}</div>
                            )}
                        </div>
                        <div className="p-3 border border-slate-100 rounded-xl">
                            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Target size={12}/> Alvo</label>
                            {isEditing ? (
                                <input type="number" className="mt-1 w-full text-sm font-bold" value={target} onChange={e => setTarget(Number(e.target.value))} />
                            ) : (
                                <div className="font-bold text-slate-700 mt-1">{goal.target} {goal.metric || 'unidades'}</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-between items-center">
                    {isEditing ? (
                        <>
                             <button onClick={() => setIsEditing(false)} className="text-slate-500 text-sm font-bold hover:underline">Cancelar</button>
                             <button onClick={handleSave} disabled={loading} className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-emerald-200 shadow-md hover:bg-emerald-700 flex items-center gap-2">
                                <Save size={16}/> {loading ? 'Salvando...' : 'Salvar Alterações'}
                             </button>
                        </>
                    ) : (
                        <>
                            {canEdit ? (
                                <div className="flex gap-3">
                                    <button onClick={handleDelete} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold">
                                        <Trash2 size={16} /> Excluir
                                    </button>
                                    <button onClick={() => setIsEditing(true)} className="text-slate-600 hover:bg-white hover:shadow-sm p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold border border-transparent hover:border-slate-200">
                                        <Edit2 size={16} /> Editar
                                    </button>
                                </div>
                            ) : (
                                <div className="text-xs text-slate-400 italic">Meta definida pelo professor.</div>
                            )}
                            
                            <button onClick={onClose} className="bg-white border border-slate-200 text-slate-700 px-5 py-2 rounded-xl font-bold text-sm hover:bg-slate-50">
                                Fechar
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- COMPONENT 3: INTERACTIVE WIDGET ---

function InteractiveProgressWidget({ goal, userId, onUpdate }: { goal: UnifiedGoal; userId: string; onUpdate: () => void }) {
    const [val, setVal] = useState(goal.current);
    const [saving, setSaving] = useState(false);
    const [hasChanged, setHasChanged] = useState(false);

    const updateVal = (delta: number) => {
        const newVal = Math.max(0, Math.min(goal.target, val + delta));
        setVal(newVal);
        setHasChanged(newVal !== goal.current);
    };

    const handleSave = async () => {
        if (!hasChanged) return;
        setSaving(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/goals/update-progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goal_id: goal.id, user_id: userId, current_value: val })
            });
            if (res.ok) { onUpdate(); setHasChanged(false); }
        } catch (e) { console.error(e); } finally { setSaving(false); }
    };

    return (
        <div className="flex flex-col gap-2 w-full" onClick={e => e.stopPropagation()}> 
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                <button onClick={() => updateVal(-1)} className="w-8 h-8 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg flex items-center justify-center transition-colors active:scale-90">
                    <Minus size={16} strokeWidth={3} />
                </button>
                <div className="flex-1 text-center">
                    <input type="number" className="w-full bg-transparent text-center font-bold text-slate-800 outline-none" value={val} readOnly />
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">de {goal.target}</div>
                </div>
                <button onClick={() => updateVal(1)} className="w-8 h-8 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg flex items-center justify-center transition-colors active:scale-90">
                    <Plus size={16} strokeWidth={3} />
                </button>
            </div>
            {hasChanged && (
                 <button onClick={handleSave} disabled={saving} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2 rounded-lg transition-all shadow-md shadow-emerald-100 animate-in slide-in-from-top-2">
                    {saving ? '...' : 'Confirmar'}
                </button>
            )}
        </div>
    );
}

// --- MAIN PAGE COMPONENT ---

export default function StudentGoalsPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [feed, setFeed] = useState<UnifiedGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState<UnifiedGoal | null>(null); // For Proof Modal (Legacy)
  const [userId, setUserId] = useState<string | null>(null);
  
  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedGoalDetails, setSelectedGoalDetails] = useState<UnifiedGoal | null>(null); // For Details Modal
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const fetchFeed = async () => {
        if (!userId) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/goals/feed/${userId}`, { cache: 'no-store' });
            if (res.ok) setFeed(await res.json());
        } catch (error) { console.error("❌ Erro de conexão:", error); }
        setLoading(false);
  };

  useEffect(() => {
    const initUser = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setUserId(user.id);
        else setLoading(false);
    };
    initUser();
  }, []);

  useEffect(() => { if (userId) fetchFeed(); }, [userId]);

  // AI Handler
  const handleAiSuggestion = async () => {
      if (!userId) return;
      setLoadingAi(true);
      try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/goals/suggest-ai`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: userId })
          });
          const data = await res.json();
          if (data.success) {
              setAiSuggestion(data.suggestion);
              setIsCreateModalOpen(true);
          } else {
              alert("Não foi possível gerar sugestão agora.");
          }
      } catch (e) {
          console.error(e);
          alert("Erro de conexão com a IA.");
      } finally {
          setLoadingAi(false);
      }
  };

  const handleOpenManualCreate = () => {
      setAiSuggestion(null);
      setIsCreateModalOpen(true);
  };

  const filteredFeed = useMemo(() => {
    return feed.filter(item => activeTab === 'pending' ? item.status !== 'completed' : item.status === 'completed');
  }, [feed, activeTab]);

  const urgentGoal = useMemo(() => (activeTab === 'pending' && filteredFeed.length > 0 ? filteredFeed[0] : null), [filteredFeed, activeTab]);

  const calculateProgress = (current: number, target: number) => {
    if (target <= 0) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  };

  const getStatusColor = (status: GoalStatus) => {
    switch (status) {
        case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'in_progress': return 'bg-amber-100 text-amber-800 border-amber-200';
        default: return 'bg-blue-50 text-blue-700 border-blue-100'; 
    }
  };

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[500px] text-slate-400 gap-3 animate-pulse">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                <Trophy size={32} className="opacity-30" />
            </div>
            <p className="text-sm font-medium">Carregando seu plano de conquistas...</p>
        </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Header */}
        <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                Minhas Metas <Trophy className="text-yellow-500 fill-yellow-500" size={28} />
            </h1>
            <p className="text-slate-500 mt-2 text-base">
                Transforme seus estudos em conquistas. Acompanhe seu progresso aqui.
            </p>
        </div>
        
        {/* Controls Row: Tabs + Action Buttons */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-1">
            {/* Toggle Tabs */}
            <div className="flex gap-1">
                {['pending', 'completed'].map((tab) => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-all border-b-2 ${
                            activeTab === tab 
                            ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        {tab === 'pending' ? 'Em Aberto' : 'Concluídas'}
                        {tab === 'pending' && filteredFeed.length > 0 && (
                            <span className="ml-2 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">
                                {filteredFeed.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Action Buttons Group */}
            <div className="flex items-center gap-2 mb-2 md:mb-0 w-full md:w-auto">
                <button 
                    onClick={handleOpenManualCreate}
                    className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm h-10"
                >
                    <Plus size={16} /> Nova Meta
                </button>
                
                <button 
                    onClick={handleAiSuggestion}
                    disabled={loadingAi}
                    className="flex-1 md:flex-none bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 transition-all px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-200 h-10 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loadingAi ? (
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    ) : (
                        <Sparkles size={16} className="text-yellow-300" fill="currentColor" />
                    )}
                    {loadingAi ? 'Analisando...' : 'Sugestão IA'}
                </button>
            </div>
        </div>

        {/* HERO SECTION (Urgent Goal) */}
        {activeTab === 'pending' && urgentGoal && (
            <div className={`relative overflow-hidden rounded-2xl text-white shadow-xl transition-all hover:shadow-2xl hover:scale-[1.01] duration-300 group cursor-default ${
                urgentGoal.source === 'personal' || urgentGoal.source === 'ai'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 shadow-emerald-200/50'
                : 'bg-gradient-to-r from-blue-600 to-indigo-700 shadow-blue-200/50'
            }`}>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
                
                <div className="relative z-10 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-4 max-w-2xl">
                        <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md border border-white/10">
                            <Zap size={14} className="text-yellow-300" /> Foco Principal
                        </div>
                        <h2 className="text-3xl font-bold leading-tight">{urgentGoal.title}</h2>
                        <p className="text-blue-100 text-lg leading-relaxed">{urgentGoal.description || "Mantenha o foco e complete sua meta!"}</p>
                        
                        <div className="flex items-center gap-6 pt-2">
                            <div className="flex items-center gap-2 text-sm font-medium bg-black/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                                <Clock size={16} className="text-blue-200" />
                                Prazo: {new Date(urgentGoal.date).toLocaleDateString('pt-BR')}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-3 shrink-0">
                        <div className="relative w-24 h-24 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/20" />
                                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-yellow-400" 
                                    strokeDasharray={251.2} 
                                    strokeDashoffset={251.2 - (251.2 * calculateProgress(urgentGoal.current, urgentGoal.target)) / 100} 
                                />
                            </svg>
                            <span className="absolute text-xl font-bold">{calculateProgress(urgentGoal.current, urgentGoal.target)}%</span>
                        </div>
                        
                        <button 
                            onClick={() => setSelectedGoalDetails(urgentGoal)}
                            className="bg-white text-blue-700 font-bold px-6 py-2.5 rounded-xl shadow-lg hover:bg-blue-50 active:scale-95 transition-all flex items-center gap-2 text-sm"
                        >
                            <CheckCircle size={18} /> Detalhes
                        </button>
                    </div>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-5">
                {filteredFeed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <Target className="text-slate-300" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">Tudo limpo por aqui!</h3>
                        <p className="text-slate-500 max-w-xs mx-auto mt-1">
                            {activeTab === 'pending' ? "Você completou todas as suas missões." : "Nenhuma meta concluída ainda."}
                        </p>
                    </div>
                ) : (
                    filteredFeed.map((item) => {
                        // Don't show hero card again in pending list
                        if (activeTab === 'pending' && item.id === urgentGoal?.id) return null;

                        const progress = calculateProgress(item.current, item.target);
                        const isPersonal = item.source === 'personal';
                        const isAi = item.source === 'ai';
                        const isTeacher = item.source === 'teacher';

                        const borderColor = isPersonal ? 'bg-emerald-500' : isAi ? 'bg-purple-500' : 'bg-blue-500';
                        const labelClass = isPersonal 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : isAi
                                ? 'bg-purple-50 text-purple-700 border-purple-100'
                                : 'bg-blue-50 text-blue-700 border-blue-100';

                        return (
                            <div 
                                key={item.id} 
                                onClick={() => setSelectedGoalDetails(item)} 
                                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group relative overflow-hidden cursor-pointer"
                            >
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${borderColor}`}></div>

                                <div className="pl-4 flex flex-col md:flex-row gap-5 items-start justify-between">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border flex items-center gap-1 ${labelClass}`}>
                                                {isPersonal ? <User size={10} /> : isAi ? <Sparkles size={10} /> : <BookOpen size={10} />}
                                                {isPersonal ? 'Pessoal' : isAi ? 'Sugestão IA' : 'Turma'}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border ${getStatusColor(item.status)}`}>
                                                {item.status === 'completed' ? 'Concluída' : 'Em Andamento'}
                                            </span>
                                        </div>
                                        
                                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                                            {item.title}
                                        </h3>
                                        {item.description && (
                                            <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                                                {item.description}
                                            </p>
                                        )}

                                        <div className="max-w-md pt-2">
                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-emerald-500' : isPersonal ? 'bg-emerald-500' : isAi ? 'bg-purple-500' : 'bg-blue-500'}`} 
                                                    style={{ width: `${progress}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-3 shrink-0 min-w-[140px]">
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                            <Calendar size={13} />
                                            {new Date(item.date).toLocaleDateString('pt-BR')}
                                        </div>

                                        {activeTab === 'pending' && userId ? (
                                             <InteractiveProgressWidget goal={item} userId={userId} onUpdate={fetchFeed} />
                                        ) : (
                                            <button className="text-xs text-slate-400 font-bold border border-slate-200 px-3 py-1 rounded-lg cursor-default">
                                                Concluída
                                            </button>
                                        )}

                                        {item.proof_url && (
                                            <a href={item.proof_url} onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 font-medium">
                                                Ver anexo <TrendingUp size={12} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Ranking Widget (Inside Card for Teacher goals) */}
                                {item.source === 'teacher' && item.group_id && (
                                    <div className="mt-4 ml-4 pt-3 border-t border-slate-50">
                                        <GoalRanking groupId={item.group_id} condensed />
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Sidebar */}
            <div className="hidden lg:block space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm sticky top-6">
                    <h4 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                        <AlertCircle size={18} className="text-blue-500" />
                        Dicas do Coach
                    </h4>
                    <ul className="space-y-3 text-sm text-slate-600">
                        <li className="flex gap-3">
                            <Sparkles size={16} className="text-purple-500 mt-0.5 shrink-0" />
                            <span>Use o botão "Sugestão IA" para descobrir o que priorizar nos estudos.</span>
                        </li>
                        <li className="flex gap-3">
                            <CheckCircle size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                            <span>Use os botões <strong>+</strong> e <strong>-</strong> para registrar páginas lidas ou questões feitas rapidamente.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>

        {/* MODALS */}
        {selectedGoal && userId && (
            <SubmitProofModal isOpen={!!selectedGoal} onClose={() => setSelectedGoal(null)} goalId={selectedGoal.id} goalTitle={selectedGoal.title} userId={userId} />
        )}

        {selectedGoalDetails && userId && (
            <GoalDetailsModal 
                goal={selectedGoalDetails} 
                userId={userId} 
                onClose={() => setSelectedGoalDetails(null)}
                onUpdate={fetchFeed}
                onDelete={fetchFeed}
            />
        )}

        {userId && (
            <CreatePersonalGoalModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                userId={userId}
                onSuccess={fetchFeed}
                initialData={aiSuggestion}
            />
        )}
    </div>
  );
}