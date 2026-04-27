'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/OrgContext';
import { cn } from '@/lib/utils';
import { BookOpen, CheckCircle2, Play, ChevronDown, NotebookPen } from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface VideoLesson {
  id: string;
  title: string;
  description: string | null;
  embed_url: string | null;
  duration_secs: number | null;
  status: string;
  watched_pct: number;
  completed: boolean;
}

interface VideoModule {
  id: string;
  title: string;
  description: string | null;
  lessons: VideoLesson[];
  progress: { total: number; completed: number; pct: number };
}

interface LessonNote {
  id: string;
  text: string;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(secs: number | null): string {
  if (!secs) return '';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function StudentAulasPage() {
  const { slug } = useParams<{ slug: string }>();
  const { org } = useOrg();
  const videoToolEnabled = org.permissions?.video_lessons_enabled === true;

  const [modules, setModules] = useState<VideoModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<VideoLesson | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [lessonNotes, setLessonNotes] = useState<Record<string, LessonNote[]>>({});
  const [newNote, setNewNote] = useState('');
  const [notesOpen, setNotesOpen] = useState(true);
  const [liveLessonProgress, setLiveLessonProgress] = useState(0);

  const lastSavedPctRef = useRef<Record<string, number>>({});
  const notesStorageKey = `studytrack:video-lesson-notes:${slug}`;

  function persistLessonNotes(next: Record<string, LessonNote[]>) {
    setLessonNotes(next);
    try {
      window.localStorage.setItem(notesStorageKey, JSON.stringify(next));
    } catch {
      // no-op
    }
  }

  // ── Fetch módulos ──────────────────────────────────────────────────────────

  async function loadModules() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';
      const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000';
      const res = await fetch(`${api}/api/partners/${slug}/videos/modules`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      const mods: VideoModule[] = data.modules ?? [];
      setModules(mods);
      if (mods.length > 0) {
        setExpandedModules(new Set([mods[0].id]));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!videoToolEnabled) return;
    loadModules();
  }, [slug, videoToolEnabled]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(notesStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, LessonNote[]>;
      if (parsed && typeof parsed === 'object') {
        setLessonNotes(parsed);
      }
    } catch {
      // no-op
    }
  }, [notesStorageKey]);

  useEffect(() => {
    setNewNote('');
    setNotesOpen(true);
    setLiveLessonProgress(activeLesson?.watched_pct ?? 0);
  }, [activeLesson?.id]);

  // ── Salvar progresso ───────────────────────────────────────────────────────

  async function saveProgress(lessonId: string, pct: number) {
    const last = lastSavedPctRef.current[lessonId] ?? -1;
    // Só envia se o progresso avançou pelo menos 5% ou chegou a >= 80
    if (pct < last + 5 && pct < 80) return;
    lastSavedPctRef.current[lessonId] = pct;

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? '';
    const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000';
    const res = await fetch(`${api}/api/partners/${slug}/videos/lessons/${lessonId}/progress`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ watched_pct: pct }),
    });

    if (!res.ok) return;
    const { watched_pct, completed } = await res.json();
    const safePct = Math.max(0, Math.min(100, Number(watched_pct) || pct));

    setModules((prev) =>
      prev.map((m) => {
        const nextLessons = m.lessons.map((l) => {
          if (l.id !== lessonId) return l;
          return {
            ...l,
            watched_pct: Math.max(l.watched_pct || 0, safePct),
            completed: Boolean(l.completed || completed),
          };
        });
        const completedCount = nextLessons.filter((l) => l.completed).length;
        return {
          ...m,
          lessons: nextLessons,
          progress: {
            ...m.progress,
            completed: completedCount,
            pct: m.progress.total > 0 ? Math.round((completedCount / m.progress.total) * 100) : 0,
          },
        };
      })
    );
    setActiveLesson((prev) => {
      if (!prev || prev.id !== lessonId) return prev;
      return {
        ...prev,
        watched_pct: Math.max(prev.watched_pct || 0, safePct),
        completed: Boolean(prev.completed || completed),
      };
    });
  }

  // ── postMessage do player Bunny ────────────────────────────────────────────

  useEffect(() => {
    if (!activeLesson) return;

    function onMessage(event: MessageEvent) {
      if (!event.data || typeof event.data !== 'object') return;
      const { event: evtName, currentTime, duration } = event.data as {
        event?: string;
        currentTime?: number;
        duration?: number;
      };
      if (evtName === 'timeupdate' && duration && currentTime && activeLesson) {
        const pct = Math.round((currentTime / duration) * 100);
        setLiveLessonProgress((prev) => Math.max(prev, pct));
        saveProgress(activeLesson.id, pct);
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLesson?.id]);

  function handleCreateNote() {
    const lessonId = activeLesson?.id;
    const text = newNote.trim();
    if (!lessonId || !text) return;

    const note: LessonNote = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      created_at: new Date().toISOString(),
    };

    const next = {
      ...lessonNotes,
      [lessonId]: [note, ...(lessonNotes[lessonId] ?? [])],
    };
    persistLessonNotes(next);
    setNewNote('');
  }

  const totalLessons = modules.reduce((acc, m) => acc + m.progress.total, 0);
  const completedLessons = modules.reduce((acc, m) => acc + m.progress.completed, 0);
  const overallProgressPct = totalLessons > 0
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;
  const activeLessonProgress = activeLesson
    ? modules
      .flatMap((m) => m.lessons)
      .find((l) => l.id === activeLesson.id)?.watched_pct ?? activeLesson.watched_pct ?? 0
    : 0;
  const completionThreshold = 80;
  const visibleActiveLessonProgress = activeLesson?.completed
    ? 100
    : Math.max(activeLessonProgress, liveLessonProgress);

  // ── JSX ───────────────────────────────────────────────────────────────────

  if (!videoToolEnabled) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-6 md:py-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 text-center dark:border-amber-500/30 dark:bg-amber-500/10">
          <h1 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
            Essa função não está habilitada em sua organização
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Procure o founder ou o administrador da plataforma para habilitar videoaulas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      <div className="flex items-center gap-3">
        <BookOpen className="h-5 w-5 shrink-0" style={{ color: 'var(--brand-primary)' }} />
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Aulas</h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((k) => (
            <div key={k} className="h-16 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : modules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
          <Play className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhuma aula disponível ainda.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Seu progresso em aulas
                </p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                  {overallProgressPct}%
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {completedLessons} de {totalLessons} aulas concluídas
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 dark:text-slate-400">Meta de conclusão</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  80% por aula
                </p>
              </div>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${overallProgressPct}%`, backgroundColor: 'var(--brand-primary)' }}
              />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">

            {/* ── Sidebar: lista de módulos e aulas ───────────────────────── */}
            <div className="space-y-3 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1">
              {modules.map((module) => {
                const isExpanded = expandedModules.has(module.id);
                return (
                  <div
                    key={module.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                  >
                    {/* Cabeçalho do módulo */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedModules((prev) => {
                          const next = new Set(prev);
                          isExpanded ? next.delete(module.id) : next.add(module.id);
                          return next;
                        })
                      }
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {module.title}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${module.progress.pct}%`,
                                backgroundColor: 'var(--brand-primary)',
                              }}
                            />
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {module.progress.completed}/{module.progress.total}
                          </span>
                        </div>
                      </div>
                      <ChevronDown
                        className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200"
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      />
                    </button>

                    {/* Aulas do módulo */}
                    <div
                      className="overflow-hidden transition-all duration-300"
                      style={{ maxHeight: isExpanded ? '9999px' : '0px' }}
                    >
                      <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                        {module.lessons.map((lesson) => (
                          <button
                            key={lesson.id}
                            type="button"
                            onClick={() => {
                              setActiveLesson(lesson);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={cn(
                              'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                              activeLesson?.id === lesson.id
                                ? 'bg-[var(--brand-primary)]/10'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            )}
                          >
                            <div
                              className={cn(
                                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                                lesson.completed
                                  ? 'bg-emerald-100 dark:bg-emerald-500/20'
                                  : 'bg-slate-100 dark:bg-slate-800'
                              )}
                            >
                              {lesson.completed ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Play className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p
                                className={cn(
                                  'truncate text-xs font-semibold',
                                  activeLesson?.id === lesson.id
                                    ? 'text-[var(--brand-primary)]'
                                    : 'text-slate-700 dark:text-slate-300'
                                )}
                              >
                                {lesson.title}
                              </p>
                              <div className="mt-0.5 flex items-center gap-2">
                                {lesson.duration_secs && (
                                  <p className="text-[10px] text-slate-400">
                                    {formatDuration(lesson.duration_secs)}
                                  </p>
                                )}
                                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                  {lesson.completed ? '100%' : `${lesson.watched_pct || 0}%`}
                                </p>
                              </div>
                            </div>
                            {/* Mini barra de progresso parcial */}
                            {lesson.watched_pct > 0 && !lesson.completed && (
                              <div className="h-1 w-8 shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${lesson.watched_pct}%`,
                                    backgroundColor: 'var(--brand-primary)',
                                  }}
                                />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Player ───────────────────────────────────────────────────── */}
            <div className="space-y-4">
              {activeLesson ? (
                <>
                  {/* Vídeo */}
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black dark:border-slate-800">
                    <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                      <iframe
                        key={activeLesson.id}
                        src={`${activeLesson.embed_url}?autoplay=true&loop=false&muted=false&preload=true&responsive=true`}
                        className="absolute inset-0 h-full w-full"
                        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>

                  {/* Info da aula */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {activeLesson.title}
                      </h2>
                      {activeLesson.completed && (
                        <div className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          Concluída
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <div
                        className={cn(
                          'mb-2 rounded-lg border px-3 py-2 text-xs font-semibold',
                          activeLesson.completed
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                            : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
                        )}
                      >
                        {activeLesson.completed
                          ? 'Aula concluída. Você atingiu o mínimo de 80% assistido.'
                          : 'Para concluir esta aula, assista pelo menos 80% do vídeo.'}
                      </div>
                      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <span>Progresso desta aula</span>
                        <span>{`${visibleActiveLessonProgress}%`}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${visibleActiveLessonProgress}%`,
                            backgroundColor: 'var(--brand-primary)',
                          }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        Conclusão automática em 80% de visualização.
                      </p>
                    </div>
                    {activeLesson.description && (
                      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {activeLesson.description}
                      </p>
                    )}

                    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40">
                      <button
                        type="button"
                        onClick={() => setNotesOpen((prev) => !prev)}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
                      >
                        <NotebookPen className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                        <p className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                          Anotações rápidas
                        </p>
                        <ChevronDown
                          className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200"
                          style={{ transform: notesOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        />
                      </button>

                      <div
                        className="overflow-hidden transition-all duration-300"
                        style={{ maxHeight: notesOpen ? '9999px' : '0px' }}
                      >
                        <div className="space-y-3 border-t border-slate-200 px-3 py-3 dark:border-slate-700">
                          <div className="flex flex-col gap-2">
                            <textarea
                              value={newNote}
                              onChange={(e) => setNewNote(e.target.value)}
                              placeholder="Escreva uma anotação desta aula..."
                              className="min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[var(--brand-primary)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            />
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={handleCreateNote}
                                disabled={!newNote.trim()}
                                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                                style={{ backgroundColor: 'var(--brand-primary)' }}
                              >
                                Nova anotação
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {(lessonNotes[activeLesson.id] ?? []).length === 0 ? (
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Nenhuma anotação ainda para esta aula.
                              </p>
                            ) : (
                              (lessonNotes[activeLesson.id] ?? []).map((note) => (
                                <div
                                  key={note.id}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                                >
                                  <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                                    {note.text}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 p-20 dark:border-slate-700">
                  <Play className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    Selecione uma aula para começar
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
