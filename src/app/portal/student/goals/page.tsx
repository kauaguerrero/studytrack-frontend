'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Trophy, Clock, Target, AlertCircle, CheckCircle, Zap, TrendingUp, Calendar, Plus, User, BookOpen, Minus, Sparkles, X, Trash2, Edit2, Save, Users, School, Medal } from 'lucide-react';
import { SubmitProofModal } from '@/components/modals/SubmitProofModal';
import { GoalRanking } from '@/components/widgets/GoalRanking';
import LeaderboardWidget from '@/components/goals/LeaderboardWidget';
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
            if (res.ok) { 
                const data = await res.json();
                onUpdate(); 
                setHasChanged(false); 
                
                // Feedback de Pontos (Gamification)
                if (data.points_awarded && data.points_awarded > 0) {
                    alert(`🎉 Parabéns! Você ganhou +${data.points_awarded} pontos no ranking!`);
                }
            }
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

// --- COMPONENT 4: VIEW DO LEADERBOARD (NOVO) ---

function LeaderboardView({ userId }: { userId: string }) {
    const [scope, setScope] = useState<'classroom' | 'school'>('classroom');
    const [category, setCategory] = useState<'general' | 'teacher' | 'personal' | 'ai'>('general');
    const [ranking, setRanking] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRanking = async () => {
            setLoading(true);
            try {
                const query = new URLSearchParams({ user_id: userId, scope, category });
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/goals/leaderboard?${query}`);
                if (res.ok) setRanking(await res.json());
            } catch (e) { console.error(e); }
            setLoading(false);
        };
        fetchRanking();
    }, [userId, scope, category]);

    const getMedalColor = (index: number) => {
        switch(index) {
            case 0: return "text-yellow-500 bg-yellow-100 border-yellow-200";
            case 1: return "text-slate-400 bg-slate-100 border-slate-200";
            case 2: return "text-amber-700 bg-amber-100 border-amber-200";
            default: return "text-slate-600 bg-white border-slate-100";
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                    <button onClick={() => setScope('classroom')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${scope === 'classroom' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Users size={14} /> Minha Turma
                    </button>
                    <button onClick={() => setScope('school')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${scope === 'school' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        <School size={14} /> Toda Escola
                    </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                    {[{ id: 'general', label: 'Geral', icon: <Trophy size={12}/> }, { id: 'teacher', label: 'Professor (+3)', icon: <BookOpen size={12}/> }, { id: 'ai', label: 'IA (+2)', icon: <Sparkles size={12}/> }, { id: 'personal', label: 'Pessoal (+1)', icon: <User size={12}/> }].map(cat => (
                        <button key={cat.id} onClick={() => setCategory(cat.id as any)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide border whitespace-nowrap transition-all ${category === cat.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                            {cat.icon} {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden min-h-[300px]">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><Trophy className="text-yellow-500" size={18} /> Top 5 Goalers</h3>
                    <span className="text-xs text-slate-400 font-medium">Atualizado em tempo real</span>
                </div>

                {loading ? (
                    <div className="p-10 flex flex-col items-center justify-center text-slate-400 gap-3">
                         <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                         <p className="text-sm">Calculando pontuações...</p>
                    </div>
                ) : ranking.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">
                        <Medal size={40} className="mx-auto mb-3 opacity-20" />
                        <p>Ninguém pontuou nesta categoria ainda.</p>
                        <p className="text-xs mt-1">Seja o primeiro!</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {ranking.map((user, index) => {
                            const isMe = user.id === userId;
                            return (
                                <div key={user.id} className={`flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors ${isMe ? 'bg-blue-50/50' : ''}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-black text-lg shadow-sm ${getMedalColor(index)}`}>{index + 1}</div>
                                    <div className="flex-1">
                                        <div className="font-bold text-slate-800 flex items-center gap-2">{user.full_name} {isMe && <span className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded uppercase">Você</span>}</div>
                                        <div className="text-xs text-slate-500">{index === 0 ? "👑 O Rei das Metas" : "Goal Master"}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-slate-900 leading-none">{user.score}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">Pontos</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex gap-3 text-sm text-blue-800">
                <AlertCircle className="shrink-0 mt-0.5" size={16} />
                <div>
                    <strong className="block mb-1">Como funciona a pontuação?</strong>
                    <ul className="list-disc pl-4 space-y-0.5 text-xs opacity-80">
                        <li>Metas da Turma valem <strong>3 pontos</strong>.</li>
                        <li>Metas sugeridas pela IA valem <strong>2 pontos</strong> (Max 2/dia).</li>
                        <li>Metas Pessoais valem <strong>1 ponto</strong> (Max 3/dia).</li>
                        <li>Metas feitas em menos de 5 min não contam.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

// --- MAIN PAGE COMPONENT ---

export default function StudentGoalsPage() {
  const [viewMode, setViewMode] = useState<'list' | 'ranking'>('list');
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'ranking'>('pending');
  const [feed, setFeed] = useState<UnifiedGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [totalPoints, setTotalPoints] = useState(0); 
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedGoalDetails, setSelectedGoalDetails] = useState<UnifiedGoal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<UnifiedGoal | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const fetchFeed = async () => {
        if (!userId) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/goals/feed/${userId}`, { cache: 'no-store' });
            if (res.ok) setFeed(await res.json());

            const supabase = createClient();
            const { data: profile } = await supabase.from('profiles').select('total_points').eq('id', userId).single();
            if(profile) setTotalPoints(profile.total_points || 0);

        } catch (error) { console.error("❌ Erro de conexão:", error); }
        setLoading(false);
  };

  useEffect(() => {
    const initUser = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserId(user.id);
            const { data: profile } = await supabase.from('profiles').select('total_points').eq('id', user.id).single();
            if(profile) setTotalPoints(profile.total_points || 0);
        } else {
            setLoading(false);
        }
    };
    initUser();
  }, []);

  useEffect(() => { if (userId) fetchFeed(); }, [userId]);

  const handleAiSuggestion = async () => {
      if (!userId) return;
      setLoadingAi(true);
      try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/goals/suggest-ai`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId })
          });
          const data = await res.json();
          if (data.success) { setAiSuggestion(data.suggestion); setIsCreateModalOpen(true); } 
          else { alert("Indisponível."); }
      } catch (e) { alert("Erro IA."); } finally { setLoadingAi(false); }
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

  if (loading) return <div className="text-center p-10 text-slate-400">Carregando...</div>;

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
                {['pending', 'completed', 'ranking'].map((tab) => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
                            activeTab === tab 
                            ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        {tab === 'ranking' && <Trophy size={14} className="text-amber-500" />}
                        {tab === 'pending' ? 'Em Aberto' : tab === 'completed' ? 'Concluídas' : 'Ranking'}
                        {tab === 'pending' && filteredFeed.length > 0 && (
                            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">
                                {filteredFeed.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Action Buttons Group */}
            {activeTab !== 'ranking' && (
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
            )}
        </div>

        {/* CONTENT AREA */}
        {activeTab === 'ranking' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="md:col-span-2">
                     <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-8 text-white shadow-xl mb-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Hall da Fama 🏆</h2>
                                <p className="text-indigo-100 opacity-90 leading-relaxed max-w-lg">
                                    Acompanhe quem está liderando os estudos na sua turma e escola. 
                                    Complete metas para subir no ranking!
                                </p>
                            </div>
                            <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20 hidden md:block">
                                <span className="block text-xs font-bold uppercase tracking-wider text-indigo-200 mb-1">Seus Pontos</span>
                                <span className="text-3xl font-black">
                                    {totalPoints}
                                </span>
                            </div>
                        </div>
                     </div>
                     
                     <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Target className="text-emerald-500" size={20} />
                            Como ganhar pontos?
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                                <div className="text-2xl font-black text-blue-600 mb-1">+3</div>
                                <div className="text-sm font-bold text-slate-700">Meta do Professor</div>
                                <div className="text-xs text-slate-500 mt-1">Atividades oficiais da turma.</div>
                            </div>
                            <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                                <div className="text-2xl font-black text-purple-600 mb-1">+2</div>
                                <div className="text-sm font-bold text-slate-700">Sugestão IA</div>
                                <div className="text-xs text-slate-500 mt-1">Metas personalizadas pelo sistema.</div>
                            </div>
                            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                                <div className="text-2xl font-black text-emerald-600 mb-1">+1</div>
                                <div className="text-sm font-bold text-slate-700">Meta Pessoal</div>
                                <div className="text-xs text-slate-500 mt-1">Máximo de 3 pontuadas por dia.</div>
                            </div>
                        </div>
                     </div>
                </div>
                
                <div className="md:col-span-1 h-full min-h-[400px]">
                    {userId && <LeaderboardWidget userId={userId} />}
                </div>
            </div>
        ) : (
            <>
                {/* HERO SECTION (Urgent Goal) */}
                {activeTab === 'pending' && urgentGoal && (
                    <div 
                        onClick={() => setSelectedGoalDetails(urgentGoal)} 
                        className={`relative overflow-hidden rounded-2xl text-white shadow-xl mb-8 p-8 flex flex-col md:flex-row justify-between items-center bg-gradient-to-r ${
                            urgentGoal.source === 'personal' || urgentGoal.source === 'ai'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-700 shadow-emerald-200/50'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-700 shadow-blue-200/50'
                        } cursor-pointer group`}
                    >
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
                        
                        <div className="relative z-10 mb-6 md:mb-0 space-y-4 max-w-2xl">
                             <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md border border-white/10 mb-2">
                                <Zap size={14} className="text-yellow-300" /> Foco Principal
                             </div>
                             <h2 className="text-3xl font-bold leading-tight">{urgentGoal.title}</h2>
                             <p className="text-blue-100 text-lg leading-relaxed opacity-90">{urgentGoal.description || "Mantenha o foco e complete sua meta!"}</p>
                             
                             <div className="flex items-center gap-6 pt-2">
                                <div className="flex items-center gap-2 text-sm font-medium bg-black/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                                    <Clock size={16} className="text-blue-200" />
                                    Prazo: {new Date(urgentGoal.date).toLocaleDateString('pt-BR')}
                                </div>
                            </div>
                        </div>
                        
                        <div className="relative z-10 flex flex-col items-center gap-4 shrink-0 w-full md:w-auto">
                             <div className="relative w-24 h-24 flex items-center justify-center">
                                 <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/20"/>
                                    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-yellow-400" strokeDasharray={251} strokeDashoffset={251 - (251 * calculateProgress(urgentGoal.current, urgentGoal.target))/100} />
                                 </svg>
                                 <span className="absolute font-bold text-xl">{calculateProgress(urgentGoal.current, urgentGoal.target)}%</span>
                             </div>
                             
                             {userId && (
                                 <div className="w-full max-w-[180px] text-slate-800" onClick={e => e.stopPropagation()}>
                                    <InteractiveProgressWidget goal={urgentGoal} userId={userId} onUpdate={fetchFeed} />
                                 </div>
                             )}
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
                            
                            {/* Mini Leaderboard Widget here too */}
                            <div className="mt-8 pt-6 border-t border-slate-100">
                                 {userId && <LeaderboardWidget userId={userId} />}
                            </div>
                        </div>
                    </div>
                </div>
            </>
        )}

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