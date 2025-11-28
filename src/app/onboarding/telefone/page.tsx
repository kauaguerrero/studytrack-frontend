'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingTelefone() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Pegar o usuário atual para garantir
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não logado");

      // 2. Limpar o telefone (deixar apenas números)
      const cleanPhone = phone.replace(/\D/g, "");

      // 3. Chamar nosso Backend Flask
      // NOTA: Se der erro de CORS, precisaremos configurar o Flask depois.
      const response = await fetch('http://127.0.0.1:5000/api/auth/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Em produção, passaríamos o token JWT aqui
        },
        body: JSON.stringify({
          whatsapp_phone: cleanPhone
        })
      });

      if (!response.ok) throw new Error("Falha ao salvar no backend");

      // 4. Sucesso! Atualiza a página para o Dashboard detectar a mudança
      router.refresh();
      router.push('/dashboard');

    } catch (error) {
      console.error(error);
      alert("Erro ao salvar telefone. Verifique se o Backend Flask está rodando!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
            <Phone size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Quase lá!</h1>
          <p className="text-slate-500 mt-2">
            Para o StudyTrack funcionar, precisamos do seu WhatsApp para enviar as atividades.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Seu WhatsApp (com DDD)
            </label>
            <input
              type="tel"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-900 placeholder:text-slate-400"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" /> : <>Confirmar e Acessar <ArrowRight size={18} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}