'use client';

import React, { useState } from 'react';
import { X, Crown, CheckCircle2, Lock, ArrowRight, Star, Zap, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SubscriptionLock } from '@/components/dashboard/SubscriptionLock';

interface UpsellModalProps {
    isOpen: boolean;
    onClose: () => void;
    reason: 'DAILY_QUOTA_REACHED' | 'TRIAL_EXPIRED' | 'DAILY_SIMULADO_REACHED' | 'GENERIC_UPSELL';
    userName?: string;
}

type ModalStep = 'ALERT' | 'PLANS' | 'CHECKOUT';
type PlanType = 'basic' | 'pro' | 'elite';

export function UpsellModal({ isOpen, onClose, reason, userName = "Estudante" }: UpsellModalProps) {
    const [step, setStep] = useState<ModalStep>('ALERT');
    const [selectedPlan, setSelectedPlan] = useState<PlanType>('pro');

    React.useEffect(() => {
        if (isOpen) {
            setStep('ALERT');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // --- PASSO 3: CHECKOUT ---
    if (step === 'CHECKOUT') {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
                <SubscriptionLock planTier={selectedPlan} userName={userName} />
                <button 
                    onClick={() => setStep('PLANS')} 
                    className="absolute top-4 left-4 z-[101] bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-white text-sm font-bold transition-colors flex items-center gap-2"
                >
                    ← Voltar
                </button>
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 z-[101] bg-white/10 hover:bg-white/20 p-2 rounded-full text-white transition-colors"
                >
                    <X size={24} />
                </button>
            </div>
        )
    }

    const alertContent = {
        'DAILY_QUOTA_REACHED': {
            title: "Meta Diária Batida! 🎯",
            subtitle: "Você completou suas 15 questões gratuitas.",
            body: "Seu foco é admirável! Para continuar estudando hoje sem interrupções e garantir sua aprovação, escolha um plano ilimitado.",
            cta: "Ver Planos e Preços"
        },
        'DAILY_SIMULADO_REACHED': {
            title: "Simulado Concluído! 📚",
            subtitle: "Cota de simulado diário atingida.",
            body: "Treino difícil, jogo fácil. Desbloqueie simulados ilimitados e correções detalhadas com nossos planos premium.",
            cta: "Liberar Simulados"
        },
        'TRIAL_EXPIRED': {
            title: "Seu Teste Grátis acabou ⏳",
            subtitle: "As 72 horas de acesso Trial expiraram.",
            body: "Esperamos que a StudyTrack tenha agregado valor. Para continuar sua jornada rumo à aprovação, selecione seu plano ideal.",
            cta: "Escolher meu Plano",
            locked: true
        },
        'GENERIC_UPSELL': {
            title: "Seja um Aluno de Elite 🚀",
            subtitle: "Acelere sua aprovação.",
            body: "Tenha acesso a simulados infinitos, correções detalhadas por IA e cronogramas adaptativos.",
            cta: "Ver Ofertas"
        }
    }[reason];

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <AnimatePresence mode="wait">
                
                {/* --- PASSO 1: ALERTA --- */}
                {step === 'ALERT' && (
                    <motion.div 
                        key="alert"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, x: -50 }}
                        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative"
                    >
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-6 pt-8 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-full bg-noise opacity-10 pointer-events-none"></div>
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-lg">
                                {reason === 'TRIAL_EXPIRED' ? <Lock className="text-white w-8 h-8" /> : <Crown className="text-amber-300 w-8 h-8 fill-amber-300" />}
                            </div>
                            <h2 className="text-2xl font-black text-white mb-1 tracking-tight">{alertContent.title}</h2>
                            <p className="text-blue-100 font-medium text-sm">{alertContent.subtitle}</p>

                            {reason !== 'TRIAL_EXPIRED' && (
                                <button onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white hover:bg-white/10 rounded-full p-1 transition-colors">
                                    <X size={20} />
                                </button>
                            )}
                        </div>

                        <div className="p-8 text-center">
                            <p className="text-slate-600 leading-relaxed mb-8 text-sm">
                                {alertContent.body}
                            </p>
                            <button 
                                onClick={() => setStep('PLANS')}
                                className="w-full py-4 bg-slate-900 hover:bg-indigo-600 text-white font-bold rounded-xl shadow-xl shadow-slate-900/10 flex items-center justify-center gap-2 transition-all active:scale-[0.98] group"
                            >
                                <span className="group-hover:translate-x-1 transition-transform">{alertContent.cta}</span>
                                <ArrowRight size={18} />
                            </button>
                            {reason !== 'TRIAL_EXPIRED' && (
                                <button onClick={onClose} className="mt-4 text-slate-400 text-xs font-bold hover:text-slate-600">
                                    Talvez depois
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* --- PASSO 2: VITRINE DE PLANOS (3 PLANOS) --- */}
                {step === 'PLANS' && (
                    <motion.div 
                        key="plans"
                        initial={{ opacity: 0, scale: 0.9, x: 50 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-slate-50 w-full max-w-6xl rounded-[2rem] shadow-2xl border border-white/50 relative flex flex-col lg:flex-row overflow-hidden"
                    >
                        <button onClick={onClose} className="absolute top-4 right-4 z-20 bg-slate-200/50 hover:bg-slate-300 p-2 rounded-full text-slate-500 transition-colors">
                            <X size={20} />
                        </button>

                        {/* === PLANO BASIC === */}
                        <div className="flex-1 p-6 md:p-8 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 bg-white/50">
                            <div className="flex items-center gap-2 mb-4 opacity-0">
                                {/* Espaçador para alinhar com os outros */}
                                <span className="px-3 py-1 text-xs">Space</span>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-700 mb-2">StudyTrack <span className="text-emerald-600">Basic</span></h3>
                            <p className="text-slate-400 text-xs font-medium mb-6">Acesso ilimitado ao banco de questões.</p>
                            
                            <div className="mb-6">
                                <span className="text-3xl font-black text-slate-900">R$ 14,90</span>
                                <span className="text-slate-400 font-bold text-sm">/mês</span>
                            </div>

                            <ul className="space-y-3 mb-8 flex-1">
                                <li className="flex gap-3 text-xs text-slate-600 font-bold">
                                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> Questões Ilimitadas
                                </li>
                                <li className="flex gap-3 text-xs text-slate-600 font-bold">
                                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> Acesso a todas as matérias
                                </li>
                                <li className="flex gap-3 text-xs text-slate-600 font-bold">
                                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> Histórico de Erros
                                </li>
                                <li className="flex gap-3 text-xs text-slate-400 line-through decoration-slate-300">
                                    <X size={16} className="text-slate-300 shrink-0" /> Simulados Ilimitados
                                </li>
                            </ul>

                            <button 
                                onClick={() => { setSelectedPlan('basic'); setStep('CHECKOUT'); }}
                                className="w-full py-3 bg-white border-2 border-slate-200 hover:border-emerald-500 text-slate-600 hover:text-emerald-600 font-bold rounded-xl transition-all active:scale-[0.98]"
                            >
                                Assinar Basic
                            </button>
                        </div>

                        {/* === PLANO PRO (Destaque) === */}
                        <div className="flex-1 p-6 md:p-8 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 bg-white relative z-10 shadow-xl lg:shadow-none">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Mais Popular</span>
                            </div>
                            <h3 className="text-3xl font-black text-slate-800 mb-2">StudyTrack <span className="text-blue-600">Pro</span></h3>
                            <p className="text-slate-500 text-xs font-medium mb-6">A escolha ideal para vestibulandos.</p>
                            
                            <div className="mb-6">
                                <span className="text-4xl font-black text-slate-900">R$ 29,90</span>
                                <span className="text-slate-400 font-bold text-sm">/mês</span>
                            </div>

                            <ul className="space-y-3 mb-8 flex-1">
                                <li className="flex gap-3 text-xs text-slate-700 font-bold">
                                    <CheckCircle2 size={16} className="text-blue-500 shrink-0" /> Tudo do Basic
                                </li>
                                <li className="flex gap-3 text-xs text-slate-700 font-bold">
                                    <CheckCircle2 size={16} className="text-blue-500 shrink-0" /> Simulados Ilimitados
                                </li>
                                <li className="flex gap-3 text-xs text-slate-700 font-bold">
                                    <CheckCircle2 size={16} className="text-blue-500 shrink-0" /> Cronograma Inteligente
                                </li>
                                <li className="flex gap-3 text-xs text-slate-700 font-bold">
                                    <CheckCircle2 size={16} className="text-blue-500 shrink-0" /> Sem Anúncios
                                </li>
                            </ul>

                            <button 
                                onClick={() => { setSelectedPlan('pro'); setStep('CHECKOUT'); }}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] flex justify-center items-center gap-2"
                            >
                                Assinar Pro <ArrowRight size={16} />
                            </button>
                        </div>

                        {/* === PLANO ELITE === */}
                        <div className="flex-1 p-6 md:p-8 flex flex-col bg-slate-50 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                <Crown size={120} className="text-purple-900" />
                            </div>

                            <div className="flex items-center gap-2 mb-4">
                                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                    <Zap size={10} className="fill-purple-700"/> Máxima Performance
                                </span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-2">StudyTrack <span className="text-purple-600">Elite</span></h3>
                            <p className="text-slate-500 text-xs font-medium mb-6">Inteligência Artificial avançada.</p>
                            
                            <div className="mb-6">
                                <span className="text-3xl font-black text-slate-900">R$ 49,90</span>
                                <span className="text-slate-400 font-bold text-sm">/mês</span>
                            </div>

                            <ul className="space-y-3 mb-8 flex-1 relative z-10">
                                <li className="flex gap-3 text-xs text-slate-700 font-bold">
                                    <div className="bg-purple-100 p-0.5 rounded-full"><CheckCircle2 size={14} className="text-purple-600" /></div>
                                    Tudo do Plano Pro
                                </li>
                                <li className="flex gap-3 text-xs text-slate-700 font-bold">
                                    <div className="bg-purple-100 p-0.5 rounded-full"><Zap size={14} className="text-purple-600" /></div>
                                    Tutor IA 24h
                                </li>
                                <li className="flex gap-3 text-xs text-slate-700 font-bold">
                                    <div className="bg-purple-100 p-0.5 rounded-full"><BookOpen size={14} className="text-purple-600" /></div>
                                    Correção de Redação IA
                                </li>
                            </ul>

                            <button 
                                onClick={() => { setSelectedPlan('elite'); setStep('CHECKOUT'); }}
                                className="w-full py-3 bg-slate-900 hover:bg-purple-900 text-white font-bold rounded-xl shadow-lg shadow-purple-900/20 transition-all active:scale-[0.98] relative z-10 flex justify-center items-center gap-2"
                            >
                                Assinar Elite <Crown size={16} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}