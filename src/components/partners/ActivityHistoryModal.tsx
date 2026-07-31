'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface FeedItem {
  type: 'question' | 'simulado' | 'essay' | 'achievement';
  student_id?: string | null;
  student_name?: string | null;
  student_avatar_url?: string | null;
  subject?: string | null;
  is_correct?: boolean | null;
  total_questions?: number | null;
  status?: string | null;
  score?: number | null;
  essay_type?: string | null;
  achievement_id?: string | null;
  achievement_title?: string | null;
  achievement_icon?: string | null;
  difficulty?: string | null;
  timestamp?: string | null;
}

interface Props {
  onClose: () => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatDateLabel(ts: string): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

  if (sameDay(d, today)) return 'Hoje';
  if (sameDay(d, yesterday)) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function groupByDate(items: FeedItem[]): { label: string; items: FeedItem[] }[] {
  const groups: { label: string; items: FeedItem[] }[] = [];
  const seen = new Map<string, number>();
  for (const item of items) {
    if (!item.timestamp) continue;
    const key = new Date(item.timestamp).toDateString();
    const label = formatDateLabel(item.timestamp);
    if (!seen.has(key)) {
      seen.set(key, groups.length);
      groups.push({ label, items: [] });
    }
    groups[seen.get(key)!].items.push(item);
  }
  return groups;
}

function timeStr(ts?: string | null): string {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function ActivityRow({ item }: { item: FeedItem }) {
  const isQuestion = item.type === 'question';
  const isSimulado = item.type === 'simulado';
  const isAchievement = item.type === 'achievement';
  const peerFirstName = (item.student_name || 'Aluno').split(' ')[0];
  const verb = isQuestion
    ? 'fez uma questão de'
    : isSimulado ? 'realizou um'
    : isAchievement ? 'desbloqueou a conquista'
    : 'enviou uma';
  const actionLabel = isQuestion
    ? (item.subject || 'Questão')
    : isSimulado ? 'Simulado'
    : isAchievement ? (item.achievement_title || 'Conquista')
    : 'Redação';

  return (
    <div className="relative flex items-center h-[46px] rounded-[18px] border border-slate-200 dark:border-white/[0.12] bg-slate-50 dark:bg-white/[0.05] overflow-hidden">
      <div className="absolute left-[13px] h-[22px] w-[22px] rounded-full overflow-hidden shrink-0 ring-1 ring-white/10">
        {item.student_avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.student_avatar_url} alt={item.student_name || ''} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, var(--brand-primary) 18%, #0f0f0f)' }}
          >
            <User className="h-3.5 w-3.5" style={{ color: 'var(--brand-primary)', filter: 'drop-shadow(0 0 4px var(--brand-primary))' }} />
          </div>
        )}
      </div>
      <div className="absolute left-[43px] right-16 top-1/2 -translate-y-1/2 flex items-baseline gap-1 leading-none">
        <span className="text-[11px] text-slate-700 dark:text-white/85 whitespace-nowrap">
          {peerFirstName} {verb}
        </span>
        <span className="text-[12px] font-bold tracking-[-0.35px] truncate" style={{ color: 'var(--brand-primary)' }}>
          {actionLabel}
        </span>
      </div>
      <p className="absolute bottom-[7px] right-[12px] text-[6.8px] font-bold text-slate-400 dark:text-white/50 leading-none">
        {timeStr(item.timestamp)}
      </p>
    </div>
  );
}

export function ActivityHistoryModal({ onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const monthLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return; }
      const api = (process.env.NEXT_PUBLIC_API_URL || 'https://studytrack-backend.fly.dev').replace(/\/$/, '');
      fetch(`${api}/api/student/analytics/activity-feed?month_only=1`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then((r) => r.ok ? r.json() : [])
        .then((data) => { if (Array.isArray(data)) setFeed(data); })
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const groups = groupByDate(feed);

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        className="fixed inset-0 z-[9000] flex items-end justify-center sm:items-center"
        style={{
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          paddingTop: 'max(env(safe-area-inset-top), 1rem)',
          paddingRight: 'max(env(safe-area-inset-right), 1rem)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
          paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      >
        <motion.div
          className="w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl bg-white dark:bg-[#0F0F0F] border border-slate-200 dark:border-white/[0.08]"
          style={{ maxHeight: 'min(92dvh, 680px)' }}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/[0.08]">
            <div className="flex items-center gap-2">
              <div
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[8px]"
                style={{ background: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
              >
                <Activity className="h-2.5 w-2.5" style={{ color: 'var(--brand-primary)' }} />
              </div>
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">
                Atividades de {monthLabel}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 transition-colors text-slate-400 hover:text-slate-600 dark:text-white/40 dark:hover:text-white/70 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
              aria-label="Fechar histórico"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-4 py-3 space-y-4" style={{ maxHeight: 'min(72dvh, 560px)' }}>
            {loading ? (
              <div className="flex flex-col gap-2 py-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-[46px] rounded-[18px] bg-slate-100 dark:bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : feed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Activity className="h-8 w-8 text-slate-300 dark:text-white/20" />
                <p className="text-[12px] text-slate-400 dark:text-white/30 text-center">
                  Nenhuma atividade este mês ainda.<br />Responda questões para aparecer aqui!
                </p>
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.label} className="flex flex-col gap-2">
                  <p className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-slate-400 dark:text-white/30 capitalize">
                    {group.label}
                  </p>
                  {group.items.map((item, i) => (
                    <ActivityRow key={i} item={item} />
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 dark:border-white/[0.08] px-4 py-3">
            <p className="text-center text-[10.5px] text-slate-400 dark:text-white/30">
              Mostrando todas as atividades de {monthLabel}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
