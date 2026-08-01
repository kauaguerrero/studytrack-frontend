'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { X, PartyPopper, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getAchievementIcon, getDifficultyStyle } from '@/lib/achievement-icons';
import { ConfettiBurst } from './ConfettiBurst';

export interface AchievementInfoModalData {
  student_achievement_id: string;
  student_name: string;
  achievement_title: string;
  achievement_description?: string | null;
  achievement_icon?: string | null;
  difficulty?: string | null;
  already_congratulated?: boolean;
  is_own: boolean;
}

interface Props {
  data: AchievementInfoModalData;
  onClose: () => void;
  /** Avisa o pai que os parabéns foram enviados, pra ele poder atualizar o item no feed sem refetch. */
  onCongratulated?: (studentAchievementId: string) => void;
}

export function AchievementInfoModal({ data, onClose, onCongratulated }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [congratulated, setCongratulated] = useState(!!data.already_congratulated);
  const [sending, setSending] = useState(false);
  const [confettiFire, setConfettiFire] = useState(0);

  const Icon = getAchievementIcon(data.achievement_icon);
  const style = getDifficultyStyle(data.difficulty);

  const handleCongratulate = async () => {
    if (sending || congratulated || data.is_own) return;
    setSending(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const api = (process.env.NEXT_PUBLIC_API_URL || 'https://studytrack-backend.fly.dev').replace(/\/$/, '');
      const res = await fetch(
        `${api}/api/partner/gamification/achievements/${data.student_achievement_id}/congratulate`,
        { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } }
      );

      if (res.ok) {
        setCongratulated(true);
        setConfettiFire((n) => n + 1);
        toast.success(`+15 XP! Você e ${data.student_name.split(' ')[0]} ganharam pontos.`);
        onCongratulated?.(data.student_achievement_id);
      } else if (res.status === 409) {
        setCongratulated(true);
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || 'Não foi possível enviar os parabéns.');
      }
    } catch {
      toast.error('Não foi possível enviar os parabéns.');
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        className="fixed inset-0 z-[9100] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      >
        <motion.div
          className={`relative w-full max-w-xs overflow-visible rounded-2xl shadow-2xl bg-white dark:bg-[#0F0F0F] border ${style.cardBorder} ${style.glow ?? ''}`}
          initial={{ y: 24, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          <ConfettiBurst key={confettiFire} fire={confettiFire} />

          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-white/40 dark:hover:text-white/70 dark:hover:bg-white/[0.06]"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-col items-center gap-3 px-6 pb-6 pt-8 text-center">
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${style.iconBg} ${style.iconText}`}>
              <Icon className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{data.achievement_title}</h3>
              {data.achievement_description && (
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500 dark:text-white/50">
                  {data.achievement_description}
                </p>
              )}
            </div>

            {data.is_own ? (
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-white/30">
                Sua conquista ✨
              </p>
            ) : congratulated ? (
              <div className="mt-1 flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-2 text-[12.5px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" /> Parabéns enviado!
              </div>
            ) : (
              <button
                onClick={handleCongratulate}
                disabled={sending}
                className="mt-1 flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-bold text-white transition-transform active:scale-95 disabled:opacity-60"
                style={{ background: 'var(--brand-primary, #F59E0B)' }}
              >
                <PartyPopper className="h-4 w-4" />
                {sending ? 'Enviando...' : 'Dê os parabéns!'}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
