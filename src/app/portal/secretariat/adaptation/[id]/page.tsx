'use client'

import { useEffect, useState, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AdaptationEditor } from '@/components/adaptation/AdaptationEditor';
import { AdaptationJob } from '@/types/adaptation';
import { FileText, AlertOctagon, RefreshCcw, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdaptationJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [job, setJob] = useState<AdaptationJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function fetchJob() {
      try {
        const { data, error } = await supabase
          .from('adapted_exams')
          .select('*')
          .eq('id', id)
          .single();

        if (!isMounted) return;

        if (error) throw error;
        if (!data) throw new Error("Documento não localizado no servidor seguro.");

        setJob(data);
      } catch (err: any) {
        console.error("Critical Error Fetching Job:", err);
        setErrorMsg(err.message || "Erro desconhecido ao carregar contexto de adaptação.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (id) fetchJob();
    return () => { isMounted = false; };
  }, [id]);

  // --- ARQUITETURA DE ELITE HÍBRIDA (WebSockets + Polling Fallback) ---
  useEffect(() => {
    if (!id || !job || job.adaptation_status !== 'processing') return;

    // 1. VIA EXPRESSA (WebSockets): Rápido, mas o evento cai se o JSON ultrapassar 1MB
    const channel = supabase
      .channel(`job_tracker_${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'adapted_exams',
          filter: `id=eq.${id}` // Escuta ESTRITAMENTE a linha desta prova
        },
        async (payload) => {
          const updatedJob = payload.new as AdaptationJob;

          // Quando o Python terminar (sucesso ou falha), o Supabase avisa aqui
          if (updatedJob.adaptation_status !== 'processing') {
            // Bypass Crítico: Forçamos um select para garantir o JSON completo e escapar de payload truncado
            const { data, error } = await supabase.from('adapted_exams').select('*').eq('id', id).single();
            
            if (data && !error) {
              setJob(data);
            } else {
              setJob(updatedJob); // Fallback de segurança
            }
            supabase.removeChannel(channel); // Desacopla o socket
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Radar de adaptação ativo via WebSockets (Modo Híbrido).');
        }
      });

    // 2. REDE DE SEGURANÇA (Polling): Roda a cada 5s para resgatar a UI caso o WebSocket falhe em avisar
    const fallbackInterval = setInterval(async () => {
      const { data, error } = await supabase.from('adapted_exams').select('*').eq('id', id).single();
      
      if (data && !error && data.adaptation_status !== 'processing') {
        setJob(data);
        clearInterval(fallbackInterval);
        supabase.removeChannel(channel); // Desacopla o socket se o polling vencer a corrida
      }
    }, 5000);

    // Cleanup: se o usuário sair da página antes de terminar, mata a conexão e o timer
    return () => {
      supabase.removeChannel(channel);
      clearInterval(fallbackInterval);
    };
  }, [id, job?.adaptation_status, supabase]);

  // --- INDUSTRIAL LOADER STATE ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-slate-50">
        <div className="flex flex-col items-center space-y-6 animate-in fade-in duration-700">
          <div className="relative">
            {/* Spinner Premium */}
            <div className="h-20 w-20 rounded-2xl bg-white shadow-xl border border-slate-200 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-blue-50/50 animate-pulse"></div>
              <RefreshCcw className="animate-spin text-blue-600 relative z-10" size={32} />
            </div>
            <div className="absolute -bottom-3 -right-3 bg-slate-900 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg border-2 border-white">
              V.2.0
            </div>
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">Carregando Ambiente</h3>
            <p className="text-xs text-slate-500 font-mono">Sincronizando estado da auditoria...</p>
          </div>
        </div>
      </div>
    );
  }

  // --- ERRO OU JOB NÃO ENCONTRADO (narrowing: abaixo job é non-null) ---
  if (errorMsg || !job) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-red-50/30 p-6">
        <div className="bg-white p-12 rounded-3xl shadow-2xl border border-red-100 max-w-lg w-full text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 to-red-600" />
          <div className="bg-red-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 ring-8 ring-red-50/50">
            <AlertOctagon className="h-12 w-12 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Falha de Integridade</h2>
          <p className="text-slate-500 text-sm mb-8">Não foi possível recuperar o documento solicitado.</p>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-8 text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Error Trace</span>
            <code className="text-xs font-mono text-red-600 break-all">{errorMsg}</code>
          </div>
          <button
            onClick={() => router.back()}
            className="w-full bg-slate-900 hover:bg-black text-white font-medium py-3.5 rounded-xl transition-all shadow-lg shadow-slate-900/20 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <ShieldCheck size={18} />
            Retornar ao Painel Seguro
          </button>
        </div>
      </div>
    );
  }

  // --- JOB FALHOU ---
  if (job.adaptation_status === 'failed') {
    const err = (job.final_json_data as any)?.error ?? 'Processamento falhou.';
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-red-50/30 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100 max-w-md text-center">
          <AlertOctagon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Adaptação falhou</h2>
          <p className="text-sm text-slate-600 mb-6">{err}</p>
          <button onClick={() => router.back()} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (job.adaptation_status !== 'processing' && !job.final_json_data?.questions?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-slate-50">
        <p className="text-sm text-slate-500">A prova foi processada, mas nenhuma questão pôde ser estruturada.</p>
        <button onClick={() => router.back()} className="mt-4 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black">
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] w-full bg-slate-100 overflow-hidden relative flex flex-col">
      {/* Background Pattern Sutil */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

      {/* SECURITY BADGE / WATERMARK */}
      <div className="fixed bottom-4 left-6 pointer-events-none opacity-30 z-0 flex items-center gap-2 select-none">
        <ShieldCheck size={14} className="text-slate-600" />
        <span className="text-[10px] font-mono font-bold uppercase text-slate-600 tracking-wider">StudyTrack Secure Environment • {new Date().getFullYear()}</span>
      </div>

      <div className="relative z-10 flex-1 flex flex-col h-full">
        <AdaptationEditor
          jobId={job.id}
          studentId={job.student_id ?? undefined}
          initialData={{
            ...(job.final_json_data as any || {}),
            metadata: {
              ...(job.final_json_data as any)?.metadata,
              // Injeta dados extras se necessário para a nova interface
              version: (job.final_json_data as any)?.metadata?.version || '2.0.0',
              audit_status: (job.final_json_data as any)?.metadata?.audit_report ? 'AUDITED' : 'PENDING'
            }
          }}
          status={job.adaptation_status}
          filename={job.original_filename}
        />
      </div>
    </div>
  );
}