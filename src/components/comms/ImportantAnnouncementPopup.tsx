'use client';

// Pop-up de aviso importante (fase 9): fica na fila de popups (z-[9500]) até o
// aluno tocar "Entendi" — aí grava acknowledged_at e não volta mais.

import { motion } from 'framer-motion';
import { ExternalLink, Megaphone } from 'lucide-react';

export interface ImportantAnnouncement {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  link_url: string | null;
  source: 'school' | 'platform';
}

export function ImportantAnnouncementPopup({ announcement, organizationName, busy, onAcknowledge }: {
  announcement: ImportantAnnouncement;
  organizationName: string;
  busy?: boolean;
  onAcknowledge: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9500] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" style={{ backdropFilter: 'blur(6px)' }}>
      <motion.div role="alertdialog" aria-modal="true" aria-labelledby="important-ann-title"
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.25 }}
        className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl dark:bg-slate-900">
        <div className="h-1.5 w-full" style={{ background: 'var(--brand-primary)' }} />
        {announcement.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={announcement.image_url} alt="" className="max-h-56 w-full object-cover" />
        )}
        <div className="p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            <Megaphone className="h-3.5 w-3.5" /> Aviso importante · {announcement.source === 'school' ? organizationName : 'StudyTrack'}
          </p>
          <h2 id="important-ann-title" className="mt-2 text-xl font-black text-slate-900 dark:text-white">{announcement.title}</h2>
          <p className="mt-2 max-h-[40vh] overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-white/75">{announcement.body}</p>
          {announcement.link_url && (
            <a href={announcement.link_url} target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--brand-primary)' }}>
              Saiba mais <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <button type="button" disabled={busy} onClick={onAcknowledge}
            className="mt-5 w-full rounded-2xl py-3 text-sm font-black text-white disabled:opacity-60" style={{ background: 'var(--brand-primary)' }}>
            Entendi
          </button>
        </div>
      </motion.div>
    </div>
  );
}
