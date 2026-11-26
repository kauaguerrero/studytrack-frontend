'use client';

// Página do leitor: pede a URL assinada (15 min) ao Flask e abre o PDF com a
// camada de anotação. O pdf.js só carrega no cliente.

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { materialsFetch, type Material } from '@/lib/materials';

const PdfAnnotator = dynamic(() => import('@/components/materials/PdfAnnotator'), {
  ssr: false,
  loading: () => <div className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando leitor…</div>,
});

export function MaterialViewer({ materialId, manage = false }: { materialId: string; manage?: boolean }) {
  const { org } = useOrg();
  const back = manage ? `/partners/${org.slug}/materiais` : `/partners/${org.slug}/student/materiais`;
  const [state, setState] = useState<{ material: Material; url: string } | { error: string } | null>(null);

  useEffect(() => {
    let alive = true;
    materialsFetch<{ material: Material; url: string }>(org.slug, `/materials/${materialId}/url`)
      .then((r) => { if (alive) setState({ material: r.material, url: r.url }); })
      .catch((e) => { if (alive) setState({ error: e instanceof Error ? e.message : 'Material não encontrado.' }); });
    return () => { alive = false; };
  }, [org.slug, materialId]);

  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-6">
      <Link href={back} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-white/60">
        <ArrowLeft className="h-4 w-4" /> Material
      </Link>
      {!state ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Abrindo…</div>
      ) : 'error' in state ? (
        <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-white/5 dark:text-white/70">{state.error}</p>
      ) : (
        <>
          <h1 className="mt-2 text-xl font-black text-slate-900 dark:text-white">{state.material.title}</h1>
          {state.material.description && <p className="mt-1 whitespace-pre-line text-sm text-slate-600 dark:text-white/65">{state.material.description}</p>}
          <div className="mt-4">
            <PdfAnnotator slug={org.slug} materialId={materialId} url={state.url} title={state.material.title} />
          </div>
        </>
      )}
    </div>
  );
}
