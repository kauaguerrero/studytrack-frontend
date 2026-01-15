'use client';

import { useState, useEffect } from 'react';
import { X, Target, Lightbulb, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/client'; // Garanta que este path está correto

interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroomId: string;
  classroomName: string;
}

const SUGGESTIONS = [
  { title: 'Leitura Intensa', desc: 'Ler 20 páginas do livro paradidático.', target: 20, type: 'pages' },
  { title: 'Maratona de Questões', desc: 'Resolver 10 questões de Matemática.', target: 10, type: 'questions' },
  { title: 'Redação Semanal', desc: 'Escrever e enviar 1 redação modelo ENEM.', target: 1, type: 'essay' },
  { title: 'Revisão Flashcards', desc: 'Revisar 50 flashcards de Biologia.', target: 50, type: 'flashcards' },
];

export function CreateGoalModal({ isOpen, onClose, classroomId, classroomName }: CreateGoalModalProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetValue, setTargetValue] = useState(10);
  const [deadline, setDeadline] = useState('');
  
  // Estado para armazenar o ID real do professor
  const [teacherId, setTeacherId] = useState<string | null>(null);

  // Efeito para buscar o usuário logado ao abrir o componente
  useEffect(() => {
    const fetchUser = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setTeacherId(user.id);
        } else {
            console.error("Usuário não autenticado encontrado no modal.");
        }
    };
    fetchUser();
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teacherId) {
        alert("Erro de segurança: Não foi possível identificar seu usuário. Recarregue a página.");
        return;
    }

    setLoading(true);

    try {
      // Ajuste para garantir que a data está no formato ISO correto
      const isoDeadline = deadline ? new Date(deadline).toISOString() : new Date().toISOString();

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/enterprise/goals/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: classroomId,
          creator_id: teacherId, // Agora enviamos o UUID válido do Supabase
          title,
          description,
          deadline: isoDeadline,
          target_value: targetValue,
          metric_type: 'manual' 
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Falha ao criar meta');
      }
      
      alert('Meta criada e enviada aos alunos! 🚀');
      onClose();
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = (s: typeof SUGGESTIONS[0]) => {
    setTitle(s.title);
    setDescription(s.desc);
    setTargetValue(s.target);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Target className="text-blue-600" size={20} />
            Nova Meta para {classroomName}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          {/* Sugestões */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-500 uppercase tracking-wide">
              <Lightbulb size={14} className="text-amber-500" /> Sugestões Rápidas
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTIONS.map((s, i) => (
                <button 
                  key={i}
                  type="button"
                  onClick={() => applySuggestion(s)}
                  className="text-left p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-xs"
                >
                  <div className="font-bold text-slate-700">{s.title}</div>
                  <div className="text-slate-500 mt-0.5 truncate">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Título da Meta</label>
              <input 
                type="text" 
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Resolver lista de PA/PG"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade Alvo</label>
                <input 
                  type="number" 
                  min="1"
                  required
                  value={targetValue}
                  onChange={e => setTargetValue(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Prazo (Deadline)</label>
                <div className="relative">
                  <input 
                    type="datetime-local" 
                    required
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pl-9"
                  />
                  <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição / Instruções</label>
              <textarea 
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Detalhe o que os alunos precisam fazer..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={loading || !teacherId}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? 'Criando...' : '🚀 Enviar Meta para Turma'}
              </button>
              <p className="text-center text-xs text-slate-400 mt-2">
                Os alunos receberão notificação por e-mail imediatamente.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}