"use client";

import Link from 'next/link';
import { Clock, CheckCircle2 } from 'lucide-react';

export default function TeacherPendingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full animate-in zoom-in duration-300">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-amber-600" />
        </div>
        
        <h1 className="text-2xl font-extrabold text-slate-900 mb-3">Solicitação Enviada!</h1>
        <p className="text-slate-500 mb-6 leading-relaxed">
            Recebemos seu cadastro. Para garantir a segurança das turmas, precisamos validar seu vínculo com a escola informada.
        </p>

        <div className="bg-slate-50 rounded-xl p-4 mb-8 text-left border border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm mb-2">Próximos passos:</h3>
            <ul className="space-y-3">
                <li className="flex gap-3 text-sm text-slate-600">
                    <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                    <span>O gestor da escola receberá um alerta.</span>
                </li>
                <li className="flex gap-3 text-sm text-slate-600">
                    <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                    <span>Você receberá um e-mail em até 24h.</span>
                </li>
                <li className="flex gap-3 text-sm text-slate-600">
                    <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                    <span>Se aprovado, seu acesso será liberado.</span>
                </li>
            </ul>
        </div>

        <Link 
            href="/auth/signout" 
            className="block w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
        >
            Voltar para o Login
        </Link>
      </div>
    </div>
  );
}