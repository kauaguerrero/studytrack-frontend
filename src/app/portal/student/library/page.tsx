import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Book, BookOpen, Library as LibraryIcon, Trophy, Crown } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LibraryToolbar } from "./library-toolbar";

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

  // Queries paralelas para performance
  let booksQuery = supabase
    .from("library_books")
    .select("*")
    .order("created_at", { ascending: false });

  if (resolved.category && resolved.category !== 'todos') {
    booksQuery = booksQuery.eq("category", resolved.category);
  }
  if (resolved.q) {
    booksQuery = booksQuery.or(`title.ilike.%${resolved.q}%,author.ilike.%${resolved.q}%`);
  }

  const [{ data: profile }, { data: books }, { data: leaderboard }] = await Promise.all([
    supabase.from('profiles').select('full_name, role, school_id').eq('id', user.id).single(),
    booksQuery,
    supabase.from('view_library_leaderboard').select('*').order('books_completed', { ascending: false }).limit(3),
  ]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-background">
      <div className="p-6 md:p-10 space-y-8">
        
        <div className="flex flex-col xl:flex-row gap-8 justify-between items-start">
            {/* HEADER */}
            <div className="flex flex-col gap-2 flex-1">
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <div className="p-2 bg-blue-600 dark:bg-primary rounded-lg text-white shadow-lg shadow-blue-200 dark:shadow-primary/30">
                    <LibraryIcon size={24} />
                </div>
                Biblioteca Digital
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl">
                Acesse o acervo completo, compartilhe leituras e suba no ranking geral.
                </p>
            </div>

            {/* WIDGET DE LEADERBOARD (Gamification) */}
            <div className="w-full xl:w-96 bg-card dark:bg-card p-4 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-card-foreground font-bold">
                    <Trophy className="text-yellow-500" size={18} />
                    Top Leitores da Plataforma
                </div>
                <div className="space-y-3">
                    {leaderboard && leaderboard.length > 0 ? leaderboard.map((l: any, idx: number) => (
                        <div key={l.user_id} className="flex items-center gap-3 p-2 rounded-lg bg-muted">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400' : 'bg-muted dark:bg-background text-muted-foreground'}`}>
                                {idx === 0 ? <Crown size={14} /> : idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{l.full_name}</p>
                                <p className="text-xs text-muted-foreground">{l.books_completed} livros lidos</p>
                            </div>
                        </div>
                    )) : (
                        <p className="text-xs text-muted-foreground text-center py-2">Seja o primeiro a terminar um livro!</p>
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
                <a
                    key={book.id}
                    href={book.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer h-full block"
                >
                    <BookCard book={book} />
                </a>
            ))
            ) : (
            <div className="col-span-full py-32 text-center opacity-60">
                <BookOpen className="text-muted-foreground mx-auto mb-4" size={40} />
                <h3 className="text-xl font-bold text-foreground">Nenhum material encontrado</h3>
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
    <Card className="group h-full flex flex-col overflow-hidden border border-border bg-card dark:bg-card hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-xl hover:shadow-blue-100/50 dark:hover:shadow-blue-900/30 hover:-translate-y-1 transition-all duration-300 rounded-2xl">
      <div className="relative aspect-[2/3] w-full bg-muted overflow-hidden">
        {book.cover_url ? (
          <Image
            src={book.cover_url}
            alt={book.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground">
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
        <h3 className="font-bold text-lg text-card-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
           {book.title}
        </h3>
        <p className="text-sm font-medium text-muted-foreground mt-1 flex items-center gap-1">
           <span className="w-4 h-0.5 bg-primary/50 rounded-full inline-block"></span>
           {book.author}
        </p>
      </CardContent>

      <CardFooter className="p-5 pt-0 mt-auto">
        <span className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-muted dark:bg-slate-800 text-primary dark:text-blue-400 font-semibold text-sm">
           Abrir PDF
        </span>
      </CardFooter>
    </Card>
  );
}