'use client'

/**
 * PAGE ARCHITECTURE:
 * Atua como um Server Component Wrapper (embora seja cliente) para Data Fetching.
 * Isola o contexto de dados do contexto de UI do Editor.
 */

import { useEffect, useState, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AdaptationEditor } from '@/components/adaptation/AdaptationEditor';
import { AdaptationJob } from '@/types/adaptation';
import { FileText, AlertOctagon, RefreshCcw, ShieldCheck } from 'lucide-react';
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
        if (!data) throw new Error("Documento não localizado.");
        
        setJob(data);
      } catch (err: any) {
        console.error("Critical Error Fetching Job:", err);
        setErrorMsg(err.message || "Erro desconhecido ao carregar contexto.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    
    if (id) fetchJob();
    return () => { isMounted = false; };
  }, [id]);

  // --- INDUSTRIAL LOADER STATE ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-slate-50/50">
        <div className="flex flex-col items-center space-y-4 animate-in fade-in duration-700">
           <div className="relative">
              <div className="h-16 w-16 rounded-xl border border-slate-200 bg-white shadow-xl flex items-center justify-center">
                  <RefreshCcw className="animate-spin text-blue-600" size={24} />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                V.2.0
              </div>
           </div>
           <div className="text-center">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Carregando Ambiente</h3>
              <p className="text-xs text-slate-400 font-mono mt-1">Sincronizando estado...</p>
           </div>
        </div>
      </div>
    );
  }

  // --- ROBUST ERROR STATE ---
  if (errorMsg || !job) {
    return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-red-50/30 p-6">
            <div className="bg-white p-10 rounded-2xl shadow-2xl border border-red-100 max-w-lg w-full text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
                <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-red-50/50">
                    <AlertOctagon className="h-10 w-10 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Falha de Integridade</h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-8 font-mono bg-slate-50 p-4 rounded border border-slate-100">
                    ERR_CODE: {errorMsg}
                </p>
                <button 
                    onClick={() => router.back()}
                    className="w-full bg-slate-900 hover:bg-black text-white font-medium py-3 rounded-lg transition-all shadow-lg shadow-slate-900/20 active:scale-[0.98]"
                >
                    Retornar ao Painel
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] w-full bg-slate-100 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50 pointer-events-none" />
      
      {/* SECURITY BADGE / WATERMARK */}
      <div className="fixed bottom-4 right-6 pointer-events-none opacity-20 z-0 flex items-center gap-2">
         <ShieldCheck size={16} />
         <span className="text-[10px] font-mono font-bold uppercase">StudyTrack Secure Environment</span>
      </div>

      <AdaptationEditor 
        jobId={job.id} 
        initialData={job.final_json_data} 
        status={job.adaptation_status}
        filename={job.original_filename}
      />
    </div>
  );
}