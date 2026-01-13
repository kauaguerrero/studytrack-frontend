'use client'

import { useState } from 'react';
import { X, Loader2, Send, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface CreateActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroomId: string;
  classroomName: string;
}

export function CreateActivityModal({ isOpen, onClose, classroomId, classroomName }: CreateActivityModalProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      // Defina a URL da sua API Python aqui (ou use variável de ambiente)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      // Dispara para a "Cozinha Pesada" (Python)
      const response = await fetch(`${API_URL}/api/enterprise/teacher/tasks/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}` // Passa o token para o Python validar
        },
        body: JSON.stringify({
          classroom_id: classroomId,
          title: title,
          description: description,
          due_date: dueDate
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar atividade');
      }

      // Sucesso!
      alert(`✅ Sucesso! Atividade criada para ${data.count} alunos.`);
      onClose();
      setTitle('');
      setDescription('');
      
    } catch (error: any) {
      console.error(error);
      alert(`❌ Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Nova Atividade</h3>
            <p className="text-xs text-slate-500">Enviando para: <span className="font-semibold text-blue-600">{classroomName}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Título da Atividade</label>
            <input 
              type="text" 
              required
              placeholder="Ex: Lista de Exercícios - Álgebra"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição / Instruções</label>
            <textarea 
              required
              rows={3}
              placeholder="Ex: Resolver páginas 40 a 45 do livro didático."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Data de Entrega (Opcional)</label>
            <div className="relative">
                <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input 
                  type="date" 
                  className="w-full pl-10 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                />
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-blue-200"
            >
              {loading ? (
                <> <Loader2 size={18} className="animate-spin" /> Processando... </>
              ) : (
                <> <Send size={18} /> Disparar Atividade </>
              )}
            </button>
            <p className="text-center text-xs text-slate-400 mt-3">
                Isso enviará uma notificação WhatsApp para todos os alunos da turma.
            </p>
          </div>

        </form>
      </div>
    </div>
  );
}