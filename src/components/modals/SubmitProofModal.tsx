'use client';

import { useState } from 'react';
import { X, UploadCloud, Link as LinkIcon, Check } from 'lucide-react';

interface SubmitProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalId: string;
  goalTitle: string;
  userId: string;
}

export function SubmitProofModal({ isOpen, onClose, goalId, goalTitle, userId }: SubmitProofModalProps) {
  const [proofUrl, setProofUrl] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/goals/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                goal_id: goalId,
                user_id: userId,
                proof_url: proofUrl,
                comments: "Enviado pelo portal do aluno"
            })
        });

        if (res.ok) {
            alert("Comprovação enviada com sucesso! O professor será notificado. 🎉");
            window.location.reload(); // Recarrega para atualizar status visual
            onClose();
        } else {
            alert("Erro ao enviar. Tente novamente.");
        }
    } catch (error) {
        console.error(error);
        alert("Erro de conexão.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
            <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-slate-800 mb-1">Concluir Meta</h2>
        <p className="text-sm text-slate-500 mb-6">Envie uma evidência para "{goalTitle}"</p>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Link da Comprovação</label>
                <div className="relative">
                    <LinkIcon className="absolute left-3 top-3 text-slate-400" size={16} />
                    <input 
                        type="url" 
                        required
                        placeholder="https://drive.google.com/..."
                        value={proofUrl}
                        onChange={e => setProofUrl(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                </div>
                <p className="text-xs text-slate-400 mt-1">Cole um link do Google Drive, foto ou documento.</p>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
            >
                {loading ? 'Enviando...' : <><Check size={18} /> Marcar como Concluída</>}
            </button>
        </form>
      </div>
    </div>
  );
}