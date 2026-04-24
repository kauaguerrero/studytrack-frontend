"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  CheckCircle,
  ArrowRight,
  PenTool,
  Brain,
  Star,
  ChevronDown,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';

// --- CSS CUSTOMIZADO ---
const customStyles = `
  html { scroll-behavior: smooth; }

  @keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
    100% { transform: translateY(0px); }
  }
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(37, 99, 235, 0.2); }
    50% { box-shadow: 0 0 40px rgba(37, 99, 235, 0.6); }
  }
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes notification-fall {
    0% { opacity: 0; transform: translateY(-32px) scale(0.94); }
    14% { opacity: 1; transform: translateY(6px) scale(1.02); }
    22% { opacity: 1; transform: translateY(0) scale(1); }
    82% { opacity: 1; transform: translateY(0) scale(1); }
    90% { opacity: 0; transform: translateY(-24px) scale(0.96); }
    100% { opacity: 0; transform: translateY(-32px) scale(0.94); }
  }
  .animate-notification-in {
    animation: notification-fall 6s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
  }
  @keyframes blob {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(30px, -50px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
  }

  .animate-float { animation: float 6s ease-in-out infinite; }
  .animate-pulse-glow { animation: pulse-glow 3s infinite; }
  .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }
  .animate-blob { animation: blob 9s ease-in-out infinite; }
  .animate-blob-2 { animation: blob 11s ease-in-out infinite 2s; }
  .animate-blob-3 { animation: blob 13s ease-in-out infinite 4s; }

  /* Scroll reveal */
  .reveal {
    opacity: 0;
    transform: translateY(28px);
    transition: opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.65s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .reveal.is-visible { opacity: 1; transform: translateY(0); }
  .reveal-d1 { transition-delay: 0.1s; }
  .reveal-d2 { transition-delay: 0.2s; }
  .reveal-d3 { transition-delay: 0.3s; }
  .reveal-d4 { transition-delay: 0.4s; }
  .reveal-d5 { transition-delay: 0.5s; }

  /* Em mobile, todo conteúdo reveal já nasce visível (evita seções invisíveis) */
  @media (max-width: 767px) {
    .reveal { opacity: 1 !important; transform: translateY(0) !important; }
  }

  @media (prefers-reduced-motion: reduce) {
    .animate-float, .animate-pulse-glow, .animate-blob,
    .animate-blob-2, .animate-blob-3, .animate-notification-in { animation: none !important; }
    .animate-fade-in-up { animation-duration: 0.01ms !important; }
    .reveal { opacity: 1 !important; transform: none !important; transition: none !important; }
  }

  /* Gradient text */
  .text-gradient {
    background: linear-gradient(135deg, #60A5FA 0%, #A78BFA 60%, #60A5FA 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .text-gradient-dark {
    background: linear-gradient(135deg, #2563EB 0%, #7C3AED 60%, #2563EB 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* Glassmorphism */
  .glass {
    background: rgba(255, 255, 255, 0.07);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  /* CTA button */
  .btn-orange {
    background: linear-gradient(135deg, #F97316 0%, #EF4444 100%);
    transition: transform 0.18s ease-out, box-shadow 0.18s ease-out;
  }
  .btn-orange:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 48px rgba(249, 115, 22, 0.4);
  }
  .btn-orange:active { transform: translateY(0); }

  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [counts, setCounts] = useState({ students: 0, clarity: 0, questions: 0, essay: 0 });

  const countersStarted = useRef(false);
  const metricsRef = useRef<HTMLDivElement>(null);

  const faqItems = [
    {
      question: "E se eu começar e abandonar de novo?",
      answer: "O sistema foi construído especificamente para o estudante que já abandonou antes. Faltou um dia? O algoritmo redistribui sem acumular culpa. Não existe 'atraso' aqui — existe recomeço automático. A diferença é que desta vez o instrumento está do seu lado."
    },
    {
      question: "Não tenho tempo suficiente.",
      answer: "A missão foi projetada para caber no tempo que você tem — 45 minutos, 1 hora, 2 horas. Você informa sua disponibilidade e a IA calibra. Não existe missão impossível para o seu dia."
    },
    {
      question: "Já tentei outros aplicativos.",
      answer: "Qual deles te enviava uma missão baseada nas suas lacunas específicas — não nas de todos os estudantes, nas suas? Essa é a diferença. Não é conteúdo genérico. É direção personalizada para onde você está hoje."
    },
    {
      question: "Por que é tão barato?",
      answer: "Porque acreditamos que direção personalizada não deveria ser privilégio de poucos. O ENEM é a maior ferramenta de mobilidade social do Brasil — e todo estudante merece ter acesso a um sistema que funciona, independente da sua condição financeira."
    },
    {
      question: "Vai realmente fazer diferença?",
      answer: "Não prometemos nota. Prometemos clareza e direção — que são os dois recursos que a maioria dos reprovados não tinha. Você vai acordar sabendo o que estudar. Vai dormir sabendo o que fez. Essa clareza, por si só, já muda a trajetória."
    }
  ];

  // Scroll handler
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('is-visible');
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Animated counters
  useEffect(() => {
    const el = metricsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || countersStarted.current) return;
        countersStarted.current = true;
        const targets = { students: 4217, clarity: 87, questions: 5000, essay: 23 };
        const duration = 2000;
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          const e = 1 - Math.pow(1 - t, 3);
          setCounts({
            students: Math.round(e * targets.students),
            clarity: Math.round(e * targets.clarity),
            questions: Math.round(e * targets.questions),
            essay: Math.round(e * targets.essay),
          });
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden selection:bg-blue-200 selection:text-blue-900">
      <style>{customStyles}</style>

      {/* ================================================================
          NAVBAR
      ================================================================ */}
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          isScrolled ? 'bg-white/90 backdrop-blur-lg shadow-sm py-2' : 'bg-transparent py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div
            className={`flex items-center gap-0 font-extrabold text-xl sm:text-2xl tracking-tight cursor-pointer group transition-colors ${isScrolled ? 'text-slate-900' : 'text-white'}`}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
              <Image
                src="/logost-transparente-sombra.png"
                alt="Logo StudyTrack"
                width={50}
                height={50}
                className="w-12 h-12 object-contain"
                priority
                unoptimized
              />
            </div>
            <span>Study<span className={isScrolled ? 'text-blue-600' : 'text-blue-400'}>Track</span></span>
          </div>

          <nav className="hidden md:flex gap-8 text-sm font-medium">
            {['Recursos', 'Planos', 'Dúvidas'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace('ú', 'u')}`}
                className={`transition-colors relative group ${isScrolled ? 'text-slate-600 hover:text-blue-600' : 'text-white/75 hover:text-white'}`}
              >
                {item}
                <span className={`absolute bottom-[-4px] left-0 w-0 h-0.5 transition-all group-hover:w-full ${isScrolled ? 'bg-blue-600' : 'bg-white'}`}></span>
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <a
              href="/auth/login"
              className={`text-sm font-semibold transition-colors ${isScrolled ? 'text-slate-600 hover:text-slate-900' : 'text-white/75 hover:text-white'}`}
            >
              Entrar
            </a>
            <a
              href="/auth/register?plan=free"
              className="px-5 py-2.5 rounded-full btn-orange text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-orange-500/30 cursor-pointer"
            >
              Criar conta grátis <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-lg transition-colors ${isScrolled ? 'text-slate-700' : 'text-white'}`}
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          >
            {mobileMenuOpen ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
          </button>
        </div>

        {mobileMenuOpen && (
          <nav
            className="md:hidden absolute top-full left-0 w-full bg-white border-t border-slate-100 shadow-xl flex flex-col p-4 gap-1 animate-fade-in-up"
            aria-label="Menu mobile"
          >
            <a href="#planos" onClick={() => setMobileMenuOpen(false)} className="text-slate-700 font-medium min-h-[44px] flex items-center px-3 rounded-lg hover:bg-slate-50">Planos</a>
            <a href="/auth/login" className="text-slate-700 font-medium min-h-[44px] flex items-center px-3 rounded-lg hover:bg-slate-50">Entrar</a>
            <a href="/auth/register?plan=free" className="btn-orange text-white text-center min-h-[48px] flex items-center justify-center p-3 rounded-lg font-bold cursor-pointer">Criar conta grátis</a>
          </nav>
        )}
      </header>

      <main className="relative z-10">

        {/* ================================================================
            SEÇÃO 1 — HERO (Espelho)
        ================================================================ */}
        <section className="relative min-h-screen flex items-center justify-center pt-20 pb-16 overflow-hidden bg-slate-950">
          {/* Animated gradient orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
            <div className="absolute -top-[20%] -left-[10%] w-[600px] h-[600px] bg-blue-600/25 rounded-full blur-[120px] animate-blob"></div>
            <div className="absolute -bottom-[10%] -right-[5%] w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[100px] animate-blob-2"></div>
            <div className="absolute top-[40%] left-[55%] w-[300px] h-[300px] bg-indigo-500/15 rounded-full blur-[80px] animate-blob-3"></div>
          </div>
          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
              backgroundSize: '60px 60px'
            }}
            aria-hidden
          ></div>

          {/* Notificação StudyTrack — direita em telas sm+ */}
          <div
            className="absolute right-3 top-[16%] sm:right-6 sm:top-[20%] md:right-10 md:top-1/4 z-10 animate-notification-in w-[200px] sm:w-[220px] md:w-[260px] max-sm:hidden"
            aria-hidden
          >
            <div className="glass rounded-2xl border border-white/10 p-3.5 shadow-xl">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                  <Brain className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">StudyTrack</p>
                  <p className="text-emerald-400 text-[10px] font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Agora
                  </p>
                </div>
              </div>
              <p className="text-white/80 text-xs leading-snug">
                Missões sendo enviadas agora
              </p>
            </div>
          </div>

          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

            {/* Notificação StudyTrack — acima do texto em telas menores */}
            <div className="sm:hidden flex justify-center mb-6 animate-notification-in" aria-hidden>
              <div className="glass rounded-2xl border border-white/10 p-3.5 shadow-xl w-full max-w-[240px]">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                    <Brain className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">StudyTrack</p>
                    <p className="text-emerald-400 text-[10px] font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Agora
                    </p>
                  </div>
                </div>
                <p className="text-white/80 text-xs leading-snug">
                  Missões sendo enviadas agora
                </p>
              </div>
            </div>

            {/* Headline */}
            <h1
              className="text-2xl sm:text-4xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-[1.1] animate-fade-in-up"
              style={{ animationDelay: '0.2s' }}
            >
              Enquanto você decide o que estudar hoje,{' '}
              <span className="text-gradient">outra pessoa acabou de fechar o conteúdo que vai te custar pontos.</span>
            </h1>

            {/* Subtítulo */}
            <p
              className="text-base md:text-lg text-white/60 mb-10 leading-relaxed max-w-2xl mx-auto animate-fade-in-up"
              style={{ animationDelay: '0.3s' }}
            >
              A IA da StudyTrack analisa onde estão suas lacunas, cruza com o que o ENEM mais cobra — e envia sua missão diária direto no WhatsApp, toda manhã às 8h. Você acorda sabendo exatamente o que fazer. Sem decidir nada. Sem cronograma que quebra na primeira quarta-feira difícil.
            </p>

            {/* CTA */}
            <div
              className="flex flex-col items-center gap-3 animate-fade-in-up"
              style={{ animationDelay: '0.4s' }}
            >
              <a
                href="/auth/register?plan=free"
                className="btn-orange inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 rounded-2xl text-white font-bold text-lg shadow-2xl cursor-pointer"
              >
                Ver minha lacuna principal agora →
              </a>
              <p className="text-xs text-white/35">3 dias grátis · Sem cartão · Cancela em 1 toque</p>
            </div>

          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce max-md:hidden" aria-hidden>
            <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center pt-2">
              <div className="w-1.5 h-3 rounded-full bg-white/35"></div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SEÇÃO 2 — VILÃO NOMEADO
        ================================================================ */}
        <section className="py-16 sm:py-24 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="reveal text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
                Você não tem problema de disciplina.{' '}
                <span className="text-gradient-dark">Você tem um problema de mapa.</span>
              </h2>
            </div>

            <div className="space-y-5">
              {[
                {
                  n: '01',
                  title: 'O ENEM tem um padrão específico — e ele pode ser mapeado',
                  text: 'O ENEM cobra padrões concentrados em menos de 30% do conteúdo total — e esses padrões se repetem há 20 anos. Existem tipos de questão, estruturas de argumento e contextos temáticos que aparecem de forma consistente em quase todas as edições. Conhecer esses padrões e praticar especificamente com eles é o diferencial que separa quem acerta de quem erra. A StudyTrack mapeia exatamente onde o ENEM concentra as cobranças e direciona seu estudo para lá.',
                  from: 'from-red-50',
                  to: 'to-orange-50/50',
                  border: 'border-red-100',
                  numColor: 'text-red-200',
                },
                {
                  n: '02',
                  title: 'O Google está te afogando',
                  text: 'Você abre o Google para decidir o que estudar. Aparecem 900 tópicos. "Por onde começo?" Você abre três abas, lê introduções, fecha tudo e sente um peso no peito difícil de nomear. Não é preguiça. É a sensação de estar em um labirinto sem mapa — onde cada passo parece igualmente válido e igualmente inútil. Isso não é fraqueza. É resposta cognitiva normal a sobrecarga de informação sem hierarquia.',
                  from: 'from-blue-50',
                  to: 'to-indigo-50/50',
                  border: 'border-blue-100',
                  numColor: 'text-blue-200',
                },
                {
                  n: '03',
                  title: 'O cronograma é uma ilusão de controle',
                  text: 'Todo domingo, o mesmo ritual: você monta um cronograma novo. Distribui as matérias, coloca os horários, sente aquela sensação de que desta vez vai funcionar. Na quarta-feira, um imprevisto. O cronograma quebra. E junto com ele, vem a culpa — aquela sensação de que você é o problema, que faltou disciplina, que você não consegue. No domingo seguinte, você monta de novo. Esse ciclo não é seu fracasso. É o fracasso do instrumento errado para um problema real.',
                  from: 'from-violet-50',
                  to: 'to-purple-50/50',
                  border: 'border-violet-100',
                  numColor: 'text-violet-200',
                },
              ].map((b, i) => (
                <div
                  key={i}
                  className={`reveal reveal-d${i + 1} bg-gradient-to-br ${b.from} ${b.to} border ${b.border} rounded-3xl p-7 sm:p-8 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group`}
                >
                  <div className="flex items-start gap-4">
                    <span className={`text-5xl font-black ${b.numColor} shrink-0 leading-none select-none`}>{b.n}</span>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-3">{b.title}</h3>
                      <p className="text-slate-600 leading-relaxed">{b.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cards de identificação */}
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-3 reveal reveal-d3">
              {[
                'Estudo 4 horas e saio com sensação de que não fiz nada.',
                'Já montei cinco cronogramas esse ano.',
                'Tenho medo de chegar na prova e não lembrar nada.',
                'Todo mundo da minha turma já está na faculdade.',
                'Eu não sei se sou inteligente o suficiente.',
              ].map((text, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-200 hover:shadow-sm transition-all duration-200 ${i === 4 ? 'sm:col-span-2' : ''}`}
                >
                  <div className="mt-0.5 w-5 h-5 rounded border-2 border-blue-300 bg-white shrink-0 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-sm bg-blue-500"></div>
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            SEÇÃO 3 — WHATSAPP COMO REVOLUÇÃO
        ================================================================ */}
        <section id="section-whatsapp" className="py-16 sm:py-24 bg-slate-950 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute top-0 right-[-10%] w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-0 left-[-5%] w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[80px]"></div>
          </div>

          <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
            <div className="reveal text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                Você passa horas por dia no WhatsApp.{' '}
                <span className="text-gradient">A partir de amanhã, uma delas vai mudar o resultado da sua vida.</span>
              </h2>
            </div>

            <p className="reveal reveal-d1 text-base md:text-lg text-white/55 leading-relaxed max-w-2xl mx-auto text-center mb-14">
              Outros apps te dão conteúdo — você vai lá buscar, quando lembra, quando tem energia. Outros cursos te dão aula — você assiste quando consegue encaixar na semana. A StudyTrack não te dá conteúdo. A StudyTrack entra no ambiente onde você já vive — e entrega direção onde você já está.
            </p>

            {/* WhatsApp Mock — smartphone realista */}
            <div className="mx-auto mb-16 reveal reveal-d2 w-full" style={{ maxWidth: '260px' }}>
              <div className="relative">
                {/* Glow ambiente */}
                <div className="absolute inset-0 bg-emerald-500/25 blur-3xl rounded-[3rem] scale-95 translate-y-4" aria-hidden></div>

                {/* Chassis externo — frame do celular */}
                <div className="relative w-full" style={{
                  maxWidth: '260px',
                  background: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 40%, #111 100%)',
                  borderRadius: '44px',
                  padding: '10px',
                  boxShadow: '0 0 0 1px #3a3a3a, 0 30px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08)',
                }}>

                  {/* Botão power — direita */}
                  <div className="absolute" style={{ right: '-3px', top: '100px', width: '3px', height: '56px', background: 'linear-gradient(to right, #2a2a2a, #3a3a3a)', borderRadius: '0 3px 3px 0' }} aria-hidden></div>
                  {/* Botão volume up — esquerda */}
                  <div className="absolute" style={{ left: '-3px', top: '80px', width: '3px', height: '36px', background: 'linear-gradient(to left, #2a2a2a, #3a3a3a)', borderRadius: '3px 0 0 3px' }} aria-hidden></div>
                  {/* Botão volume down — esquerda */}
                  <div className="absolute" style={{ left: '-3px', top: '128px', width: '3px', height: '36px', background: 'linear-gradient(to left, #2a2a2a, #3a3a3a)', borderRadius: '3px 0 0 3px' }} aria-hidden></div>
                  {/* Botão silenciar — esquerda */}
                  <div className="absolute" style={{ left: '-3px', top: '52px', width: '3px', height: '22px', background: 'linear-gradient(to left, #2a2a2a, #3a3a3a)', borderRadius: '3px 0 0 3px' }} aria-hidden></div>

                  {/* Tela (inner bezel) */}
                  <div style={{
                    borderRadius: '36px',
                    overflow: 'hidden',
                    background: '#0B141A',
                    position: 'relative',
                  }}>
                    {/* Status bar com Dynamic Island */}
                    <div style={{ background: '#0B141A', paddingTop: '12px', paddingBottom: '4px', paddingLeft: '20px', paddingRight: '20px' }}>
                      {/* Dynamic Island */}
                      <div style={{
                        width: '88px',
                        height: '28px',
                        background: '#000',
                        borderRadius: '20px',
                        margin: '0 auto 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1a1a1a', border: '1.5px solid #2a2a2a' }}></div>
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#222' }}></div>
                      </div>
                      {/* Status icons */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '4px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '11px', fontWeight: 600, letterSpacing: '-0.3px', fontVariantNumeric: 'tabular-nums' }}>8:00</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          {/* Signal */}
                          <div style={{ display: 'flex', gap: '1.5px', alignItems: 'flex-end' }}>
                            {[5, 7, 9, 11].map((h, i) => (
                              <div key={i} style={{ width: '3px', height: `${h}px`, background: i < 3 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)', borderRadius: '1px' }}></div>
                            ))}
                          </div>
                          {/* WiFi */}
                          <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                            <path d="M7 8.5C7.83 8.5 8.5 9.17 8.5 10S7.83 11.5 7 11.5 5.5 10.83 5.5 10 6.17 8.5 7 8.5z" fill="rgba(255,255,255,0.85)"/>
                            <path d="M3.5 6.5C4.6 5.4 6 4.7 7 4.7s2.4.7 3.5 1.8" stroke="rgba(255,255,255,0.85)" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
                            <path d="M1 4C2.8 2.2 4.8 1.2 7 1.2s4.2 1 6 2.8" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
                          </svg>
                          {/* Battery */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
                            <div style={{ width: '20px', height: '10px', border: '1.5px solid rgba(255,255,255,0.6)', borderRadius: '3px', padding: '1.5px', position: 'relative' }}>
                              <div style={{ width: '75%', height: '100%', background: 'rgba(255,255,255,0.85)', borderRadius: '1px' }}></div>
                            </div>
                            <div style={{ width: '2px', height: '5px', background: 'rgba(255,255,255,0.5)', borderRadius: '0 1px 1px 0' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp header */}
                    <div style={{ background: '#1F2C34', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(16,185,129,0.2)', border: '1.5px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Brain className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: '#E9EDEF', fontSize: '13px', fontWeight: 600, lineHeight: '1.2' }}>StudyTrack IA</p>
                        <p style={{ color: '#25D366', fontSize: '10px', lineHeight: '1.4' }}>● online agora</p>
                      </div>
                      <div style={{ display: 'flex', gap: '14px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11.5 19.79 19.79 0 01.12 2.82 2 2 0 012.11 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.09"/></svg>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                      </div>
                    </div>

                    {/* Chat body */}
                    <div style={{ background: '#0B141A', padding: '12px 10px 10px', minHeight: '280px', backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(37,211,102,0.04) 0%, transparent 60%)' }}>
                      {/* Timestamp */}
                      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                        <span style={{ background: 'rgba(17,27,33,0.9)', color: '#8696A0', fontSize: '10px', padding: '2px 8px', borderRadius: '6px' }}>Hoje</span>
                      </div>

                      {/* Bolha da mensagem */}
                      <div style={{ background: '#1F2C34', borderRadius: '12px 12px 12px 3px', padding: '8px 10px', maxWidth: '94%', boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                        <p style={{ color: '#25D366', fontSize: '10px', fontWeight: 700, marginBottom: '5px' }}>StudyTrack IA</p>
                        <p style={{ color: '#E9EDEF', fontSize: '11px', lineHeight: '1.5', marginBottom: '8px' }}>Bom dia! ☀️ Sua missão de hoje:</p>

                        {/* Card da missão */}
                        <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(37,211,102,0.15)', borderRadius: '10px', padding: '8px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                            <div style={{ width: '3px', height: '28px', background: '#25D366', borderRadius: '2px', flexShrink: 0 }}></div>
                            <div>
                              <p style={{ color: '#E9EDEF', fontSize: '11px', fontWeight: 600, lineHeight: '1.3' }}>📌 Interpretação de Texto</p>
                              <p style={{ color: '#8696A0', fontSize: '9.5px', lineHeight: '1.3' }}>sua maior lacuna esta semana</p>
                            </div>
                          </div>
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <p style={{ color: '#E9EDEF', fontSize: '10.5px', lineHeight: '1.4' }}>▶ Vídeo: Inferência — 18 min</p>
                            <p style={{ color: '#E9EDEF', fontSize: '10.5px', lineHeight: '1.4' }}>📝 12 questões (ENEM 2019–23)</p>
                            <p style={{ color: '#E9EDEF', fontSize: '10.5px', lineHeight: '1.4' }}>🔁 Revisão: &apos;embora&apos; — 5 min</p>
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '5px', marginTop: '2px' }}>
                              <p style={{ color: '#25D366', fontSize: '11px', fontWeight: 700 }}>⏱ Total: 43 min</p>
                            </div>
                          </div>
                        </div>

                        <p style={{ color: '#8696A0', fontSize: '9.5px', textAlign: 'right', marginTop: '5px' }}>8:00 ✓✓</p>
                      </div>
                    </div>

                    {/* Input bar */}
                    <div style={{ background: '#1F2C34', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, background: '#2A3942', borderRadius: '20px', padding: '7px 12px', display: 'flex', alignItems: 'center' }}>
                        <span style={{ color: '#8696A0', fontSize: '11px' }}>Mensagem</span>
                      </div>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#00A884', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
                      </div>
                    </div>

                    {/* Home indicator */}
                    <div style={{ background: '#0B141A', padding: '8px 0 10px', display: 'flex', justifyContent: 'center' }}>
                      <div style={{ width: '100px', height: '4px', background: 'rgba(255,255,255,0.25)', borderRadius: '2px' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabela Antes/Depois */}
            <div className="reveal reveal-d3 overflow-hidden rounded-2xl border border-white/8 shadow-2xl">
              <div className="grid grid-cols-2">
                <div className="glass px-4 py-3 text-center border-r border-white/8">
                  <p className="font-bold text-white/55 text-sm">Hoje, sem a StudyTrack</p>
                </div>
                <div className="px-4 py-3 text-center" style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}>
                  <p className="font-bold text-white text-sm">A partir de amanhã</p>
                </div>
              </div>
              {[
                ['Acorda sem saber por onde começar', 'Acorda com a missão esperando no WhatsApp'],
                ['Passa 30 min decidindo o que estudar', 'Abre o WhatsApp e começa em 30 segundos'],
                ['O cronograma quebra e a culpa acumula', 'Faltou um dia? O algoritmo redistribui sozinho'],
                ['Estuda muito, sem saber se está no caminho certo', 'Cada hora vai para a sua maior lacuna real'],
                ['Chega na prova sem confiança no que treinou', 'Chega sabendo exatamente o que praticou — e por quê'],
              ].map(([before, after], i) => (
                <div key={i} className={`grid grid-cols-2 ${i % 2 === 0 ? 'bg-white/[0.03]' : 'bg-white/[0.01]'}`}>
                  <div className="px-4 py-4 border-r border-white/8 flex items-start">
                    <p className="text-sm text-white/40 leading-relaxed">{before}</p>
                  </div>
                  <div className="px-4 py-4 flex items-start">
                    <p className="text-sm text-white/85 font-medium leading-relaxed">{after}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            SEÇÃO 4 — ANTI-CULPA
        ================================================================ */}
        <section className="py-16 sm:py-24 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="reveal">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-8 text-center leading-tight">
                Você não é ruim em matemática. Você só nunca estudou matemática{' '}
                <span className="text-gradient-dark">do jeito que o ENEM pergunta.</span>
              </h2>
            </div>
            <div className="reveal reveal-d1 space-y-5 mb-10">
              <p className="text-base md:text-lg text-slate-600 leading-relaxed">
                O ENEM não testa memorização de fórmulas. Ele testa raciocínio aplicado a contextos novos — a capacidade de pegar um conceito e usá-lo em uma situação que você nunca viu antes. É um formato que exige treino específico e direcionado.
              </p>
              <p className="text-base md:text-lg text-slate-600 leading-relaxed">
                É por isso que a nota no colégio nem sempre prediz o resultado no ENEM — e por isso que estudantes considerados &quot;medianos&quot; aprovam com nota alta quando treinam da forma certa. A diferença não é inteligência — é calibração. É saber o que o ENEM realmente cobra e praticar especificamente isso.
              </p>
              <p className="text-base md:text-lg text-slate-600 leading-relaxed">
                Você não está atrasado porque é menos capaz. Você está atrasado porque ninguém nunca te mostrou o mapa certo.
              </p>
            </div>
            {/* Gradient border blockquote */}
            <div className="reveal reveal-d2 p-px rounded-3xl" style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}>
              <div className="bg-white rounded-3xl px-7 py-6">
                <p className="text-lg md:text-xl font-semibold text-slate-900 leading-relaxed">
                  O recurso escasso não é inteligência. É saber onde o ENEM vai te cobrar — e praticar especificamente isso.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SEÇÃO 5 — TRANSFORMAÇÃO
        ================================================================ */}
        <section className="py-16 sm:py-24 relative overflow-hidden" style={{ background: 'linear-gradient(150deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)' }}>
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute top-[-20%] left-[20%] w-[400px] h-[400px] bg-violet-600/15 rounded-full blur-[80px]"></div>
          </div>
          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center reveal">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-10 leading-tight">
              Imagine acordar amanhã sabendo exatamente o que estudar.{' '}
              <span className="text-gradient">Sem decidir nada. Sem duvidar de nada. Só executar.</span>
            </h2>
            <div className="glass rounded-3xl px-7 sm:px-10 py-8">
              <p className="text-base md:text-xl text-white/65 italic leading-relaxed">
                São 23h. Você fecha o caderno. Mas dessa vez é diferente. Você não sente o vácuo de sempre. Você sabe o que estudou. Sabe por quê estudou. E sabe o que a missão de amanhã vai trazer. Pela primeira vez em meses — você dorme sem culpa.
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================
            SEÇÃO 6 — MECANISMO (Bento Grid)
        ================================================================ */}
        <section id="recursos" className="py-16 sm:py-24 bg-slate-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14 reveal">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 leading-tight">
                Não é um app de estudos. É um sistema que{' '}
                <span className="text-gradient-dark">aprende com você</span>{' '}
                — e fica mais preciso a cada dia.
              </h2>
              <p className="text-slate-500 text-base max-w-2xl mx-auto">
                A maioria dos apps te dá conteúdo. A StudyTrack te diz o que estudar amanhã — baseado em quem você é hoje.
              </p>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

              {/* 01 */}
              <div className="reveal bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 group-hover:bg-blue-100 transition-colors flex items-center justify-center mb-4">
                  <span className="text-blue-600 font-black text-sm">01</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Você conta seu ponto de partida</h3>
                <p className="text-slate-500 text-sm leading-relaxed">A IA não te dá um plano genérico. Ela constrói o seu — a partir do que você sabe, do que você precisa e do tempo que você tem.</p>
              </div>

              {/* 02 */}
              <div className="reveal reveal-d1 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-2xl bg-violet-50 group-hover:bg-violet-100 transition-colors flex items-center justify-center mb-4">
                  <span className="text-violet-600 font-black text-sm">02</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">A IA cruza 3 variáveis</h3>
                <p className="text-slate-500 text-sm leading-relaxed">Seu histórico real + 20 anos de padrões do ENEM + seu tempo disponível. O resultado é uma direção que não existe para mais ninguém.</p>
              </div>

              {/* 03 — Featured card, spans rows on lg */}
              <div className="reveal reveal-d2 bg-gradient-to-br from-blue-600 to-violet-700 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 text-white sm:col-span-2 lg:col-span-1 lg:row-span-2">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                  <span className="text-white font-black text-sm">03</span>
                </div>
                <h3 className="text-lg font-bold mb-3">A missão chega no WhatsApp às 8h</h3>
                <p className="text-blue-100 text-sm leading-relaxed mb-6">Vídeo + questões + revisão — antes de você precisar decidir qualquer coisa. O dia começa com clareza, não com paralisia.</p>
                {/* Mini preview */}
                <div className="bg-white/10 border border-white/15 rounded-2xl p-3 text-xs text-blue-100 space-y-1.5">
                  <p className="font-bold text-white text-[11px]">📱 StudyTrack IA — 8h00</p>
                  <p>📌 Missão: Geometria Espacial</p>
                  <p>▶ Vídeo 15min · 📝 10 questões</p>
                  <p className="text-white/50">⏱ Total: 38 min</p>
                </div>
              </div>

              {/* 04 */}
              <div className="reveal reveal-d1 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 group-hover:bg-emerald-100 transition-colors flex items-center justify-center mb-4">
                  <span className="text-emerald-600 font-black text-sm">04</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Faltou um dia? O algoritmo redistribui</h3>
                <p className="text-slate-500 text-sm leading-relaxed">Nenhum atraso acumulado. Nenhuma culpa. O sistema absorve o imprevisto e recomeça do ponto certo — automaticamente.</p>
              </div>

              {/* 05 */}
              <div className="reveal reveal-d2 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 group-hover:bg-orange-100 transition-colors flex items-center justify-center mb-4">
                  <span className="text-orange-600 font-black text-sm">05</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">A IA aprende suas lacunas em tempo real</h3>
                <p className="text-slate-500 text-sm leading-relaxed">Quanto mais você usa, mais precisa fica a direção. O sistema não te dá o mesmo plano todo dia — ele te dá o plano certo para quem você é hoje.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SEÇÃO 6.5 — PLATAFORMA COMPLETA
        ================================================================ */}
        <section className="py-16 sm:py-24 bg-slate-950 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute top-[-10%] right-[5%] w-[350px] h-[350px] bg-blue-600/10 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-[-10%] left-[5%] w-[300px] h-[300px] bg-violet-600/10 rounded-full blur-[80px]"></div>
          </div>

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
            <div className="reveal text-center mb-12">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">Plataforma completa</p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight">
                O WhatsApp é onde começa.{' '}
                <span className="text-gradient">A plataforma é onde você vai fundo.</span>
              </h2>
              <p className="mt-4 text-white/50 text-base max-w-xl mx-auto">
                Por trás da missão diária, existe uma plataforma construída para cada momento da sua preparação.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

              {/* Card destaque — banco de questões */}
              <div className="reveal sm:col-span-2 rounded-3xl p-6 sm:p-8 border border-white/8 hover:border-blue-500/30 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(124,58,237,0.08) 100%)' }}>
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden></div>
                <div className="relative z-10">
                  <div className="w-11 h-11 rounded-2xl bg-blue-500/20 border border-blue-400/20 flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-colors">
                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Banco de 5.000+ questões — filtradas pela sua lacuna</h3>
                  <p className="text-white/55 text-sm leading-relaxed">Não são questões aleatórias. Cada exercício foi selecionado com base no que o ENEM cobrou nos últimos 20 anos e cruzado com o ponto exato onde você precisa praticar. Você nunca perde tempo com o que já sabe.</p>
                </div>
              </div>

              {/* Biblioteca digital */}
              <div className="reveal reveal-d1 rounded-3xl p-6 border border-white/8 hover:border-violet-500/30 hover:-translate-y-1 transition-all duration-300 group" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="w-11 h-11 rounded-2xl bg-violet-500/20 border border-violet-400/20 flex items-center justify-center mb-4 group-hover:bg-violet-500/30 transition-colors">
                  <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <h3 className="text-base font-bold text-white mb-2">Biblioteca digital</h3>
                <p className="text-white/50 text-sm leading-relaxed">O material certo, no momento certo. Sem precisar garimpar no YouTube — o conteúdo já está vinculado à sua missão do dia.</p>
              </div>

              {/* Simulados */}
              <div className="reveal rounded-3xl p-6 border border-white/8 hover:border-orange-500/30 hover:-translate-y-1 transition-all duration-300 group" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="w-11 h-11 rounded-2xl bg-orange-500/20 border border-orange-400/20 flex items-center justify-center mb-4 group-hover:bg-orange-500/30 transition-colors">
                  <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-base font-bold text-white mb-2">Simulados com pressão de tempo</h3>
                <p className="text-white/50 text-sm leading-relaxed">Treinar sem pressão é diferente de treinar com ela. Os simulados replicam as condições reais do ENEM — para o dia da prova não ser a primeira vez que você sente isso.</p>
              </div>

              {/* Jogos educacionais */}
              <div className="reveal reveal-d1 rounded-3xl p-6 border border-white/8 hover:border-emerald-500/30 hover:-translate-y-1 transition-all duration-300 group" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/20 flex items-center justify-center mb-4 group-hover:bg-emerald-500/30 transition-colors">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>
                </div>
                <h3 className="text-base font-bold text-white mb-2">Jogos educacionais</h3>
                <p className="text-white/50 text-sm leading-relaxed">Revisão que não parece revisão. Quando o conteúdo vira jogo, você retém mais — e fica mais tempo estudando sem perceber.</p>
              </div>

              {/* Gamificação + Leaderboard */}
              <div className="reveal rounded-3xl p-6 border border-white/8 hover:border-yellow-500/30 hover:-translate-y-1 transition-all duration-300 group" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="w-11 h-11 rounded-2xl bg-yellow-500/20 border border-yellow-400/20 flex items-center justify-center mb-4 group-hover:bg-yellow-500/30 transition-colors">
                  <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <h3 className="text-base font-bold text-white mb-2">Gamificação e leaderboard</h3>
                <p className="text-white/50 text-sm leading-relaxed">Você estuda melhor quando sabe que não está sozinho nisso. Pontos, conquistas e ranking transformam consistência em identidade.</p>
              </div>

              {/* Painel de metas */}
              <div className="reveal reveal-d1 sm:col-span-2 lg:col-span-1 rounded-3xl p-6 border border-white/8 hover:border-cyan-500/30 hover:-translate-y-1 transition-all duration-300 group" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-400/20 flex items-center justify-center mb-4 group-hover:bg-cyan-500/30 transition-colors">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                </div>
                <h3 className="text-base font-bold text-white mb-2">Painel de metas e evolução</h3>
                <p className="text-white/50 text-sm leading-relaxed">Ver sua evolução muda a forma como você encara a próxima sessão. O painel mostra o que você conquistou — não só o que falta.</p>
              </div>

            </div>

            <div className="reveal reveal-d2 text-center mt-10">
              <p className="text-white/30 text-sm">Tudo isso disponível a partir do plano Básico. Sem configuração. Sem curva de aprendizado.</p>
            </div>
          </div>
        </section>

        {/* ================================================================
            SEÇÃO 7 — PROVA SOCIAL
        ================================================================ */}
        <section className="py-16 sm:py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="reveal text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
                De &quot;não sei por onde começar&quot; para{' '}
                <span className="text-gradient-dark">720 pontos</span>{' '}
                — em 4 meses.
              </h2>
            </div>

            {/* Depoimento narrativo */}
            {/* TODO: substituir pelo caso real quando disponível */}
            <div className="reveal reveal-d1 relative rounded-3xl border border-slate-100 p-7 sm:p-10 shadow-sm mb-12 max-w-2xl mx-auto overflow-hidden" style={{ background: 'linear-gradient(135deg, #F8FAFC, #EFF6FF)' }}>
              {/* Quote decoration */}
              <div className="absolute top-2 right-6 text-9xl font-black text-blue-100/60 leading-none select-none" aria-hidden>&ldquo;</div>

              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0" style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}>M</div>
                <div>
                  <p className="font-bold text-slate-900">Mariana S.</p>
                  <p className="text-xs text-slate-500">Aprovada em Medicina — ENEM 2024</p>
                  <div className="flex gap-0.5 mt-1">
                    {Array(5).fill(0).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-orange-400 text-orange-400" />
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-slate-600 leading-relaxed mb-4 relative z-10">
                &ldquo;Por três anos eu montei cronograma, estudei horas, assisti aula. Saía exausta e ainda com a sensação de que não era suficiente. Todo domingo de novo. Toda quarta-feira, o mesmo ciclo de culpa.&rdquo;
              </p>
              <p className="text-slate-600 leading-relaxed mb-4 relative z-10">
                &ldquo;Quando comecei a receber a missão toda manhã, algo mudou. Não era mais eu decidindo — era a IA me dizendo onde estava minha lacuna e o que fazer naquele dia. Eu só executava. A sensação de paralisia foi embora na primeira semana.&rdquo;
              </p>
              <p className="text-slate-700 leading-relaxed font-medium relative z-10">
                &ldquo;No dia da prova, eu sabia exatamente o que eu tinha treinado. Não havia mais dúvida de se tinha sido suficiente. Tinha sido preciso. 720 pontos. Medicina. Eu não consigo explicar o que esse número significa para a minha família.&rdquo;
              </p>
            </div>

            {/* Métricas animadas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4" ref={metricsRef}>
              {[
                { val: counts.students, suffix: '', fmt: (v: number) => v.toLocaleString('pt-BR'), label: 'estudantes ativos' },
                { val: counts.clarity, suffix: '%', fmt: (v: number) => String(v), label: 'relatam mais clareza após 7 dias' },
                { val: counts.questions, suffix: '+', fmt: (v: number) => v.toLocaleString('pt-BR'), label: 'questões filtradas por lacuna' },
                { val: counts.essay, suffix: '%', fmt: (v: number) => `+${v}`, label: 'nota de redação após 60 dias' },
              ].map((m, i) => (
                <div
                  key={i}
                  className="reveal bg-white rounded-2xl border border-slate-100 p-5 text-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <p className="text-3xl font-extrabold mb-1 tabular-nums text-gradient-dark">
                    {m.fmt(m.val)}{m.suffix}
                  </p>
                  <p className="text-xs text-slate-500 leading-snug">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            SEÇÃO 8 — URGÊNCIA PSICOLÓGICA
        ================================================================ */}
        <section className="py-16 sm:py-24 bg-slate-950 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute bottom-0 left-[30%] w-[400px] h-[300px] bg-orange-500/10 rounded-full blur-[80px]"></div>
          </div>
          <div className="relative max-w-3xl mx-auto px-4 sm:px-6">
            <div className="reveal text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                <span className="text-white">Cada semana sem um plano não é neutra. </span>
                <span className="text-orange-400">É uma semana que você não vai recuperar.</span>
              </h2>
            </div>
            <div className="reveal reveal-d1 space-y-5 mb-10">
              <p className="text-base md:text-lg text-white/55 leading-relaxed">
                Uma hora estudando o que não cai no ENEM não é zero — é menos um. Não é neutra porque poderia ter sido investida no que realmente importa. Lacunas não fechadas viram questões erradas. Questões erradas viram pontos perdidos. Pontos perdidos viram mais um ano esperando, mais uma inscrição, mais um ciclo de promessa e quebra.
              </p>
              <p className="text-base md:text-lg text-white/55 leading-relaxed">
                O problema não é que você não se esforçou. O problema é que o esforço foi investido sem mapa — e esforço sem direção não acumula, ele se dissipa.
              </p>
            </div>
            <div className="reveal reveal-d2 glass rounded-3xl border border-orange-500/15 px-4 sm:px-8 py-8 text-center">
              <p className="text-lg md:text-xl text-white italic leading-relaxed">
                &ldquo;Se você soubesse agora quais são suas três maiores lacunas para o ENEM — quantas horas de estudo errado você teria evitado nos últimos 30 dias?&rdquo;
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================
            SEÇÃO 9 — PREÇOS
        ================================================================ */}
        <section id="planos" className="py-16 sm:py-24 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-30 pointer-events-none" aria-hidden>
            <div className="absolute top-[20%] right-[10%] w-96 h-96 bg-blue-600 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-[10%] left-[10%] w-96 h-96 bg-violet-600 rounded-full blur-[100px]"></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16 reveal">
              <h2 className="text-2xl md:text-4xl font-bold mb-4 leading-tight max-w-2xl mx-auto">
                Direção personalizada, todos os dias.{' '}
                <span className="text-gradient">Pelo preço de uma assinatura de streaming.</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">

              {/* Trial */}
              <div className="reveal flex flex-col h-full glass border border-white/10 p-8 rounded-3xl relative group hover:border-white/20 hover:-translate-y-1 transition-all duration-300">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide whitespace-nowrap">Degustação</div>
                <h3 className="text-lg font-medium text-slate-400">Trial 72h</h3>
                <div className="my-4"><span className="text-4xl font-bold text-white">Grátis</span></div>
                <p className="text-sm text-slate-400 mb-6 flex-1">Não acredite em nós. Experimente.</p>
                <div className="mt-auto">
                  <a href="/auth/register?plan=free" className="block w-full py-3 rounded-xl border border-white/15 hover:bg-white/10 text-center font-semibold transition-all cursor-pointer">Criar minha conta grátis</a>
                  <div className="mt-6 space-y-3 text-sm text-slate-400">
                    <p className="flex gap-2 items-center"><CheckCircle className="w-4 h-4 shrink-0" /> Missão diária no WhatsApp</p>
                    <p className="flex gap-2 items-center"><CheckCircle className="w-4 h-4 shrink-0" /> Banco de questões</p>
                  </div>
                </div>
              </div>

              {/* Básico */}
              <div className="reveal reveal-d1 flex flex-col h-full glass border border-white/10 p-8 rounded-3xl relative hover:border-white/20 hover:-translate-y-1 transition-all duration-300">
                <h3 className="text-lg font-medium text-blue-300">Básico</h3>
                <div className="my-4 flex items-end gap-1">
                  <span className="text-4xl font-bold text-white">R$ 14,90</span>
                  <span className="text-xs text-slate-400 mb-1">/mês</span>
                </div>
                <p className="text-sm text-slate-400 mb-6 flex-1">Para quem está começando a entender que precisa de direção.</p>
                <div className="mt-auto">
                  <a href="/auth/register?plan=basic" className="block w-full py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 text-center font-semibold transition-all border border-white/10 cursor-pointer">Começar com o Básico</a>
                  <div className="mt-6 space-y-3 text-sm text-slate-300">
                    <p className="flex gap-2 items-center"><CheckCircle className="w-4 h-4 text-blue-400 shrink-0" /> Tudo do Trial</p>
                    <p className="flex gap-2 items-center"><CheckCircle className="w-4 h-4 text-blue-400 shrink-0" /> Cronograma automático</p>
                  </div>
                </div>
              </div>

              {/* Pro */}
              <div className="reveal reveal-d2 flex flex-col h-full bg-gradient-to-b from-blue-600 to-blue-900 p-8 pt-10 rounded-3xl shadow-2xl shadow-blue-900/50 border border-blue-400/40 relative animate-pulse-glow z-10 order-first xl:order-none md:col-span-2 xl:col-span-1 hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg flex gap-1 items-center whitespace-nowrap" style={{ background: 'linear-gradient(135deg, #F97316, #EF4444)' }}>
                  <Star className="w-3 h-3 fill-white" /> Mais Escolhido
                </div>
                <h3 className="text-lg font-medium text-blue-100">Pro Aprovação</h3>
                <div className="my-4 flex items-end gap-1">
                  <span className="text-5xl font-bold text-white">R$ 29,90</span>
                  <span className="text-sm text-blue-200 mb-2">/mês</span>
                </div>
                <p className="text-sm text-blue-100 mb-8 opacity-90 flex-1">Para quem quer passar. O sistema completo que não quebra — nem nos dias ruins.</p>
                <div className="mt-auto">
                  <a href="/auth/register?plan=pro" className="block w-full py-4 rounded-xl bg-white text-blue-700 text-center font-bold hover:bg-blue-50 transition-all shadow-lg cursor-pointer">Ativar meu plano Pro</a>
                  <div className="mt-8 space-y-4 text-sm text-white font-medium">
                    <div className="flex gap-3 items-center"><div className="p-1 bg-blue-500 rounded-full shrink-0"><CheckCircle className="w-3 h-3" /></div>Tudo do Básico</div>
                    <div className="flex gap-3 items-center"><div className="p-1 bg-blue-500 rounded-full shrink-0"><CheckCircle className="w-3 h-3" /></div>Simulados completos</div>
                    <div className="flex gap-3 items-center"><div className="p-1 bg-blue-500 rounded-full shrink-0"><Brain className="w-3 h-3" /></div>Tutor de Exatas passo a passo</div>
                  </div>
                </div>
              </div>

              {/* Redação Master — Em breve */}
              <div className="reveal reveal-d3 flex flex-col h-full bg-slate-900/60 border border-slate-600/50 p-8 rounded-3xl relative opacity-75 cursor-not-allowed transition-all duration-300">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-600 text-slate-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide whitespace-nowrap">Em breve</div>
                <h3 className="text-lg font-medium text-slate-500">Redação Master</h3>
                <div className="my-4 flex items-end gap-1">
                  <span className="text-4xl font-bold text-slate-500">R$ 49,90</span>
                  <span className="text-xs text-slate-500 mb-1">/mês</span>
                </div>
                <p className="text-sm text-slate-500 mb-6 flex-1">Para quem quer dominar o que mais assusta.</p>
                <div className="mt-auto">
                  <span className="block w-full py-3 rounded-xl border border-slate-600 text-slate-500 text-center font-semibold bg-slate-800/50 cursor-not-allowed select-none">Em breve</span>
                  <div className="mt-6 space-y-3 text-sm text-slate-500">
                    <p className="flex gap-2 items-center"><CheckCircle className="w-4 h-4 text-slate-500 shrink-0" /> Tudo do Pro</p>
                    <p className="flex gap-2 items-center"><PenTool className="w-4 h-4 text-slate-500 shrink-0" /> Correção ilimitada de redações</p>
                    <p className="flex gap-2 items-center"><CheckCircle className="w-4 h-4 text-slate-500 shrink-0" /> Feedback estruturado por competência</p>
                  </div>
                </div>
              </div>

            </div>

            <div className="mt-12 text-center space-y-3 reveal">
              <p className="text-slate-400 text-sm flex items-center justify-center gap-2 flex-wrap">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                Sem fidelidade · Cancele a qualquer momento · Suporte via WhatsApp
              </p>
              <p className="text-slate-500 text-sm italic">
                O ENEM é a maior ferramenta de mobilidade social do Brasil. A StudyTrack foi construída com esse princípio.
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================
            SEÇÃO 10 — FAQ EMOCIONAL
        ================================================================ */}
        <section id="duvidas" className="py-16 sm:py-24 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="reveal text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900">Antes de fechar essa página — leia isso.</h2>
            </div>
            <div className="space-y-3">
              {faqItems.map((item, i) => (
                <div
                  key={i}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className={`reveal border rounded-2xl p-6 cursor-pointer group transition-all duration-200 ${
                    openFaq === i
                      ? 'border-blue-200 shadow-md ring-1 ring-blue-100'
                      : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50/50'
                  }`}
                  style={openFaq === i ? { background: 'linear-gradient(135deg, #EFF6FF, #F5F3FF)' } : {}}
                >
                  <div className="flex justify-between items-center gap-4">
                    <h3 className={`flex-1 font-bold text-base sm:text-lg transition-colors ${openFaq === i ? 'text-blue-700' : 'text-slate-700 group-hover:text-blue-600'}`}>
                      {item.question}
                    </h3>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${openFaq === i ? 'bg-blue-100' : 'bg-slate-100 group-hover:bg-blue-50'}`}>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${openFaq === i ? 'rotate-180 text-blue-600' : 'text-slate-400 group-hover:text-blue-500'}`} />
                    </div>
                  </div>
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === i ? 'max-h-64 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                    <p className="text-slate-600 leading-relaxed">{item.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            SEÇÃO 11 — CTA FINAL
        ================================================================ */}
        <section id="section-cta-final" className="py-16 sm:py-28 relative overflow-hidden" style={{ background: 'linear-gradient(150deg, #0F172A 0%, #1E1B4B 40%, #0F172A 100%)' }}>
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute top-[-20%] left-[10%] w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[100px] animate-blob"></div>
            <div className="absolute bottom-[-10%] right-[10%] w-[300px] h-[300px] bg-violet-600/20 rounded-full blur-[80px] animate-blob-2"></div>
          </div>

          <div className="relative max-w-2xl mx-auto px-4 sm:px-6 text-center reveal">
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-8 leading-tight">
              Você já se dedicou. Agora chegou a hora de se dedicar{' '}
              <span className="text-gradient">na direção certa.</span>
            </h2>

            <div className="space-y-2 mb-10 text-base md:text-lg text-white/60">
              <p>O ENEM não é uma prova de quem estudou mais.</p>
              <p>É uma prova de quem estudou melhor.</p>
              <p className="mt-4">A StudyTrack não vai estudar por você. Mas vai garantir que cada hora que você investir vá para o lugar que realmente muda o resultado.</p>
            </div>

            <a
              href="/auth/register?plan=free"
              className="btn-orange inline-flex items-center justify-center gap-2 w-full sm:w-auto px-10 py-5 rounded-2xl text-white font-bold text-lg shadow-2xl cursor-pointer mb-4"
            >
              Quero minha primeira missão amanhã às 8h →
            </a>
            <p className="text-sm text-white/35 mb-8">3 dias grátis · Sem cartão · Se não fizer sentido, não paga nada</p>

            <p className="text-xs text-white/30 italic leading-relaxed max-w-md mx-auto">
              Se a única coisa que mudar depois desta página for você acordar amanhã sabendo exatamente o que estudar — valeu a pena? A página continua aqui se você precisar voltar. A missão de amanhã, não.
            </p>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="bg-slate-950 pt-10 pb-10 border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-0 font-bold text-2xl text-white mb-4">
              <div className="flex items-center justify-center -mr-2">
                <Image
                  src="/logost-transparente-sombra.png"
                  alt="Logo StudyTrack"
                  width={60}
                  height={60}
                  className="w-14 h-14 object-contain"
                  priority
                  unoptimized
                />
              </div>
              <span>Study<span className="text-blue-400">Track</span></span>
            </div>
            <p className="text-white/25 text-sm">© 2025 StudyTrack. Todos os direitos reservados.</p>
          </div>
        </footer>

      </main>
    </div>
  );
}
