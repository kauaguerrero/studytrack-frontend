'use client';

import { useEffect, useState } from 'react';
import { Mail, ShieldCheck, User, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { Button } from '@/components/ui/button';

export default function PartnerProfilePage() {
  const { org, userProfile } = useOrg();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = `/partners/${org.slug}/login`;
  }

  return (
    <PartnerLayout>
      <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 md:px-6">
        <header>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Meu Perfil</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Dados básicos da sua conta na organização.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {(userProfile.fullName || 'U').split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{userProfile.fullName}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{org.name}</p>
              </div>
            </div>
            <Button type="button" variant="outline" className="gap-2" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <Mail className="h-3.5 w-3.5" />
                Email
              </div>
              <p className="break-all text-sm font-medium text-slate-800 dark:text-slate-100">{email || '-'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Perfil
              </div>
              <p className="text-sm font-medium capitalize text-slate-800 dark:text-slate-100">{userProfile.role}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <User className="h-4 w-4" />
            Segurança
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Para alterar sua senha, use o fluxo de recuperação de senha na tela de login da organização.
          </p>
        </section>
      </main>
    </PartnerLayout>
  );
}
