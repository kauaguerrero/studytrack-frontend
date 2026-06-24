'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { DEFAULT_SLIDES, PresentationData, SLIDE_TITLES } from '../data/slides';

const TOTAL_SLIDES = 12;
const STORAGE_KEY = 'studytrack_presentation_v1';
const REMOTE_CONTENT_ENDPOINT = '/api/admin/apresentacao/content';

function normalizePresentationData(data: PresentationData): PresentationData {
  const entries = data.slideTimeline?.entries ?? DEFAULT_SLIDES.slideTimeline.entries;
  const defaultEntries = DEFAULT_SLIDES.slideTimeline.entries;

  return {
    ...data,
    slide08: {
      ...DEFAULT_SLIDES.slide08,
      ...data.slide08,
      features: (data.slide08?.features ?? DEFAULT_SLIDES.slide08.features).map((feature) => (
        feature === 'Correção de redações com IA'
          ? 'Correção de redações com processamento de dados'
          : feature
      )),
    },
    slide07: {
      ...DEFAULT_SLIDES.slide07,
      ...data.slide07,
      breakdown: (data.slide07?.breakdown ?? DEFAULT_SLIDES.slide07.breakdown).map((item, index) => {
        const defaultItem = DEFAULT_SLIDES.slide07.breakdown[index];
        if (item.label === 'IA (em dólar)') {
          return {
            ...item,
            label: 'Processamento de dados (em dólar)',
            description: defaultItem?.description ?? item.description,
          };
        }

        if (item.label === 'Processamento de Dados (em dólar)') {
          return {
            ...item,
            label: 'Processamento de dados (em dólar)',
          };
        }

        return item;
      }),
      note: data.slide07?.note === 'Infraestrutura e hospedagem em BRL · IA processada em USD via provedores internacionais'
        ? DEFAULT_SLIDES.slide07.note
        : data.slide07?.note ?? DEFAULT_SLIDES.slide07.note,
    },
    slideTimeline: {
      ...DEFAULT_SLIDES.slideTimeline,
      ...data.slideTimeline,
      entries: entries.map((entry, index) => {
        const defaultEntry = defaultEntries[index];
        if (!defaultEntry) return entry;

        if (
          entry.description === 'Primeiro cliente ativo. Engajamento comprovado em dados reais desde o 1º semestre.' ||
          entry.description === 'Segunda parceria confirmada. Plataforma implantada e operacional.'
        ) {
          return {
            ...entry,
            description: defaultEntry.description,
          };
        }

        return entry;
      }),
    },
  };
}

function loadFromStorage(): PresentationData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SLIDES;
    const parsed = JSON.parse(raw) as PresentationData;
    // Merge with defaults so new slides added in future versions aren't missing
    return normalizePresentationData({
      ...DEFAULT_SLIDES,
      ...parsed,
    });
  } catch {
    return DEFAULT_SLIDES;
  }
}

export function usePresentation() {
  // Initialize from localStorage on first render (client only)
  const [content, setContent] = useState<PresentationData>(() => {
    if (typeof window === 'undefined') return DEFAULT_SLIDES;
    return loadFromStorage();
  });
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const lastSavedRemote = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRemoteContent() {
      try {
        const response = await fetch(REMOTE_CONTENT_ENDPOINT, { cache: 'no-store' });
        if (!response.ok) return;

        const result = await response.json();
        if (!result?.content || cancelled) return;

        const merged = {
          ...DEFAULT_SLIDES,
          ...(result.content as PresentationData),
        };
        const normalized = normalizePresentationData(merged);
        lastSavedRemote.current = JSON.stringify(merged);
        setContent(normalized);
      } catch {
        // Local storage remains as the offline/cache fallback.
      } finally {
        if (!cancelled) setRemoteReady(true);
      }
    }

    loadRemoteContent();

    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-save to localStorage whenever content changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
    } catch {
      // Storage full or unavailable — silently skip
    }
  }, [content]);

  useEffect(() => {
    if (!remoteReady) return;

    const serialized = JSON.stringify(content);
    if (serialized === lastSavedRemote.current) return;

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(REMOTE_CONTENT_ENDPOINT, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });

        if (response.ok) {
          lastSavedRemote.current = serialized;
        }
      } catch {
        // Keep the local copy; the next edit will attempt another remote save.
      }
    }, 600);

    return () => window.clearTimeout(timeout);
  }, [content, remoteReady]);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(Math.max(0, Math.min(TOTAL_SLIDES - 1, index)));
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => Math.min(prev + 1, TOTAL_SLIDES - 1));
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  }, []);

  const updateSlide = useCallback(
    <K extends keyof PresentationData>(key: K, data: Partial<PresentationData[K]>) => {
      setContent((prev) => ({
        ...prev,
        [key]: { ...prev[key], ...data },
      }));
    },
    [],
  );

  const resetToDefault = useCallback(() => {
    setContent(DEFAULT_SLIDES);
    lastSavedRemote.current = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (isEditing) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        prevSlide();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isEditing, nextSlide, prevSlide]);

  return {
    content,
    currentSlide,
    totalSlides: TOTAL_SLIDES,
    slideTitles: SLIDE_TITLES,
    isEditing,
    setIsEditing,
    goToSlide,
    nextSlide,
    prevSlide,
    updateSlide,
    resetToDefault,
  };
}
