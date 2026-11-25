'use client';

import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { StudentFlashcards } from '@/components/flashcards/StudentFlashcards';

export default function StudentFlashcardsPage() {
  return (
    <ModuleGuard permKey="flashcards_enabled" defaultEnabled={false}>
      <StudentFlashcards />
    </ModuleGuard>
  );
}
