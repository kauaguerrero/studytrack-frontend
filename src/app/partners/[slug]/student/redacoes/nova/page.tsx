'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/OrgContext';
import { Input } from '@/components/ui/input';

export default function NovaRedacaoPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { org } = useOrg();

  const [theme, setTheme] = useState('');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const charCount = text.trim().length;
  const isValidLength = charCount >= 100 && charCount <= 5000;

  const counterClass = useMemo(() => {
    if (charCount >= 4500) return 'text-amber-300';
    if (charCount >= 200 && charCount <= 5000) return 'text-emerald-300';
    return 'text-slate-400';
  }, [charCount]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isValidLength || submitting) return;

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
      const res = await fetch(`${apiUrl}/api/partners/${slug}/essays`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text: text.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Não foi possível enviar a redação.');
      }

      toast.success('Redação enviada! Você será notificado quando o professor corrigir.');
      router.push(`/partners/${slug}/student/redacoes`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar redação.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 md:px-6 md:py-8">
        <header className="space-y-2">
          <Link
            href={`/partners/${slug}/student/redacoes`}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Nova Redação</h1>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:p-6">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-200">Tema da Redação</label>
            <Input
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Digite o tema da redação"
              className="border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus-visible:ring-[var(--brand-primary)]"
            />
          </div>

          <div className="flex items-center justify-end">
            <span className={`text-sm font-medium ${counterClass}`}>
              {charCount} / 5000 caracteres
            </span>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva ou cole sua redação aqui. Mínimo 100 caracteres."
            className="min-h-[400px] w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm leading-relaxed text-slate-100 outline-none transition focus:border-[var(--brand-primary)]"
          />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">
              Sua redação será enviada para correção pelo professor. Você será notificado quando estiver pronta.
            </p>

            <button
              type="submit"
              disabled={!isValidLength || submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: org.brand_primary || 'var(--brand-primary)' }}
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Enviando...' : 'Enviar Redação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
