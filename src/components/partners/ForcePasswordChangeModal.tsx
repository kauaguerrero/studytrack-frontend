'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface ForcePasswordChangeModalProps {
  onSuccess: () => void;
}

export function ForcePasswordChangeModal({ onSuccess }: ForcePasswordChangeModalProps) {
  const params = useParams<{ slug?: string }>();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }

      const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
      const res = await fetch(`${api}/api/account/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ new_password: newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Erro ao trocar a senha.');
        return;
      }

      toast.success('Senha atualizada. Faça login novamente com a nova senha.');
      onSuccess();
      await supabase.auth.signOut();
      const loginUrl = slug
        ? `/partners/${slug}/login?password_changed=1`
        : '/auth/login?password_changed=1';
      window.location.replace(loginUrl);
    } catch {
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const strength =
    newPassword.length === 0 ? null :
    newPassword.length < 8   ? 'fraca' :
    newPassword.length < 12 && !/[^a-zA-Z0-9]/.test(newPassword) ? 'média' :
    'forte';

  const strengthColor =
    strength === 'fraca' ? 'bg-rose-500' :
    strength === 'média' ? 'bg-amber-400' :
    strength === 'forte' ? 'bg-emerald-500' : '';

  const strengthWidth =
    strength === 'fraca' ? 'w-1/3' :
    strength === 'média' ? 'w-2/3' :
    strength === 'forte' ? 'w-full' : 'w-0';

  return (
    /* Overlay bloqueante — sem fechar ao clicar fora, sem ESC.
       z-[9999] é INTENCIONALMENTE o mais alto de toda a área do aluno — nada
       (incluindo os popups de gamificação em z-[9500]) pode aparecer por
       cima de um gate de segurança obrigatório. Não reutilize 9999 em outro
       popup: foi exatamente essa colisão (dois popups no mesmo z) que causou
       um bug real de sobreposição com o check-in de onboarding — ver
       PopupQueueContext.tsx e o restante da fila, todos em z-[9500]. */
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden">

        {/* Header */}
        <div
          className="px-6 py-5 flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' }}
        >
          <div className="p-2 bg-white/20 rounded-xl">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Defina sua senha</h2>
            <p className="text-xs text-white/70">
              Por segurança, troque a senha antes de continuar.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nova senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type={showNew ? 'text' : 'password'}
                placeholder="Mínimo 8 caracteres"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="pl-9 pr-10 text-sm"
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {/* Barra de força da senha */}
            {newPassword.length > 0 && (
              <div className="space-y-1">
                <div className="h-1 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strengthWidth} ${strengthColor}`}
                  />
                </div>
                <p className={`text-[10px] font-semibold
                  ${strength === 'fraca' ? 'text-rose-500' : ''}
                  ${strength === 'média' ? 'text-amber-500' : ''}
                  ${strength === 'forte' ? 'text-emerald-600' : ''}
                `}>
                  Senha {strength}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Confirme a nova senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className={`pl-9 pr-10 text-sm ${
                  confirmPassword && confirmPassword !== newPassword
                    ? 'border-rose-400 focus-visible:ring-rose-400'
                    : ''
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-[10px] text-rose-500 font-medium">As senhas não coincidem.</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full text-white font-bold"
            style={{ backgroundColor: 'var(--brand-primary)' }}
            disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
          >
            {loading ? 'Salvando...' : 'Salvar senha e fazer login'}
          </Button>
        </form>
      </div>
    </div>
  );
}
