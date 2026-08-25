"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
}

/** Mesmo padrão usado em portal/admin/god-mode/page.tsx (paginação local, sem estado compartilhado). */
export default function Pagination({ page, total, limit, onChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-1 pt-3 text-xs text-slate-500 dark:text-zinc-400">
      <span>{total} no total — página {page} de {totalPages}</span>
      <div className="flex gap-1.5">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-700 disabled:opacity-30"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-700 disabled:opacity-30"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
