'use client';

import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { SchoolFlashcards } from '@/components/flashcards/SchoolFlashcards';

export default function FlashcardsFounderPage() {
  return (
    <PartnerLayout>
      <ModuleGuard permKey="flashcards_enabled" defaultEnabled={false}>
        <SchoolFlashcards />
      </ModuleGuard>
    </PartnerLayout>
  );
}
