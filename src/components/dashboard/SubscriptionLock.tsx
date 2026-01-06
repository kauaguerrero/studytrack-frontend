"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, CreditCard, CheckCircle2, Loader2, ShieldCheck, 
  AlertCircle, QrCode, Copy, Sparkles, ChevronRight, Fingerprint 
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface SubscriptionLockProps {
  planTier: string;
  userName: string;
}

export function SubscriptionLock({ planTier, userName }: SubscriptionLockProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'CREDIT_CARD' | 'PIX'>('PIX');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // PIX States
  const [pixData, setPixData] = useState<{ encodedImage: string; payload: string; paymentId: string } | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    cpf: '',
    cardNumber: '',
    holderName: '',
    expiry: '',
    ccv: '',
    postalCode: '',
    addressNumber: ''
  });

  // Cores dinâmicas por plano - AGORA COM BASIC
  const getGradient = () => {
    switch(planTier) {
        case 'basic': return 'from-emerald-600 to-teal-600'; // Cor do Basic
        case 'pro': return 'from-blue-600 to-indigo-600';
        case 'elite': return 'from-violet-600 to-fuchsia-700';
        default: return 'from-slate-700 to-slate-900';
    }
  };

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Máscaras de Input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let v = value;

    if (name === 'cpf') {
        v = v.replace(/\D/g, '').slice(0, 11)
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    else if (name === 'cardNumber') {
        v = v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
    }
    else if (name === 'expiry') {
        v = v.replace(/\D/g, '').slice(0, 6);
        if (v.length >= 3) v = `${v.slice(0, 2)}/${v.slice(2, 6)}`;
    }
    else if (name === 'postalCode') {
        v = v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
    }
    else if (name === 'holderName') {
        v = v.toUpperCase();
    }

    setFormData(prev => ({ ...prev, [name]: v }));
  };

  const handleCreditCardPayment = async () => {
    setError('');
    // Validação básica visual
    if (formData.cpf.length < 14 || formData.cardNumber.length < 16 || !formData.ccv || !formData.holderName) {
      setError("Por favor, preencha todos os campos corretamente.");
      return;
    }

    setLoading(true);
    
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada.");

      const [expMonth, expYear] = formData.expiry.split('/');
      
      // Envia o planTier correto (basic/pro/elite)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/subscribe-cc`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            cpf: formData.cpf,
            plan: planTier, // ENVIA O PLANO
            creditCard: {
                holderName: formData.holderName,
                number: formData.cardNumber.replace(/\s/g, ''),
                expiryMonth: expMonth,
                expiryYear: expYear,
                ccv: formData.ccv
            },
            creditCardHolderInfo: {
                name: formData.holderName,
                postalCode: formData.postalCode.replace('-', ''),
                addressNumber: formData.addressNumber || "0"
            }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Pagamento recusado.");
      
      setSuccess(true);
      setTimeout(() => window.location.reload(), 2500);

    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleGeneratePix = async () => {
      if (formData.cpf.length < 14) {
          setError("CPF é obrigatório para a nota fiscal.");
          return;
      }
      setLoading(true);
      setError('');

      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sessão inválida");

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/subscribe-pix`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                cpf: formData.cpf,
                plan: planTier // ENVIA O PLANO
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao gerar Pix.");

        setPixData(data);
        setLoading(false);
        startPolling(data.paymentId, session.access_token);

      } catch (err: any) {
          setError(err.message);
          setLoading(false);
      }
  };

  const startPolling = (paymentId: string, token: string) => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(async () => {
          try {
             const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/check-payment-status/${paymentId}`, {
                 headers: { 'Authorization': `Bearer ${token}` }
             });
             const data = await res.json();
             if (data.paid && data.status === 'CONFIRMED') {
                 if (pollingRef.current) clearInterval(pollingRef.current);
                 setSuccess(true);
                 setTimeout(() => window.location.reload(), 2500);
             }
          } catch (e) { console.error("Polling...", e); }
      }, 3000);
  };

  const copyPix = () => {
      if (pixData?.payload) {
          navigator.clipboard.writeText(pixData.payload);
      }
  };

  if (success) {
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-xl p-4">
            <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white w-full max-w-sm rounded-[2rem] p-8 text-center shadow-2xl relative overflow-hidden"
            >
                <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${getGradient()}`}></div>
                <motion.div 
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
                    className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-green-100"
                >
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                </motion.div>
                <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Sucesso!</h2>
                <p className="text-slate-500 font-medium mb-8">
                    Bem-vindo à StudyTrack, {userName}.<br/>Seu acesso foi liberado.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-400 bg-slate-50 py-3 rounded-xl animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    Entrando no painel...
                </div>
            </motion.div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-lg p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        className="bg-white w-full max-w-[480px] rounded-[2rem] shadow-2xl shadow-black/20 relative my-auto border border-white/20 flex flex-col overflow-hidden"
      >
        <div className={`bg-gradient-to-br ${getGradient()} p-8 pt-10 text-white relative overflow-hidden`}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-full bg-noise opacity-10 pointer-events-none"></div>

            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 mb-2 opacity-90">
                        <Lock size={14} /> 
                        <span className="text-xs font-bold tracking-widest uppercase">Checkout Seguro</span>
                    </div>
                    <h2 className="text-3xl font-black tracking-tight mb-1">Desbloquear {planTier}</h2>
                    <p className="text-white/80 text-sm font-medium">Complete sua assinatura para continuar.</p>
                </div>
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg border border-white/10">
                    <Fingerprint className="w-6 h-6 text-white" />
                </div>
            </div>
        </div>

        <div className="p-6 sm:p-8 bg-white relative z-20 flex-1">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8 relative">
                {['PIX', 'CREDIT_CARD'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => { setActiveTab(tab as any); setPixData(null); setError(''); }}
                        className={`flex-1 relative z-10 py-3 text-xs sm:text-sm font-bold transition-colors duration-200 flex items-center justify-center gap-2 ${activeTab === tab ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {activeTab === tab && (
                            <motion.div 
                                layoutId="activeTab"
                                className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/50"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                            {tab === 'PIX' ? <QrCode size={16}/> : <CreditCard size={16}/>}
                            {tab === 'PIX' ? 'PIX Instantâneo' : 'Cartão de Crédito'}
                        </span>
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {error && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="mb-4 bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-xs font-bold flex items-center gap-3"
                    >
                        <AlertCircle size={16} />
                        {error}
                    </motion.div>
                )}

                {activeTab === 'PIX' ? (
                    <motion.div 
                        key="pix"
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6"
                    >
                        {!pixData ? (
                            <>
                                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex gap-3 items-center">
                                    <div className="bg-white p-2 rounded-full text-emerald-600 shadow-sm">
                                        <Sparkles size={16} />
                                    </div>
                                    <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                                        Liberação automática em segundos.<br/>
                                        Sem limite de cartão.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">CPF (Obrigatório)</label>
                                    <input 
                                        name="cpf" value={formData.cpf} onChange={handleInputChange} 
                                        placeholder="000.000.000-00"
                                        className="w-full h-14 px-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                                    />
                                </div>
                                <button 
                                    onClick={handleGeneratePix} disabled={loading}
                                    className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                >
                                    {loading ? <Loader2 className="animate-spin"/> : <>Gerar QR Code <ChevronRight size={18}/></>}
                                </button>
                            </>
                        ) : (
                            <div className="text-center space-y-6">
                                <div className="inline-block p-1 bg-gradient-to-tr from-slate-200 to-slate-100 rounded-[1.5rem] shadow-inner">
                                    <div className="bg-white p-4 rounded-[1.3rem]">
                                        <img src={`data:image/png;base64,${pixData.encodedImage}`} alt="Pix" className="w-40 h-40 object-contain mix-blend-multiply opacity-90"/>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <input readOnly value={pixData.payload} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs text-slate-500 font-mono truncate outline-none" />
                                    <button onClick={copyPix} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-slate-700 transition-colors"><Copy size={16}/></button>
                                </div>
                                <div className="flex justify-center items-center gap-2 text-xs font-bold text-blue-600 animate-pulse">
                                    <Loader2 size={14} className="animate-spin"/> Aguardando banco...
                                </div>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div 
                        key="card"
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                    >
                         <div className="space-y-4">
                            <div className="space-y-1.5 relative">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Número do Cartão</label>
                                <div className="relative">
                                    <input 
                                        name="cardNumber" value={formData.cardNumber} onChange={handleInputChange} 
                                        placeholder="0000 0000 0000 0000"
                                        className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm focus:bg-white focus:border-blue-500 transition-all outline-none shadow-sm"
                                    />
                                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Validade</label>
                                    <input name="expiry" value={formData.expiry} onChange={handleInputChange} placeholder="MM/AAAA" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm focus:bg-white focus:border-blue-500 transition-all outline-none" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">CVV</label>
                                    <input name="ccv" value={formData.ccv} onChange={handleInputChange} placeholder="123" maxLength={4} className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm focus:bg-white focus:border-blue-500 transition-all outline-none" />
                                </div>
                            </div>
                            
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nome no Cartão</label>
                                <input name="holderName" value={formData.holderName} onChange={handleInputChange} placeholder="NOME IMPRESSO" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold uppercase focus:bg-white focus:border-blue-500 transition-all outline-none" />
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">CPF</label>
                                    <input name="cpf" value={formData.cpf} onChange={handleInputChange} placeholder="000..." className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:border-blue-500 outline-none" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">CEP</label>
                                    <input name="postalCode" value={formData.postalCode} onChange={handleInputChange} placeholder="00000..." className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:border-blue-500 outline-none" />
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleCreditCardPayment} disabled={loading}
                            className="w-full h-14 mt-2 bg-slate-900 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        >
                            {loading ? <Loader2 className="animate-spin"/> : "Confirmar Assinatura"}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <div className="mt-8 flex items-center justify-center gap-2 opacity-50">
                <ShieldCheck size={12} className="text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ambiente Seguro 256-bit</span>
            </div>

        </div>
      </motion.div>
    </div>
  );
}