"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// Onboarding de objetivos migrado para o WhatsApp.
// Esta página redireciona imediatamente para a coleta de telefone.
export default function OnboardingObjetivo() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/portal/onboarding/telefone');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );
}
