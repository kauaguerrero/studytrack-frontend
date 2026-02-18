import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Book, BookOpen, ExternalLink, Library as LibraryIcon, Trophy, Crown, User } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LibraryToolbar } from "./library-toolbar";
import { MobileLibraryNav } from "@/components/layout/MobileLibraryNav"; // Importe o componente mobile
import { BookActionModal } from "./book-action-modal"; // Importe o modal

// Tipos
type LibraryBook = {
  id: string;
  title: string;
  author: string;
  description: string | null;
  cover_url: string | null;
  pdf_url: string;
  category: 'literatura' | 'apostila' | 'resumo' | 'edital';
  exam_tags: string[];
};

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const resolved = await searchParams;

  // 1. Fetch Profile para o Menu Mobile e Leaderboard
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, school_id')
    .eq('id', user.id)
    .single();

  // 2. Fetch Livros com Busca CORRIGIDA (OR logic)
  let query = supabase
    .from("library_books")
    .select("*")
    .order("created_at", { ascending: false });

  if (resolved.category && resolved.category !== 'todos') {
    query = query.eq("category", resolved.category);
  }

  if (resolved.q) {
    // CORREÇÃO DO BUG: Busca no título OU no autor
    query = query.or(`title.ilike.%${resolved.q}%,author.ilike.%${resolved.q}%`);
  }

  const { data: books } = await query;

  // 3. Fetch Leaderboard (Top 3 leitores da escola)
  const { data: leaderboard } = await supabase
    .from('view_library_leaderboard')
    .select('*')
    .eq('school_id', profile?.school_id) // Filtra pela escola do aluno
    .limit(3);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      
      {/* MENU MOBILE (Só aparece em telas pequenas via CSS hidden/block dentro do componente) */}
      <MobileLibraryNav 
        role={profile?.role || 'student'} 
        fullName={profile?.full_name || 'Aluno'} 
      />

      <div className="p-6 md:p-10 space-y-8">
        
        <div className="flex flex-col xl:flex-row gap-8 justify-between items-start">
            {/* HEADER */}
            <div className="flex flex-col gap-2 flex-1">
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-200">
                    <LibraryIcon size={24} />
                </div>
                Biblioteca Digital
                </h1>
                <p className="text-slate-500 text-lg max-w-2xl">
                Acesse o acervo completo, compartilhe leituras e suba no ranking.
                </p>
            </div>

            {/* WIDGET DE LEADERBOARD (Gamification) */}
            <div className="w-full xl:w-96 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-slate-800 font-bold">
                    <Trophy className="text-yellow-500" size={18} />
                    Ranking de Leitores (Mês)
                </div>
                <div className="space-y-3">
                    {leaderboard && leaderboard.length > 0 ? leaderboard.map((l: any, idx: number) => (
                        <div key={l.user_id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-200 text-slate-600'}`}>
                                {idx === 0 ? <Crown size={14} /> : idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{l.full_name}</p>
                                <p className="text-xs text-slate-500">{l.books_completed} livros lidos</p>
                            </div>
                        </div>
                    )) : (
                        <p className="text-xs text-slate-400 text-center py-2">Seja o primeiro a terminar um livro!</p>
                    )}
                </div>
            </div>
        </div>

        {/* TOOLBAR */}
        <LibraryToolbar />

        {/* GRID DE LIVROS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {books && books.length > 0 ? (
            books.map((book) => (
                // Envolvemos o card no Modal de Ação
                <BookActionModal key={book.id} book={book}>
                    {/* O Trigger precisa ser um elemento clicável, passamos a ref via asChild no BookCard se necessário, 
                        mas aqui vamos fazer o BookCard agir como trigger visual */}
                    <div className="cursor-pointer h-full"> 
                        <BookCard book={book} />
                    </div>
                </BookActionModal>
            ))
            ) : (
            <div className="col-span-full py-32 text-center opacity-60">
                <BookOpen className="text-slate-300 mx-auto mb-4" size={40} />
                <h3 className="text-xl font-bold text-slate-700">Nenhum material encontrado</h3>
            </div>
            )}
        </div>
      </div>
    </div>
  );
}

// --- CARD (Apenas UI, lógica movida para o Modal) ---
function BookCard({ book }: { book: LibraryBook }) {
  return (
    <Card className="group h-full flex flex-col overflow-hidden border border-slate-200 bg-white hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/50 hover:-translate-y-1 transition-all duration-300 rounded-2xl">
      <div className="relative aspect-[2/3] w-full bg-slate-100 overflow-hidden">
        {book.cover_url ? (
          <Image
            src={book.cover_url}
            alt={book.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-300">
            <Book size={48} className="mb-2" />
          </div>
        )}
        {/* Tags */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
          {book.exam_tags?.map(tag => (
            <Badge key={tag} className="bg-blue-600/90 text-white border-none shadow-sm backdrop-blur-md">{tag}</Badge>
          ))}
        </div>
      </div>

      <CardContent className="p-5 flex-1 flex flex-col">
        <h3 className="font-bold text-lg text-slate-800 leading-tight line-clamp-2 group-hover:text-blue-700 transition-colors">
           {book.title}
        </h3>
        <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1">
           <span className="w-4 h-0.5 bg-blue-300 rounded-full inline-block"></span>
           {book.author}
        </p>
      </CardContent>

      <CardFooter className="p-5 pt-0 mt-auto">
        <Button variant="secondary" className="w-full bg-slate-100 hover:bg-blue-50 text-blue-700">
           Ver Detalhes
        </Button>
      </CardFooter>
    </Card>
  );
}