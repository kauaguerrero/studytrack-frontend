'use client';

import { useState, useCallback, useEffect } from 'react';
import { DEFAULT_SLIDES, PresentationData, SLIDE_TITLES } from '../data/slides';

const TOTAL_SLIDES = 11;
const STORAGE_KEY = 'studytrack_presentation_v1';

function loadFromStorage(): PresentationData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SLIDES;
    const parsed = JSON.parse(raw) as PresentationData;
    // Merge with defaults so new slides added in future versions aren't missing
    return {
      ...DEFAULT_SLIDES,
      ...parsed,
    };
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

  // Auto-save to localStorage whenever content changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
    } catch {
      // Storage full or unavailable — silently skip
    }
  }, [content]);

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
