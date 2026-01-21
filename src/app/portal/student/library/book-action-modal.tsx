'use client'

import { useState } from "react";
import { BookOpen, Star, Share2, Award, ExternalLink, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type BookProps = {
    id: string;
    title: string;
    pdf_url: string;
    cover_url: string | null;
};

export function BookActionModal({ book, children }: { book: BookProps, children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [progress, setProgress] = useState(0); 
    const [status, setStatus] = useState<'idle' | 'reading' | 'completed'>('idle');
    const [review, setReview] = useState("");
    const supabase = createClient();

    // Simulação de lógica de progresso
    const handleSubmitWeeklyReview = async () => {
        const newProgress = Math.min(progress + 25, 100);
        setProgress(newProgress);
        
        if (newProgress === 100) {
            setStatus('completed');
            alert(`Parabéns! Você completou a leitura de "${book.title}"!`);
        }
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: `Lendo ${book.title} no StudyTrack`,
                text: `Estou lendo ${book.title}. Venha ver minha resenha!`,
                url: window.location.href
            });
        } else {
            alert("Link copiado para a área de transferência!");
            navigator.clipboard.writeText(window.location.href);
        }
    };

    return (
        <>
            {/* 1. O Gatilho (Trigger) - Clica aqui para abrir */}
            <div onClick={() => setIsOpen(true)} className="cursor-pointer h-full">
                {children}
            </div>

            {/* 2. O Modal (Implementação Nativa com Tailwind) */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    
                    {/* Backdrop Escuro */}
                    <div 
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Conteúdo do Modal */}
                    <div className="relative z-50 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h2 className="text-xl font-bold flex gap-2 items-center text-slate-800">
                                <BookOpen className="text-blue-600" size={20} />
                                <span className="truncate">{book.title}</span>
                            </h2>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6">
                            
                            {/* Card de Progresso (Native) */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                                <div className="flex justify-between text-sm font-medium mb-1">
                                    <span className="text-slate-600">Seu Progresso</span>
                                    <span className="text-blue-600 font-bold">{progress}%</span>
                                </div>
                                
                                {/* Barra de Progresso Customizada */}
                                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-blue-600 transition-all duration-500 ease-out" 
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                
                                <button 
                                    className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold border border-dashed transition-colors ${
                                        progress >= 100 
                                        ? "bg-green-50 text-green-600 border-green-200 cursor-default" 
                                        : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                                    }`}
                                    onClick={handleSubmitWeeklyReview}
                                    disabled={progress >= 100}
                                >
                                    <Award size={14} className={progress >= 100 ? "text-green-600" : "text-orange-500"} />
                                    {progress >= 100 ? "Livro Concluído" : "Enviar Resenha (+25%)"}
                                </button>
                            </div>

                            {/* Área de Resenha (Native Textarea) */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Sua Resenha Pública</label>
                                <textarea 
                                    placeholder="O que você achou deste capítulo? (Compartilhado com a turma)" 
                                    value={review}
                                    onChange={(e) => setReview(e.target.value)}
                                    className="w-full min-h-[80px] p-3 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none transition-all"
                                />
                                <div className="flex gap-1 justify-end">
                                     {[1,2,3,4,5].map(star => (
                                         <Star key={star} size={16} className="text-slate-300 hover:text-yellow-400 cursor-pointer transition-colors" />
                                     ))}
                                </div>
                            </div>

                            {/* Ações */}
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={handleShare} 
                                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors text-sm"
                                >
                                    <Share2 size={16} />
                                    Compartilhar
                                </button>
                                
                                <a 
                                    href={book.pdf_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors text-sm shadow-md hover:shadow-lg"
                                >
                                    Ler PDF
                                    <ExternalLink size={14} />
                                </a>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </>
    );
}