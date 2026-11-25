'use client';

// Timer de estudo (plano Cenas, fase 8) — cliente de /api/partners/<slug>/timer.
// O widget flutuante e a tela do timer usam o mesmo hook; quem muda o timer
// avisa os outros pelo evento `studytimer:changed`.

import { useCallback, useEffect, useRef, useState } from 'react';
import { classesFetch } from '@/lib/org-classes';

export interface StudyTimer {
  id: string;
  subject: string;
  discipline: string | null;
  plan_item_id: string | null;
  status: 'running' | 'paused' | 'finished' | 'discarded';
  started_at: string;
  auto_paused: boolean;
  ended_at: string | null;
  elapsed_seconds: number;
}

export interface TimerReport {
  from: string;
  to: string;
  total_seconds: number;
  sessions: number;
  by_subject: { subject: string; seconds: number; sessions: number; disciplines: { discipline: string; seconds: number }[] }[];
  by_day: { date: string; seconds: number }[];
}

export interface OrgTimerReport {
  from: string;
  to: string;
  total_seconds: number;
  active_students: number;
  avg_seconds_active: number;
  by_subject: TimerReport['by_subject'];
  students: { user_id: string; name: string | null; seconds: number; sessions: number; last_at: string | null;
    subjects: { subject: string; seconds: number }[] }[];
}

export const timerFetch = classesFetch;
export const TIMER_EVENT = 'studytimer:changed';

/** 3725 → "1:02:05"; 125 → "02:05". */
export function formatClock(total: number): string {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${String(m).padStart(2, '0')}:${ss}`;
}

/** 5400 → "1h30"; 600 → "10min"; 0 → "0min". */
export function formatDuration(total: number): string {
  const m = Math.round(Math.max(0, total) / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`;
}

export function broadcastTimer() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(TIMER_EVENT));
}

/** Timer aberto do aluno, com relógio local entre as leituras do servidor. */
export function useStudyTimer(slug: string, enabled = true) {
  const [timer, setTimer] = useState<StudyTimer | null>(null);
  const [todaySeconds, setTodaySeconds] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const fetchedAt = useRef(Date.now());

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const r = await timerFetch<{ timer: StudyTimer | null; today_seconds: number }>(slug, '/timer');
      fetchedAt.current = Date.now();
      setTimer(r.timer);
      setTodaySeconds(r.today_seconds ?? 0);
    } catch {
      /* módulo desligado ou rede: o widget só não aparece */
    } finally {
      setLoaded(true);
    }
  }, [slug, enabled]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const onChange = () => void refresh();
    window.addEventListener(TIMER_EVENT, onChange);
    window.addEventListener('focus', onChange);
    const poll = window.setInterval(onChange, 60_000);
    return () => {
      window.removeEventListener(TIMER_EVENT, onChange);
      window.removeEventListener('focus', onChange);
      window.clearInterval(poll);
    };
  }, [enabled, refresh]);

  const running = timer?.status === 'running';
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [running]);

  const seconds = timer
    ? timer.elapsed_seconds + (running ? Math.max(0, Math.floor((now - fetchedAt.current) / 1000)) : 0)
    : 0;

  const act = useCallback(async (path: string, body?: object) => {
    const r = await timerFetch<{ timer: StudyTimer | null; logged_minutes?: number }>(slug, `/timer${path}`, {
      method: 'POST', body: JSON.stringify(body ?? {}),
    });
    fetchedAt.current = Date.now();
    setNow(Date.now());
    const open = r.timer && (r.timer.status === 'running' || r.timer.status === 'paused') ? r.timer : null;
    setTimer(open);
    broadcastTimer();
    return r;
  }, [slug]);

  return {
    timer, seconds, todaySeconds, loaded, refresh,
    start: (subject: string, discipline?: string | null, planItemId?: string | null) =>
      act('/start', { subject, discipline: discipline || undefined, plan_item_id: planItemId || undefined }),
    pause: () => act('/pause'),
    resume: () => act('/resume'),
    stop: (note?: string) => act('/stop', { note: note || undefined }),
    discard: () => act('/discard'),
  };
}
