'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Shield, Mail, LogOut, User } from 'lucide-react';
import Image from 'next/image';

interface AdminProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string | null;
}

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .eq('id', user.id)
        .single();
      setProfile({
        id: user.id,
        full_name: data?.full_name ?? null,
        email: user.email ?? null,
        avatar_url: data?.avatar_url ?? null,
        role: data?.role ?? null,
      });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 p-6 md:p-10">
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Meu Perfil</h1>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/[0.06] rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="p-6 flex items-center gap-4 border-b border-slate-100 dark:border-white/[0.06]">
            <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center">
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt="Avatar"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-white">{initials}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                {profile?.full_name ?? 'Sem nome'}
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/15 px-2 py-0.5 rounded-full mt-1">
                <Shield className="w-3 h-3" />
                Admin
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400 dark:text-zinc-500 mb-0.5">Email</p>
                <p className="text-sm text-slate-900 dark:text-white truncate">{profile?.email ?? '—'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mb-0.5">ID</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono truncate">{profile?.id}</p>
              </div>
            </div>
          </div>

          {/* Sign out */}
          <div className="px-6 pb-6">
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair da conta
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
