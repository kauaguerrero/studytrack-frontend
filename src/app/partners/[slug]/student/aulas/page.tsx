'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/OrgContext';
import { cn } from '@/lib/utils';
import { readableBrandText } from '@/lib/brand-color';
import {
  RevealGroup, RevealItem, ElevatedCard, SectionTitle,
  KpiCard, BrandButton, MiniBar,
} from '@/components/partners/founder-ui';
import { BookOpen, CheckCircle2, Play, ChevronDown, NotebookPen, Target } from 'lucide-react';
import { isDemoOrg, MOCK_VIDEO_MODULES } from '../../../../../../studytrack-tutorial-mock';

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
    if (isDemoOrg(slug)) {
      setModules(MOCK_VIDEO_MODULES.modules as unknown as VideoModule[]);
      setLoading(false);
      return;
    }
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
      <RevealGroup className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
        <RevealItem>
          <ElevatedCard accentColor="#f59e0b">
            <div className="p-6 text-center">
              <h1 className="font-display text-lg font-black text-slate-900 dark:text-white">
                Essa função não está habilitada em sua organização
              </h1>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-white/50">
                Procure o founder ou o administrador da plataforma para habilitar videoaulas.
              </p>
            </div>
          </ElevatedCard>
        </RevealItem>
      </RevealGroup>
    );
  }

  return (
    <RevealGroup className="mx-auto max-w-6xl space-y-4 px-4 py-5 md:px-6 md:py-8 md:space-y-5">

      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <RevealItem className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: 'color-mix(in srgb, var(--brand-primary) 16%, white)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 8px color-mix(in srgb, var(--brand-primary) 22%, transparent)',
          }}
        >
          <BookOpen className="h-5 w-5" style={{ color: readableBrandText(org.brand_primary, 'var(--brand-primary)', 46) }} />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-black text-slate-900 dark:text-white">Aulas</h1>
          <p className="text-[12px] text-slate-500 dark:text-white/45">Suas videoaulas, no seu ritmo</p>
        </div>
      </RevealItem>

      {loading ? (
        <RevealItem className="space-y-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {[1, 2, 3].map((k) => (
              <div key={k} className="h-24 animate-pulse rounded-[20px] bg-slate-200 dark:bg-white/10" />
            ))}
          </div>
          {[1, 2].map((k) => (
            <div key={k} className="h-16 animate-pulse rounded-[20px] bg-slate-200 dark:bg-white/10" />
          ))}
        </RevealItem>
      ) : modules.length === 0 ? (
        <RevealItem>
          <ElevatedCard accentColor="var(--brand-primary)">
            <div className="p-10 text-center">
              <Play className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-white/20" />
              <p className="text-sm text-slate-500 dark:text-white/45">
                Nenhuma aula disponível ainda.
              </p>
            </div>
          </ElevatedCard>
        </RevealItem>
      ) : (
        <>
          {/* ── KPIs de progresso ────────────────────────────────────────── */}
          <RevealItem className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
            <KpiCard
              title="Progresso geral"
              value={`${overallProgressPct}%`}
              subtitle={`${completedLessons} de ${totalLessons} aulas`}
              icon={BookOpen}
              accentColor="var(--brand-primary)"
              accentHex={org.brand_primary}
            />
            <KpiCard
              title="Aulas concluídas"
              value={completedLessons}
              subtitle={`de ${totalLessons} no total`}
              icon={CheckCircle2}
              accentColor="var(--brand-secondary)"
              accentHex={org.brand_secondary}
            />
            <KpiCard
              title="Meta por aula"
              value={`${completionThreshold}%`}
              subtitle="assistido para concluir"
              icon={Target}
              accentColor="var(--brand-accent)"
              accentHex={org.brand_accent}
            />
          </RevealItem>

          <div className="grid gap-4 lg:grid-cols-[340px_1fr] lg:gap-5">

            {/* ── Sidebar: lista de módulos e aulas ───────────────────────── */}
            <RevealItem>
              <ElevatedCard accentColor="var(--brand-primary)">
                <div className="p-4 lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto">
                  <SectionTitle kicker="Conteúdo" title="Módulos" hex={org.brand_primary} />
                  <div className="space-y-2">
                    {modules.map((module) => {
                      const isExpanded = expandedModules.has(module.id);
                      return (
                        <div
                          key={module.id}
                          className="overflow-hidden rounded-xl bg-slate-50 dark:bg-white/5"
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
                            className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-bold text-slate-900 dark:text-white/85">
                                {module.title}
                              </p>
                              <div className="mt-1.5 flex items-center gap-2">
                                <div className="w-20">
                                  <MiniBar pct={module.progress.pct} color="var(--brand-primary)" height={5} />
                                </div>
                                <span className="text-[10.5px] font-semibold text-slate-400 dark:text-white/35">
                                  {module.progress.completed}/{module.progress.total}
                                </span>
                              </div>
                            </div>
                            <ChevronDown
                              className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 dark:text-white/35"
                              style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                            />
                          </button>

                          {/* Aulas do módulo */}
                          <div
                            className="overflow-hidden transition-all duration-300"
                            style={{ maxHeight: isExpanded ? '9999px' : '0px' }}
                          >
                            <div className="space-y-1 px-1.5 pb-1.5">
                              {module.lessons.map((lesson) => {
                                const isActive = activeLesson?.id === lesson.id;
                                return (
                                  <button
                                    key={lesson.id}
                                    type="button"
                                    onClick={() => {
                                      setActiveLesson(lesson);
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className={cn(
                                      'flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors',
                                      isActive
                                        ? 'bg-white shadow-sm dark:bg-slate-900'
                                        : 'hover:bg-white/70 dark:hover:bg-white/5'
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                                        lesson.completed
                                          ? 'bg-emerald-100 dark:bg-emerald-500/20'
                                          : 'bg-slate-200/70 dark:bg-white/10'
                                      )}
                                    >
                                      {lesson.completed ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                      ) : (
                                        <Play className="h-3.5 w-3.5 text-slate-500 dark:text-white/40" />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p
                                        className={cn(
                                          'truncate text-[12.5px] font-semibold',
                                          !isActive && 'text-slate-700 dark:text-white/70',
                                        )}
                                        style={isActive ? { color: readableBrandText(org.brand_primary, 'var(--brand-primary)') } : undefined}
                                      >
                                        {lesson.title}
                                      </p>
                                      <div className="mt-0.5 flex items-center gap-2">
                                        {lesson.duration_secs && (
                                          <p className="text-[10px] text-slate-400 dark:text-white/30">
                                            {formatDuration(lesson.duration_secs)}
                                          </p>
                                        )}
                                        <p className="text-[10px] font-semibold text-slate-500 dark:text-white/40">
                                          {lesson.completed ? '100%' : `${lesson.watched_pct || 0}%`}
                                        </p>
                                      </div>
                                    </div>
                                    {/* Mini barra de progresso parcial */}
                                    {lesson.watched_pct > 0 && !lesson.completed && (
                                      <div className="w-8 shrink-0">
                                        <MiniBar pct={lesson.watched_pct} color="var(--brand-primary)" height={4} />
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ElevatedCard>
            </RevealItem>

            {/* ── Player ───────────────────────────────────────────────────── */}
            <RevealItem className="space-y-4">
              {activeLesson ? (
                <>
                  {/* Vídeo */}
                  <div className="overflow-hidden rounded-[20px] bg-black shadow-lg">
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
                  <ElevatedCard accentColor="var(--brand-secondary)">
                    <div className="p-4 lg:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="font-display text-base font-black text-slate-900 dark:text-white">
                          {activeLesson.title}
                        </h2>
                        {activeLesson.completed && (
                          <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Concluída
                          </div>
                        )}
                      </div>
                      <div className="mt-3">
                        <div
                          className={cn(
                            'mb-3 rounded-xl px-3 py-2 text-xs font-semibold',
                            activeLesson.completed
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                          )}
                        >
                          {activeLesson.completed
                            ? `Aula concluída. Você atingiu o mínimo de ${completionThreshold}% assistido.`
                            : `Para concluir esta aula, assista pelo menos ${completionThreshold}% do vídeo.`}
                        </div>
                        <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-white/45">
                          <span>Progresso desta aula</span>
                          <span className="tabular-nums">{`${visibleActiveLessonProgress}%`}</span>
                        </div>
                        <MiniBar pct={visibleActiveLessonProgress} color="var(--brand-secondary)" glow={visibleActiveLessonProgress >= completionThreshold} height={8} />
                        <p className="mt-1.5 text-[11px] text-slate-400 dark:text-white/35">
                          Conclusão automática em {completionThreshold}% de visualização.
                        </p>
                      </div>
                      {activeLesson.description && (
                        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-white/60">
                          {activeLesson.description}
                        </p>
                      )}

                      <div className="mt-4 overflow-hidden rounded-xl bg-slate-50 dark:bg-white/5">
                        <button
                          type="button"
                          onClick={() => setNotesOpen((prev) => !prev)}
                          className="flex w-full items-center gap-2 px-3.5 py-3 text-left"
                        >
                          <NotebookPen className="h-4 w-4 text-slate-500 dark:text-white/45" />
                          <p className="min-w-0 flex-1 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-white/45">
                            Anotações rápidas
                          </p>
                          <ChevronDown
                            className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 dark:text-white/35"
                            style={{ transform: notesOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                          />
                        </button>

                        <div
                          className="overflow-hidden transition-all duration-300"
                          style={{ maxHeight: notesOpen ? '9999px' : '0px' }}
                        >
                          <div className="space-y-3 px-3.5 pb-3.5">
                            <div className="flex flex-col gap-2">
                              <textarea
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="Escreva uma anotação desta aula..."
                                className="min-h-20 w-full rounded-lg bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-1 ring-slate-200 transition focus:ring-2 focus:ring-[color:var(--brand-secondary)] dark:bg-slate-900 dark:text-white/80 dark:ring-white/10"
                              />
                              <div className="flex justify-end">
                                <BrandButton
                                  onClick={handleCreateNote}
                                  disabled={!newNote.trim()}
                                  color="var(--brand-secondary)"
                                  hex={org.brand_secondary}
                                  className="!px-3 !py-1.5 !text-xs"
                                >
                                  Nova anotação
                                </BrandButton>
                              </div>
                            </div>

                            <div className="space-y-2">
                              {(lessonNotes[activeLesson.id] ?? []).length === 0 ? (
                                <p className="text-xs text-slate-400 dark:text-white/35">
                                  Nenhuma anotação ainda para esta aula.
                                </p>
                              ) : (
                                (lessonNotes[activeLesson.id] ?? []).map((note) => (
                                  <div
                                    key={note.id}
                                    className="rounded-lg bg-white px-3 py-2 shadow-sm dark:bg-slate-900"
                                  >
                                    <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-white/75">
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
                  </ElevatedCard>
                </>
              ) : (
                <ElevatedCard accentColor="var(--brand-secondary)">
                  <div className="flex flex-col items-center justify-center p-16 lg:p-20">
                    <Play className="mb-3 h-10 w-10 text-slate-300 dark:text-white/20" />
                    <p className="text-sm text-slate-400 dark:text-white/35">
                      Selecione uma aula para começar
                    </p>
                  </div>
                </ElevatedCard>
              )}
            </RevealItem>
          </div>
        </>
      )}
    </RevealGroup>
  );
}
