'use client'

import { useState } from 'react';
import { X, Loader2, Send, Calendar, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface CreateActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroomId: string;
  classroomName: string;
}

export function CreateActivityModal({ isOpen, onClose, classroomId, classroomName }: CreateActivityModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [linkUrl, setLinkUrl] = useState(''); // Novo Campo

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

      // Formata a data para ISO (Final do dia selecionado)
      const formattedDate = dueDate ? new Date(dueDate + 'T23:59:59').toISOString() : null;

      // Dispara para a "Cozinha Pesada" (Python)
      const response = await fetch(`${API_URL}/api/enterprise/teacher/tasks/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          classroom_id: classroomId,
          title: title,
          description: description,
          due_date: formattedDate,
          link_url: linkUrl || null // Envia null se vazio
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar atividade');
      }

      // Sucesso!
      alert(`✅ Atividade enviada com sucesso para ${data.count} alunos!`);
      
      // Limpa e fecha
      setTitle('');
      setDescription('');
      setLinkUrl('');
      setDueDate('');
      onClose();
      
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "Erro desconhecido ao processar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Send size={18} className="text-blue-600" /> Nova Atividade
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
                Turma: <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{classroomName}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 bg-white rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm border border-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" aria-label="Fechar">
            <X size={20} aria-hidden />
          </button>
        </div>

        {/* Form com Scroll se necessário */}
        <div className="overflow-y-auto p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
            
            {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm font-medium">
                    <AlertCircle size={18} />
                    {errorMsg}
                </div>
            )}
            
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Título</label>
                <input 
                type="text" 
                required
                placeholder="Ex: Lista de Exercícios - Álgebra"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium"
                value={title}
                onChange={e => setTitle(e.target.value)}
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Instruções</label>
                <textarea 
                required
                rows={4}
                placeholder="Descreva o que os alunos devem fazer..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                value={description}
                onChange={e => setDescription(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Calendar size={12} /> Entrega (Opcional)
                    </label>
                    <input 
                        type="date" 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-600"
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <LinkIcon size={12} /> Link (Opcional)
                    </label>
                    <input 
                        type="url"
                        placeholder="https://..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={linkUrl}
                        onChange={e => setLinkUrl(e.target.value)}
                    />
                </div>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
            >
                {loading ? (
                <> <Loader2 size={20} className="animate-spin" /> Processando... </>
                ) : (
                <> <Send size={20} /> Disparar Agora </>
                )}
            </button>
            
            <p className="text-center text-[10px] text-slate-400 font-medium">
                Notificação via WhatsApp e E-mail será enviada automaticamente.
            </p>
            </form>
        </div>
      </div>
    </div>
  );
}