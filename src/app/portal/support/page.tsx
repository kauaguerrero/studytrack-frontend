'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  LifeBuoy,
  Flag,
  CheckCircle2,
  Clock,
  Search,
  BookOpen,
  MessageSquare,
  Mail,
  ChevronRight,
  ChevronDown,
  Activity,
  Users,
  GraduationCap,
  Settings,
  BrainCircuit,
  PlayCircle
} from 'lucide-react';
import { usePortalRoleOptional } from '@/contexts/PortalRoleContext';
import { UserRole } from '@/types/roles';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface QuestionSummary {
  id: string;
  subject?: string;
  exam_year?: number;
  external_id?: string;
}

interface MyReportRow {
  id: string;
  question_id: string;
  error_category: string;
  description: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  question: QuestionSummary | null;
}

// Base de Dados Dinâmica: dúvidas frequentes com respostas
type FaqItem = {
  question: string;
  answer: string;
  category: string;
  roles: string[];
};

const GLOBAL_FAQS: FaqItem[] = [
  {
    question: 'Como altero minha senha?',
    answer: 'Na tela de login, clique em "Esqueceu?" ao lado do campo de senha. Informe seu e-mail e você receberá um link por e-mail. Clique no link e defina sua nova senha na tela que abrir.',
    category: 'Conta',
    roles: ['student', 'teacher', 'manager', 'secretariat'],
  },
  {
    question: 'Não consigo acessar minha conta. O que fazer?',
    answer: 'Confira se está usando o e-mail com o qual se cadastrou. Se esqueceu a senha, use "Esqueceu?" na tela de login para receber o link de redefinição. Se o problema continuar, entre em contato pelo WhatsApp ou E-mail de Suporte (nesta página).',
    category: 'Conta',
    roles: ['student', 'teacher', 'manager', 'secretariat'],
  },
  {
    question: 'Como reportar um erro no gabarito de uma questão?',
    answer: 'No Banco de Questões, no card da questão, use o botão "Reportar Erro". Escolha o tipo (erro no enunciado, resposta incorreta, formatação, imagens ou outro), opcionalmente escreva uma descrição e envie. Para acompanhar: nesta página (Ajuda e Suporte), aba "Auditoria de Questões".',
    category: 'Banco de Questões',
    roles: ['student', 'teacher'],
  },
  {
    question: 'Onde acompanho os reports de erro que enviei?',
    answer: 'Nesta mesma página (Central de Ajuda e Suporte), na aba "Auditoria de Questões". Lá aparecem todos os reports que você enviou pelo Banco de Questões, com status em auditoria ou solucionado.',
    category: 'Banco de Questões',
    roles: ['student', 'teacher'],
  },
  {
    question: 'Como uso os filtros no Banco de Questões?',
    answer: 'Abra o painel de filtros com o ícone de olho no topo da tela do Banco de Questões. Selecione primeiro a Matéria (obrigatório). Depois você pode escolher Tópico, Ano e Dificuldade. As abas "A Fazer" e "Respondidas" mostram questões pendentes e o histórico das que você já respondeu.',
    category: 'Banco de Questões',
    roles: ['student'],
  },
  {
    question: 'Como faço um simulado?',
    answer: 'No menu, acesse "Simulado". Escolha a matéria e a quantidade de questões (5, 10, 15 ou 30). Clique em "Iniciar Simulado". O cronômetro é total; não há pausa. Ao terminar, clique em "Finalizar" e confirme para ver o resultado. Existe limite diário conforme seu plano.',
    category: 'Simulados',
    roles: ['student'],
  },
  {
    question: 'Onde fico a Biblioteca de livros?',
    answer: 'No menu do portal do aluno, acesse "Biblioteca". Use a barra de busca (título ou autor) e os filtros: Todos, Literários, Apostilas, Resumos, Editais. Clique em um livro para abrir o PDF.',
    category: 'Biblioteca',
    roles: ['student'],
  },
  {
    question: 'Onde vejo meu desempenho e precisão?',
    answer: 'No menu, acesse "Meu Desempenho". Lá estão sua precisão global, total de questões respondidas, streak (sequência de dias), XP, desempenho por matéria e o gráfico de atividade.',
    category: 'Desempenho',
    roles: ['student'],
  },
  {
    question: 'Como falo com o suporte?',
    answer: 'Nesta página: use o card "Suporte via WhatsApp" para conversar com a equipe ou "E-mail de Suporte" para abrir o Gmail com um modelo de mensagem. Para tutoriais passo a passo, acesse o card "Base de Conhecimento" (Manual do Estudante).',
    category: 'Suporte',
    roles: ['student', 'teacher', 'manager', 'secretariat'],
  },
  {
    question: 'Como funcionam as metas?',
    answer: 'No menu, acesse "Metas". Use "Nova Meta" para criar uma meta pessoal (título, quantidade e prazo) ou "Sugestão IA" para receber uma sugestão. Acompanhe o progresso nos cards; ao concluir, a meta vai para a aba "Concluídas". Há também a aba "Ranking" com o hall da fama.',
    category: 'Metas',
    roles: ['student'],
  },
];

// Índice de busca: FAQs + seções do Manual do Estudante (palavras-chave para busca efetiva)
type SearchEntry = {
  type: 'faq' | 'kb';
  title: string;
  snippet: string;
  keywords: string[];
  url?: string;
  faqIndex?: number;
};

function buildSearchIndex(faqs: FaqItem[], effectiveRole: string): SearchEntry[] {
  const faqEntries: SearchEntry[] = faqs
    .filter(f => f.roles.includes(effectiveRole))
    .map((faq, idx) => ({
      type: 'faq' as const,
      title: faq.question,
      snippet: faq.category,
      keywords: [
        faq.category.toLowerCase(),
        ...faq.question.toLowerCase().split(/\s+/).filter(w => w.length > 2),
        ...faq.answer.toLowerCase().split(/\s+/).filter(w => w.length > 3),
      ],
      faqIndex: idx,
    }));

  const kbEntries: SearchEntry[] = [
    { type: 'kb', title: 'Biblioteca de Livros', snippet: 'Leituras obrigatórias, busca por título e autor, filtros e ranking.', keywords: ['biblioteca', 'livro', 'leitura', 'obrigatória', 'vestibular', 'busca', 'filtro', 'autor', 'ranking'], url: `${KB_LINK}#biblioteca` },
    { type: 'kb', title: 'Banco de Questões', snippet: 'Filtros por matéria, tópico, ano e dificuldade. Como responder e reportar erro.', keywords: ['banco', 'questões', 'questão', 'filtro', 'matéria', 'tópico', 'ano', 'dificuldade', 'reportar', 'erro', 'gabarito', 'responder'], url: `${KB_LINK}#banco` },
    { type: 'kb', title: 'Simulados', snippet: 'Como iniciar simulado, quantidade de questões, cronômetro e resultado.', keywords: ['simulado', 'prova', 'cronômetro', 'questões', 'quantidade', 'matéria', 'resultado', 'gabarito', 'enem'], url: `${KB_LINK}#simulado` },
    { type: 'kb', title: 'Gamificação e SpeedRun', snippet: 'XP, streak, ranking e jogo SpeedRun contra o tempo.', keywords: ['gamificação', 'xp', 'streak', 'speedrun', 'jogo', 'ranking', 'pontuação', 'tempo', 'combo'], url: `${KB_LINK}#gamificacao` },
    { type: 'kb', title: 'Metas', snippet: 'Metas pessoais, sugestão da IA, progresso e ranking.', keywords: ['meta', 'metas', 'objetivo', 'sugestão', 'ia', 'progresso', 'concluída', 'ranking'], url: `${KB_LINK}#metas` },
    { type: 'kb', title: 'Meu Desempenho', snippet: 'Precisão, questões respondidas, streak e desempenho por matéria.', keywords: ['desempenho', 'precisão', 'acertos', 'questões', 'streak', 'matéria', 'gráfico', 'estatística'], url: `${KB_LINK}#desempenho` },
    { type: 'kb', title: 'Suporte e Canais', snippet: 'Base de conhecimento, WhatsApp e e-mail de suporte.', keywords: ['suporte', 'ajuda', 'whatsapp', 'email', 'contato', 'dúvida'], url: `${KB_LINK}#suporte` },
  ];

  return [...kbEntries, ...faqEntries];
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .split(/\s+/)
    .filter(w => w.length >= 2);
}

function scoreEntry(entry: SearchEntry, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const title = entry.title.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const snippet = entry.snippet.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const keywordsStr = entry.keywords.join(' ');
  let score = 0;
  for (const t of tokens) {
    if (title.includes(t)) score += 3;
    else if (keywordsStr.includes(t)) score += 2;
    else if (snippet.includes(t)) score += 1;
  }
  return score;
}

// Rota segura: GET /api/questions/reports (JWT obrigatório; backend filtra por user_id — IDOR-safe).
const REPORTS_API_PATH = '/api/questions/reports';

// Links de suporte reais
const SUPPORT_WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER || '5516993118146';
const SUPPORT_WHATSAPP_TEXT = encodeURIComponent('Olá, preciso de ajuda com o StudyTrack.');
const SUPPORT_EMAIL_TO = 'igorsilvacruz284@gmail.com';
const SUPPORT_EMAIL_SUBJECT = encodeURIComponent('Suporte StudyTrack');
const SUPPORT_EMAIL_BODY = encodeURIComponent(
  'Olá, equipe StudyTrack!\n\nPreciso de ajuda com:\n\n[Descreva aqui sua dúvida, problema técnico ou solicitação]\n\nMeus dados (opcional):\n- Nome:\n- E-mail da conta:\n\nObrigado(a)!'
);
const SUPPORT_GMAIL_URL = `https://mail.google.com/mail/?view=cm&fs=1&to=${SUPPORT_EMAIL_TO}&su=${SUPPORT_EMAIL_SUBJECT}&body=${SUPPORT_EMAIL_BODY}`;
const KB_LINK = '/portal/support/kb';

const DASHBOARD_URL_BY_ROLE: Record<UserRole, string> = {
  student: '/portal/student/dashboard',
  teacher: '/portal/teacher',
  manager: '/portal/manager',
  admin: '/portal/admin',
  secretariat: '/portal/secretariat',
};

export default function AjudaESuportePage() {
  const roleFromContext = usePortalRoleOptional();
  const currentRole: UserRole = roleFromContext ?? 'student'; // fallback apenas para evitar crash; layout sempre fornece role
  const isRoleLoading = roleFromContext === undefined;

  const [activeTab, setActiveTab] = useState<'geral' | 'reports'>('geral');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);
  const [tutorialVideoRevealed, setTutorialVideoRevealed] = useState(false);
  const tutorialVideoRef = useRef<HTMLVideoElement>(null);
  const [reports, setReports] = useState<MyReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const supabase = createClient();

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setReports([]);
        setTotal(0);
        return;
      }
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
      const res = await fetch(`${apiUrl}${REPORTS_API_PATH}?limit=50`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        setReports([]);
        setTotal(0);
        return;
      }
      const data = (await res.json()) as { data: MyReportRow[]; total: number };
      setReports(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setReports([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const effectiveRole = currentRole === 'admin' ? 'manager' : currentRole;

  // Busca efetiva: índice (FAQs + KB) + pontuação por palavras-chave
  const searchResults = useMemo(() => {
    const q = searchQuery.trim();
    if (q.length < 2) return [];
    const tokens = tokenize(q);
    if (tokens.length === 0) return [];
    const index = buildSearchIndex(GLOBAL_FAQS, effectiveRole);
    const withScores = index
      .map(entry => ({ entry, score: scoreEntry(entry, tokens) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);
    return withScores.slice(0, 10).map(({ entry }) => entry);
  }, [searchQuery, effectiveRole]);

  // Filtro de FAQs funcional (admin vê as mesmas FAQs que manager)
  const filteredFAQs = useMemo(() => {
    return GLOBAL_FAQS.filter(faq => {
      const matchesRole = faq.roles.includes(effectiveRole);
      const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            faq.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRole && matchesSearch;
    });
  }, [currentRole, searchQuery, effectiveRole]);

  // UI Helpers baseados na Role (admin usa estilo manager)
  const roleConfig: Record<UserRole, { icon: typeof Settings; title: string; color: string; bgBadge: string }> = {
    manager: { icon: Settings, title: 'Portal do Gestor', color: 'text-blue-100', bgBadge: 'bg-blue-800' },
    secretariat: { icon: Users, title: 'Portal da Secretaria', color: 'text-purple-100', bgBadge: 'bg-purple-800' },
    teacher: { icon: GraduationCap, title: 'Portal do Professor', color: 'text-amber-100', bgBadge: 'bg-amber-800' },
    student: { icon: BrainCircuit, title: 'Portal do Aluno', color: 'text-emerald-100', bgBadge: 'bg-emerald-800' },
    admin: { icon: Settings, title: 'Administração', color: 'text-slate-100', bgBadge: 'bg-slate-800' }
  };
  const ActiveRoleIcon = roleConfig[currentRole]?.icon ?? roleConfig.student.icon;

  // Evita piscar interface com role errada enquanto o contexto ainda não hidratou
  if (isRoleLoading) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] dark:bg-background font-sans text-slate-900 dark:text-slate-50 pb-16">
        <div className="bg-blue-700 pt-16 pb-28 px-4 md:px-8 border-b border-blue-800" />
        <div className="max-w-5xl mx-auto w-full p-4 md:p-8 -mt-12 relative z-20 space-y-8">
          <Skeleton className="h-12 w-48 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA] dark:bg-background font-sans text-slate-900 dark:text-slate-50 pb-16">
      {/* Hero Section - Identidade StudyTrack */}
      <div className="bg-blue-700 relative pt-12 sm:pt-16 pb-24 sm:pb-28 px-4 md:px-8 border-b border-blue-800 shadow-sm">
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:32px_32px]" />
        
        <div className="relative max-w-5xl mx-auto space-y-6 text-center z-10">
          <Badge className={`${roleConfig[currentRole].bgBadge} ${roleConfig[currentRole].color} border-0 px-4 py-1.5 text-xs font-bold tracking-wide uppercase shadow-sm`}>
            <ActiveRoleIcon className="w-4 h-4 mr-2 inline-block" />
            {roleConfig[currentRole].title}
          </Badge>
          
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
            Central de Ajuda e Suporte
          </h1>
          <p className="text-blue-200 text-lg max-w-2xl mx-auto font-medium">
            Encontre respostas rápidas, tutoriais da plataforma e acompanhe seus chamados.
          </p>

          <div className="relative max-w-2xl mx-auto mt-8 shadow-xl rounded-2xl">
            <div className="relative flex items-center bg-white dark:bg-slate-900 rounded-2xl p-1 overflow-hidden focus-within:ring-4 focus-within:ring-blue-400/40 transition-all border-2 border-transparent focus-within:border-blue-300 dark:focus-within:border-blue-600">
              <Search className="text-slate-400 dark:text-slate-500 h-6 w-6 ml-4" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Qual é a sua dúvida hoje?" 
                className="w-full bg-transparent border-0 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-4 py-4 focus:outline-none focus:ring-0 text-lg font-medium"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="mr-4 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-bold transition-colors">
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full p-4 md:p-8 -mt-12 relative z-20 space-y-8">
        
        {/* Navegação de Abas */}
        <div className="flex bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-1.5 w-fit mx-auto md:mx-0">
          <button
            onClick={() => setActiveTab('geral')}
            className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
              activeTab === 'geral' 
                ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-800' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
            }`}
          >
            Visão Geral
          </button>
          
          {(currentRole === 'student' || currentRole === 'teacher' || currentRole === 'admin') && (
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'reports' 
                  ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-800' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
              }`}
            >
              Auditoria de Questões
              {total > 0 && (
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black transition-colors ${
                  activeTab === 'reports' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {total}
                </span>
              )}
            </button>
          )}
        </div>

        {/* ================= ABA GERAL ================= */}
        {activeTab === 'geral' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out space-y-8">
            
            {/* Resultados da busca (quando o usuário digita na dúvida) */}
            {searchQuery.trim().length >= 2 && searchResults.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-50">Resultados da busca</h2>
                  <span className="text-sm text-slate-500 dark:text-slate-400">— {searchResults.length} {searchResults.length === 1 ? 'resultado' : 'resultados'}</span>
                </div>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {searchResults.map((item, idx) => (
                    <li key={item.type + (item.url ?? item.faqIndex ?? idx)}>
                      {item.type === 'kb' && item.url ? (
                        <Link
                          href={item.url}
                          className="flex flex-col sm:flex-row sm:items-center gap-2 p-5 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 truncate">{item.title}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{item.snippet}</p>
                          </div>
                          <span className="text-xs font-semibold text-blue-600 shrink-0 flex items-center gap-1">
                            Manual do Estudante <ChevronRight className="h-4 w-4" />
                          </span>
                        </Link>
                      ) : (
                        <a
                          href="#faq-section"
                          onClick={(e) => { e.preventDefault(); document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                          className="flex flex-col sm:flex-row sm:items-center gap-2 p-5 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors group block"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 truncate">{item.title}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Dúvida frequente · {item.snippet}</p>
                          </div>
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
                            Ver abaixo <ChevronRight className="h-4 w-4" />
                          </span>
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed py-10 px-6 text-center">
                <Search className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="font-bold text-slate-600 dark:text-slate-300">Nenhum resultado para &quot;{searchQuery.trim()}&quot;</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Tente outras palavras (ex.: simulado, filtro, metas, desempenho) ou acesse o WhatsApp.</p>
              </div>
            )}

            {/* Status do Sistema B2B/B2C */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-4 w-4 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-900">Todos os sistemas operacionais</h3>
                  <p className="text-xs font-medium text-emerald-700 mt-0.5">Banco de questões, IA e integrações funcionando 100%.</p>
                </div>
              </div>
              {currentRole === 'manager' && (
                <Button variant="outline" size="sm" className="bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-bold text-xs">
                  Ver Log B2B
                </Button>
              )}
            </div>

            {/* Quick Links de Suporte - Links reais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Link href={KB_LINK} className="block">
                <Card className="rounded-2xl hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg transition-all cursor-pointer bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 group h-full">
                  <CardContent className="p-8 flex flex-col items-center text-center space-y-4 h-full">
                    <div className="h-14 w-14 bg-blue-50 dark:bg-blue-900/40 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                      <BookOpen className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-50 text-lg">Base de Conhecimento</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
                        {currentRole === 'student' ? 'Manuais da plataforma.' : 'Guias de gestão, acessibilidade e relatórios.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <a
                href={`https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${SUPPORT_WHATSAPP_TEXT}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card className="rounded-2xl hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-lg transition-all cursor-pointer bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 group h-full">
                  <CardContent className="p-8 flex flex-col items-center text-center space-y-4 h-full">
                    <div className="h-14 w-14 bg-emerald-50 dark:bg-emerald-900/40 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                      <MessageSquare className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-50 text-lg">Suporte via WhatsApp</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">Fale com nossa equipe.</p>
                    </div>
                  </CardContent>
                </Card>
              </a>

              <a href={SUPPORT_GMAIL_URL} target="_blank" rel="noopener noreferrer" className="block">
                <Card className="rounded-2xl hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-lg transition-all cursor-pointer bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 group h-full">
                  <CardContent className="p-8 flex flex-col items-center text-center space-y-4 h-full">
                    <div className="h-14 w-14 bg-purple-50 dark:bg-purple-900/40 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                      <Mail className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-50 text-lg">
                        {currentRole === 'manager' || currentRole === 'secretariat' ? 'Suporte Dedicado B2B' : 'E-mail de Suporte'}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
                        {currentRole === 'student' ? 'Dúvidas sobre sua assinatura ou conta.' : 'Abra um ticket para o time de engenharia ou financeiro.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </a>
            </div>

            {/* Dúvidas Frequentes e Guias em Grid Assimétrico */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6">
              
              {/* Coluna Principal: FAQs */}
              <div id="faq-section" className="lg:col-span-2 space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                    <LifeBuoy className="text-blue-600 dark:text-blue-400 h-6 w-6" />
                    Dúvidas Frequentes
                  </h2>
                </div>

                {filteredFAQs.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed">
                    <Search className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-300 font-bold text-lg">Nenhum resultado encontrado</p>
                    <p className="text-slate-400 dark:text-slate-500 font-medium mt-1">Tente buscar por termos diferentes ou acesse o WhatsApp.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredFAQs.map((faq, idx) => {
                      const globalIndex = GLOBAL_FAQS.indexOf(faq);
                      const isExpanded = expandedFaqIndex === globalIndex;
                      return (
                        <div
                          key={globalIndex}
                          className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden transition-all hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md"
                        >
                          <button
                            type="button"
                            onClick={() => setExpandedFaqIndex(isExpanded ? null : globalIndex)}
                            className="w-full p-5 flex justify-between items-start gap-4 text-left"
                          >
                            <div className="pr-4 flex-1 min-w-0">
                              <Badge variant="secondary" className="mb-2 text-[10px] font-black tracking-wider uppercase text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800">
                                {faq.category}
                              </Badge>
                              <p className="text-base font-bold text-slate-800 dark:text-slate-50 leading-snug">
                                {faq.question}
                              </p>
                            </div>
                            <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center transition-colors ${isExpanded ? 'bg-blue-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                              {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                            </div>
                          </button>
                          {isExpanded && (
                            <div className="px-5 pb-5 pt-0">
                              <div className="pl-0 border-t border-slate-100 dark:border-slate-800 pt-4">
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                                  {faq.answer}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Coluna Lateral: Guias Rápidos — TODO: Integrar com CMS de vídeos posteriormente */}
              <div className="space-y-4 lg:flex lg:flex-col lg:items-stretch">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <PlayCircle className="text-blue-600 dark:text-blue-400 h-6 w-6" />
                  Guia da Plataforma
                </h2>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-5 flex flex-col items-center">
                  <div className="group w-full flex flex-col items-center text-center">
                    {/* Celular: moldura + notch + tela 9:16 — centralizado no container */}
                    <div
                      className={`relative mb-3 w-[200px] sm:w-[240px] md:w-[280px] flex-shrink-0 ${!tutorialVideoRevealed ? 'cursor-pointer' : ''}`}
                      onClick={() => {
                        if (!tutorialVideoRevealed) {
                          setTutorialVideoRevealed(true);
                          tutorialVideoRef.current?.play();
                        }
                      }}
                    >
                      <div className="relative border-[8px] sm:border-[10px] lg:border-[12px] border-slate-900 bg-slate-900 rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden shadow-2xl">
                        {/* Notch (dynamic island) */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-4 w-14 sm:h-5 sm:w-20 lg:h-6 lg:w-24 bg-black rounded-b-xl z-20 pointer-events-none" />
                        {/* Tela do celular: formato 9:16 */}
                        <div className="aspect-[9/16] w-full bg-black relative overflow-hidden">
                          <video
                            ref={tutorialVideoRef}
                            src="/videos/tutorial.mp4"
                            controls={tutorialVideoRevealed}
                            className="absolute inset-0 w-full h-full object-cover"
                            preload="metadata"
                            title="Tutorial da plataforma StudyTrack"
                            onClick={(e) => e.stopPropagation()}
                          />
                          {!tutorialVideoRevealed && (
                            <div
                              className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-slate-100 hover:from-blue-100 hover:to-slate-200 transition-colors"
                              aria-label="Reproduzir tutorial"
                            >
                              <div className="h-16 w-16 sm:h-20 sm:w-20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <img
                                  src="/logost-transparente-sombra.png"
                                  alt="StudyTrack"
                                  className="h-full w-full object-contain drop-shadow-lg"
                                />
                              </div>
                              <span className="mt-2 sm:mt-3 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">Clique para assistir</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                      Como funciona a StudyTrack?
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Tutorial</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ================= ABA DE REPORTS (TIMELINE MANTIDA DA V3) ================= */}
        {activeTab === 'reports' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 md:p-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 border-b border-slate-100 dark:border-slate-800 pb-6">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 flex items-center gap-3">
                  <Flag className="w-6 h-6 text-amber-500" />
                  Auditoria de Questões
                </h2>
                <p className="text-base font-medium text-slate-500 dark:text-slate-400 mt-2">
                  Acompanhe os reports enviados ao time pedagógico. O seu feedback é essencial.
                </p>
              </div>
              <Button onClick={fetchReports} disabled={loading} variant="outline" className="shrink-0 font-bold border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                {loading ? 'Atualizando...' : 'Atualizar Status'}
              </Button>
            </div>

            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
              </div>
            ) : reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl bg-slate-50 dark:bg-slate-800/50">
                <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center mb-5 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
                </div>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-50 text-xl">Nenhum report pendente!</h3>
                <p className="text-slate-500 dark:text-slate-400 text-base font-medium mt-2 max-w-md">
                  Quando você encontrar alguma inconsistência nas questões e reportar via Banco de Questões, o histórico aparecerá aqui.
                </p>
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-4 md:ml-6 space-y-10 pb-4">
                {reports.map((report) => (
                  <div key={report.id} className="relative pl-8 md:pl-10 group">
                    <div className={`absolute -left-[17px] top-1 p-1.5 rounded-full border-4 border-white dark:border-slate-900 ${
                      report.status === 'resolved' ? 'bg-emerald-500' : 'bg-amber-400'
                    }`}>
                      {report.status === 'resolved' ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      ) : (
                        <Clock className="w-4 h-4 text-white" />
                      )}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all duration-300">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold border-slate-300 dark:border-slate-600">
                            {report.question?.subject ?? 'Sem disciplina'} {report.question?.exam_year && `• ${report.question.exam_year}`}
                          </Badge>
                          {report.question?.external_id && (
                            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">
                              ID: {report.question.external_id}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-bold text-slate-400 dark:text-slate-500">
                          {new Date(report.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">
                        {report.description || 'Report enviado sem descrição textual.'}
                      </p>

                      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
                        {report.status === 'resolved' ? (
                          <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-700 bg-emerald-100 px-4 py-2 rounded-lg w-fit">
                            <CheckCircle2 size={16} /> Solucionado pela equipe pedagógica
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm font-extrabold text-amber-700 bg-amber-100 px-4 py-2 rounded-lg w-fit">
                            <Activity size={16} className="animate-pulse" /> Em auditoria no momento
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}