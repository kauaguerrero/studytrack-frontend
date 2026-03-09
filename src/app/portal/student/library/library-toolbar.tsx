'use client'

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDebouncedCallback } from "use-debounce"; // Instale se precisar: npm i use-debounce ou use setTimeout manual

export function LibraryToolbar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category') || 'todos';

  // Atualiza a URL sem recarregar a página (UX melhor)
  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set('q', term);
    } else {
      params.delete('q');
    }
    router.replace(`?${params.toString()}`);
  }, 300);

  const handleCategory = (category: string) => {
    const params = new URLSearchParams(searchParams);
    if (category === 'todos') {
      params.delete('category');
    } else {
      params.set('category', category);
    }
    router.replace(`?${params.toString()}`);
  }

  const FilterBadge = ({ label, value }: { label: string, value: string }) => {
    const isActive = currentCategory === value;
    return (
      <Badge 
        variant={isActive ? "default" : "outline"} 
        className={`cursor-pointer px-4 py-2 h-9 text-sm transition-all hover:scale-105 ${
          isActive 
          ? "bg-blue-600 dark:bg-primary hover:bg-blue-700 dark:hover:bg-primary/90 border-transparent shadow-md shadow-blue-200 dark:shadow-primary/30" 
          : "text-muted-foreground border-border hover:border-blue-300 dark:hover:border-blue-600 hover:text-primary bg-background"
        }`}
        onClick={() => handleCategory(value)}
      >
        {label}
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-center bg-card dark:bg-card p-4 rounded-2xl shadow-sm border border-border">
        {/* Search Input com Icone Integrado */}
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
          <Input 
            placeholder="Buscar título, autor ou exame..." 
            className="pl-10 border-border bg-muted/50 dark:bg-input focus:bg-background focus:ring-2 focus:ring-ring transition-all h-11 rounded-xl"
            defaultValue={searchParams.get('q')?.toString()}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        
        {/* Divisor Vertical (Desktop) */}
        <div className="hidden md:block w-px h-8 bg-border mx-2"></div>

        {/* Filtros */}
        <div className="flex items-center gap-2 w-full overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          <FilterBadge label="Todos" value="todos" />
          <FilterBadge label="Literários" value="literatura" />
          <FilterBadge label="Apostilas" value="apostila" />
          <FilterBadge label="Resumos" value="resumo" />
          <FilterBadge label="Editais" value="edital" />
        </div>
      </div>
    </div>
  );
}