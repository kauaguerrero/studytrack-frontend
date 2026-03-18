"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, Star, Loader2, Zap, BookOpen,
  BarChart3, Brain, PenTool, Lock, ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SubscriptionLock } from "@/components/dashboard/SubscriptionLock";
import { motion } from "framer-motion";

const PLANS = [
  {
    id: "basic",
    name: "Básico",
    price: "R$ 14,90",
    period: "/mês",
    description: "Para quem está começando a entender que precisa de direção.",
    cta: "Começar com o Básico",
    highlight: false,
    disabled: false,
    badge: null as string | null,
    features: [
      { icon: CheckCircle2, text: "Missão diária no WhatsApp" },
      { icon: BookOpen,     text: "Banco de questões" },
      { icon: BarChart3,    text: "Cronograma automático" },
    ],
  },
  {
    id: "pro",
    name: "Pro Aprovação",
    price: "R$ 29,90",
    period: "/mês",
    description: "Para quem quer passar. O sistema completo que não quebra — nem nos dias ruins.",
    cta: "Ativar meu plano Pro",
    highlight: true,
    disabled: false,
    badge: "Mais Escolhido",
    features: [
      { icon: CheckCircle2, text: "Tudo do Básico" },
      { icon: Zap,          text: "Simulados completos" },
      { icon: Brain,        text: "Tutor de Exatas passo a passo" },
    ],
  },
  {
    id: "elite",
    name: "Redação Master",
    price: "R$ 49,90",
    period: "/mês",
    description: "Para quem quer dominar o que mais assusta.",
    cta: "Em breve",
    highlight: false,
    disabled: true,
    badge: "Em breve",
    features: [
      { icon: CheckCircle2, text: "Tudo do Pro" },
      { icon: PenTool,      text: "Correção ilimitada de redações" },
      { icon: CheckCircle2, text: "Feedback por competência" },
    ],
  },
];

export default function PlanosPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [userName, setUserName] = useState("Estudante");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/auth/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, subscription_status")
        .eq("id", session.user.id)
        .single();

      // Já tem assinatura ativa → não precisa estar aqui
      if (profile?.subscription_status === "active") {
        router.replace("/portal/student/dashboard");
        return;
      }

      setUserName(profile?.full_name?.split(" ")[0] || "Estudante");
      setLoading(false);
    };
    init();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F4F8]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      {selectedPlan && (
        <SubscriptionLock
          planTier={selectedPlan}
          userName={userName}
          onClose={() => setSelectedPlan(null)}
        />
      )}

      <div className="min-h-screen bg-[#F0F4F8] font-sans pb-20">
        {/* Header minimalista — sem distrações numa página de conversão */}
        <div className="bg-white border-b border-slate-100 px-4 py-5 text-center">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Escolha seu plano</h1>
          <p className="text-slate-400 text-sm mt-1">Sem fidelidade · Cancele quando quiser</p>
        </div>

        <div className="max-w-3xl mx-auto px-4 mt-8">

          {/* Banner contextual — trial expirado */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 mb-8"
          >
            <Lock size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-900">Seu período de teste encerrou</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Tudo que você construiu nesses 3 dias está salvo. Escolha um plano para continuar evoluindo.
              </p>
            </div>
          </motion.div>

          {/* Cards de planos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`relative flex flex-col rounded-[1.5rem] border overflow-hidden ${
                  plan.highlight
                    ? "bg-gradient-to-b from-blue-600 to-indigo-700 border-blue-400/40 shadow-2xl shadow-blue-900/30"
                    : plan.disabled
                    ? "bg-white border-slate-200 opacity-60"
                    : "bg-white border-slate-200 shadow-sm"
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div
                    className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${
                      plan.badge === "Mais Escolhido" ? "text-white" : "bg-slate-200 text-slate-500"
                    }`}
                    style={plan.badge === "Mais Escolhido" ? { background: "linear-gradient(135deg, #F97316, #EF4444)" } : {}}
                  >
                    {plan.badge === "Mais Escolhido" && (
                      <Star className="inline w-3 h-3 mr-1 fill-white -mt-0.5" />
                    )}
                    {plan.badge}
                  </div>
                )}

                <div className="p-7 pt-9 flex flex-col h-full">
                  {/* Nome e preço */}
                  <h3 className={`text-sm font-bold mb-1 ${
                    plan.highlight ? "text-blue-100" : plan.disabled ? "text-slate-400" : "text-slate-500"
                  }`}>
                    {plan.name}
                  </h3>
                  <div className="flex items-end gap-1 mb-3">
                    <span className={`text-4xl font-black tracking-tight ${
                      plan.highlight ? "text-white" : plan.disabled ? "text-slate-300" : "text-slate-900"
                    }`}>
                      {plan.price}
                    </span>
                    <span className={`text-xs mb-1.5 ${plan.highlight ? "text-blue-200" : "text-slate-400"}`}>
                      {plan.period}
                    </span>
                  </div>
                  <p className={`text-xs leading-relaxed mb-6 flex-1 ${
                    plan.highlight ? "text-blue-100/80" : "text-slate-500"
                  }`}>
                    {plan.description}
                  </p>

                  {/* CTA */}
                  <button
                    onClick={() => !plan.disabled && setSelectedPlan(plan.id)}
                    disabled={plan.disabled}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] ${
                      plan.disabled
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : plan.highlight
                        ? "bg-white text-blue-700 hover:bg-blue-50 shadow-md"
                        : "bg-slate-900 text-white hover:bg-blue-700"
                    }`}
                  >
                    {plan.cta}
                  </button>

                  {/* Features */}
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feat, j) => (
                      <li key={j} className={`flex items-center gap-2 text-xs font-medium ${
                        plan.highlight ? "text-white" : plan.disabled ? "text-slate-400" : "text-slate-700"
                      }`}>
                        <feat.icon size={14} className={
                          plan.highlight ? "text-blue-300 shrink-0" :
                          plan.disabled  ? "text-slate-300 shrink-0" : "text-emerald-500 shrink-0"
                        } />
                        {feat.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Sinais de confiança */}
          <div className="mt-10 text-center space-y-2">
            <p className="text-xs text-slate-400 flex items-center justify-center gap-2">
              <ShieldCheck size={14} className="text-emerald-500" />
              Pagamento seguro 256-bit · Sem fidelidade · Suporte via WhatsApp
            </p>
            <p className="text-xs text-slate-400 italic">
              O ENEM é a maior ferramenta de mobilidade social do Brasil. A StudyTrack foi construída com esse princípio.
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
