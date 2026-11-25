'use client';

import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { SchoolFlashcards } from '@/components/flashcards/SchoolFlashcards';

export default function FlashcardsFounderPage() {
  return (
    <ModuleGuard permKey="flashcards_enabled" defaultEnabled={false}>
      <SchoolFlashcards />
    </ModuleGuard>
  );
}
