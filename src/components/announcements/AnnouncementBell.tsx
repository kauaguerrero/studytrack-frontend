'use client';

import { useState, type CSSProperties } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAnnouncementNotification } from '@/contexts/AnnouncementNotificationContext';
import { AnnouncementFeedModal } from './AnnouncementModal';

export function AnnouncementBell({
  className,
  iconClassName,
  style,
  iconStyle,
}: {
  className?: string;
  iconClassName?: string;
  style?: CSSProperties;
  iconStyle?: CSSProperties;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { hasUnread } = useAnnouncementNotification();

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Novidades"
        className={cn(
          'relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-slate-100 dark:hover:bg-white/10',
          className,
        )}
        style={style}
      >
        <Bell className={cn('h-5 w-5 text-slate-500 dark:text-white/60', iconClassName)} style={iconStyle} />
        {hasUnread && (
          <span className="absolute right-[3px] top-[3px] flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
          </span>
        )}
      </button>

      <AnnouncementFeedModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
