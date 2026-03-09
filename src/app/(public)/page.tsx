"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image'; // Importação do Image
import { 
  CheckCircle, 
  ArrowRight, 
  PenTool, 
  Brain, 
  Send,
  Zap,
  Star,
  TrendingUp,
  Clock,
  ChevronDown,
  Menu,
  X,
  Target,
  ShieldCheck
} from 'lucide-react';

// --- CSS CUSTOMIZADO ---
const customStyles = `
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
  .animate-float { animation: float 6s ease-in-out infinite; }
  .animate-pulse-glow { animation: pulse-glow 3s infinite; }
  .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }
  @media (prefers-reduced-motion: reduce) {
    .animate-float, .animate-pulse-glow { animation: none !important; }
    .animate-fade-in-up { animation-duration: 0.01ms !important; }
  }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatStep, setChatStep] = useState(0);
   
  // Estado para controlar qual FAQ está aberto (null = nenhum)
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Conteúdo do FAQ
  const faqItems = [
    {
      question: "Como o StudyTrack se encaixa na minha rotina de estudos?",
      answer: "O StudyTrack organiza seu estudo pessoal de forma inteligente. Analisamos seus objetivos, seu tempo disponível e suas dificuldades para criar um plano que se adapta à sua realidade — seja você estudando em casa, no cursinho ou conciliando com trabalho."
    },
    {
      question: "Funciona se eu não tiver computador?",
      answer: "Com certeza. O StudyTrack foi desenvolvido para funcionar perfeitamente no seu celular via WhatsApp e navegador mobile. Você recebe suas orientações e acessa o conteúdo onde estiver, facilitando seus estudos diários."
    },
    {
      question: "Posso cancelar se não estiver ajudando?",
      answer: "Sim. Você pode cancelar a qualquer momento pelo painel. No teste de 3 dias, não há cobrança. Não pedimos cartão para começar — você só assina se decidir continuar."
    },
    {
      question: "Funciona para diferentes tipos de vestibulares?",
      answer: "Sim. Nosso sistema adapta a intensidade e os tópicos baseados no seu objetivo. Para cursos concorridos como Medicina, priorizamos a consolidação da base e aprofundamento em matérias específicas, sempre respeitando seu ritmo e suas prioridades."
    },
    {
      question: "Preciso de cartão para o teste grátis?",
      answer: "Não. Você cria sua conta e começa a usar. Só pedimos cartão se decidir assinar um plano pago após o trial. Sem surpresas."
    }
  ];

  // Detectar scroll
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Simulação do Chat
  useEffect(() => {
    let step = 1;
    const timer1 = setTimeout(() => {
      setChatStep(1);
      const timer2 = setTimeout(() => {
        setChatStep(2);
        const timer3 = setTimeout(() => {
          setChatStep(3);
          const timer4 = setTimeout(() => {
            setChatStep(4);
          }, 1500);
        }, 1500);
      }, 1500);
    }, 1000);

    return () => {
      clearTimeout(timer1);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden selection:bg-blue-200 selection:text-blue-900">
      <style>{customStyles}</style>

      {/* --- BACKGROUND BLOBS --- */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[120px] animate-pulse"></div>
      </div>

      {/* --- NAVBAR --- */}
      <header 
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          isScrolled ? 'bg-white/90 backdrop-blur-lg shadow-sm py-2' : 'bg-transparent py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          
          {/* LOGO NO HEADER */}
          <div className="flex items-center gap-0 font-extrabold text-2xl tracking-tight text-slate-900 cursor-pointer group" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            <div className="flex items-center justify-center -mr3 group-hover:scale-105 transition-transform duration-300">
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
            <span>Study<span className="text-blue-600">Track</span></span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-600">
            {['Recursos', 'Planos', 'Dúvidas'].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace('ú', 'u')}`} className="hover:text-blue-600 transition-colors relative group">
                {item}
                <span className="absolute bottom-[-4px] left-0 w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full"></span>
              </a>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <a href="/auth/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              Entrar
            </a>
            <a href="/auth/register?plan=free" className="px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-blue-600 hover:scale-105 transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2">
              Testar grátis 3 dias <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {/* Mobile Menu Button - alvo de toque 44px */}
          <button type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-lg" aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}>
            {mobileMenuOpen ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <nav className="md:hidden absolute top-full left-0 w-full bg-white border-t border-slate-100 shadow-xl flex flex-col p-4 gap-1 animate-fade-in-up" aria-label="Menu mobile">
            <a href="#planos" onClick={() => setMobileMenuOpen(false)} className="text-slate-700 font-medium min-h-[44px] flex items-center px-3 rounded-lg hover:bg-slate-50">Planos</a>
            <a href="/auth/login" className="text-slate-700 font-medium min-h-[44px] flex items-center px-3 rounded-lg hover:bg-slate-50">Entrar</a>
            <a href="/auth/register?plan=free" className="bg-blue-600 text-white text-center min-h-[48px] flex items-center justify-center p-3 rounded-lg font-bold hover:bg-blue-700">Testar grátis 3 dias</a>
          </nav>
        )}
      </header>

      <main className="relative z-10">
        {/* --- HERO SECTION --- */}
        <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-32 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
              
              {/* Copywriting */}
              <div className="flex-1 text-center lg:text-left animate-fade-in-up">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold mb-8 uppercase tracking-wide">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  Teste grátis por 3 dias • Cancele quando quiser
                </div>
                
                <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                  Passe no ENEM com um plano que <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">se adapta a você</span>.
                </h1>
                
                <p className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed max-w-xl mx-auto lg:mx-0">
                  Organize sua rotina, domine cada matéria e tenha conteúdo certo no momento certo — em 3 dias de teste grátis, sem compromisso.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <a href="/auth/register?plan=free" className="px-8 py-4 rounded-2xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transform hover:-translate-y-1 hover:shadow-2xl ring-4 ring-blue-600/10">
                    Começar teste grátis
                    <Zap className="w-5 h-5 fill-current" />
                  </a>
                  <a href="#recursos" className="px-8 py-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-semibold text-lg hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Ver como funciona
                  </a>
                </div>
                <p className="mt-4 text-sm text-slate-500 flex items-center justify-center lg:justify-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  Sem cartão no trial • Cancele a qualquer momento
                </p>
              </div>

              {/* SIMULAÇÃO INTERATIVA (Phone) */}
              <div className="flex-1 w-full max-w-md relative mx-auto lg:mr-auto animate-float">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-blue-500/20 to-violet-500/20 rounded-full blur-3xl -z-10"></div>
                <div className="relative mx-auto border-slate-900 bg-slate-900 border-[12px] rounded-[2.5rem] h-[620px] w-[320px] shadow-2xl overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[24px] w-[100px] bg-black rounded-b-2xl z-20"></div>
                  <div className="w-full h-full bg-[#E4E2DC] relative flex flex-col font-sans">
                    <div className="bg-[#075E54] pt-8 pb-3 px-4 flex items-center gap-3 text-white shadow-md z-10">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#075E54] overflow-hidden">
                        {/* Ícone menor no chat do celular - aqui pode manter o Brain ou por a logo bem pequena */}
                        <Brain className="w-5 h-5" />
                      </div>
                      <div className="flex-1 leading-tight">
                        <p className="font-bold text-sm">StudyTrack</p>
                        <p className="text-[10px] opacity-80">Online agora</p>
                      </div>
                    </div>
                    <div className="flex-1 p-4 space-y-4 overflow-hidden bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-opacity-50">
                      {/* Chat Simulation Steps */}
                      <div className={`transition-all duration-500 transform ${chatStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        <div className="bg-[#E7FFDB] p-3 rounded-lg rounded-tr-none shadow-sm max-w-[85%] ml-auto text-slate-800 text-sm">
                          <p>Terminei a aula de Matemática. Entendi quase tudo, mas Geometria ainda é desafiadora 😊 O que eu faço?</p>
                          <div className="flex justify-end gap-1 mt-1 text-[10px] text-slate-500">
                            <span>10:42</span> <CheckCircle className="w-3 h-3 text-blue-500" />
                          </div>
                        </div>
                      </div>
                      {chatStep === 2 && (
                        <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm max-w-[20%] mr-auto animate-pulse">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                            <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                          </div>
                        </div>
                      )}

                      {/* Step 3: AI Response */}
                      <div className={`transition-all duration-500 transform ${chatStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                          <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm max-w-[90%] mr-auto text-slate-800 text-sm relative group cursor-pointer hover:scale-[1.02] transition-transform">
                          <div className="absolute -left-2 top-0 w-2 h-2 bg-white transform skew-x-[20deg]"></div>
                          <p className="font-bold text-xs text-orange-600 mb-1">Análise de Desempenho</p>
                          <p>Que bom que você está acompanhando as aulas! 📚 Vamos reforçar a Geometria juntos.</p>
                          <p className="mt-2">Identifiquei que você tem facilidade com os conceitos básicos. Vamos focar nos pontos específicos que precisam de atenção.</p>
                          <span className="absolute bottom-1 right-2 text-[10px] text-slate-400">10:42</span>
                        </div>
                      </div>

                      {/* Step 4: Material Card */}
                      <div className={`transition-all duration-500 delay-100 transform ${chatStep >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        <div className="bg-white p-2 rounded-lg rounded-tl-none shadow-sm max-w-[85%] mr-auto">
                          <div className="bg-slate-50 border border-slate-100 rounded p-2 flex gap-3 items-center">
                            <div className="w-10 h-10 bg-red-100 rounded flex items-center justify-center text-red-500 font-bold">
                              ▶
                            </div>
                            <div>
                              <p className="font-bold text-xs text-slate-800">Revisão Express: Geometria</p>
                              <p className="text-[10px] text-slate-500">Lista de 15 questões + Vídeo</p>
                            </div>
                          </div>
                          <button className="w-full mt-2 bg-blue-50 text-blue-600 text-xs font-bold py-2 rounded hover:bg-blue-100">
                            Baixar Cronograma do Dia
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Static Input */}
                    <div className="bg-[#F0F2F5] px-2 py-2 flex items-center gap-2">
                      <div className="p-2"><span className="text-slate-500">😊</span></div>
                      <div className="flex-1 bg-white rounded-full h-9 px-4 flex items-center text-slate-400 text-sm">Vou começar agora!</div>
                      <div className="w-10 h-10 bg-[#00A884] rounded-full flex items-center justify-center text-white shadow-sm"><Send className="w-4 h-4" /></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- PROVA SOCIAL / TRUST --- */}
        <section className="py-12 bg-slate-100 border-y border-slate-200">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-slate-600 font-medium">
              Plataforma feita para vestibulandos • Funciona no celular via WhatsApp • Cronograma que se adapta à sua rotina
            </p>
          </div>
        </section>

        {/* --- SEÇÃO COLABORATIVA --- */}
        <section className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Estudamos <span className="text-blue-600">juntos</span>, não sozinhos.</h2>
              <p className="text-lg text-slate-600 max-w-3xl mx-auto">Cursinho, estudo em casa, revisão de conteúdo: organizar tudo sozinho é difícil. O StudyTrack une tudo em um só lugar.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center group">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-200 transition-colors">
                  <Target className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">No seu tempo</h3>
                <p className="text-slate-600">Seu plano respeita sua rotina e seus horários. Nada de sobrecarga ou cronograma impossível de seguir.</p>
              </div>

              <div className="text-center group">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-green-200 transition-colors">
                  <Brain className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Com você</h3>
                <p className="text-slate-600">O plano se ajusta ao seu ritmo real: dias corridos, matérias difíceis e tempo disponível. Sem atraso acumulado.</p>
              </div>

              <div className="text-center group">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-purple-200 transition-colors">
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Para sua aprovação</h3>
                <p className="text-slate-600">Tudo organizado para chegar na prova sabendo o que estudar, quando e em qual intensidade.</p>
              </div>
            </div>
          </div>
        </section>

        {/* --- RECURSOS (MANTIDO) --- */}
        <section id="recursos" className="py-24 bg-slate-50 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">Estudar sozinho é difícil.<br/>Com o StudyTrack, você tem <span className="text-blue-600">direção clara</span>.</h2>
              <p className="text-lg text-slate-600">Menos tempo escolhendo o que estudar. Menos atraso acumulado. Mais progresso visível. Veja como funciona:</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 — Benefício: conteúdo certo no momento certo */}
              <div className="group bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-2xl hover:border-blue-100 hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 z-0"></div>
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-600/20">
                    <TrendingUp className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Conteúdo certo no momento certo</h3>
                  <p className="text-slate-600 mb-4">Indicamos vídeos, exercícios e materiais alinhados ao seu objetivo — sem perder tempo procurando o que estudar.</p>
                </div>
              </div>
              {/* Feature 2 — Benefício: plano que acompanha sua rotina */}
              <div className="group bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-2xl hover:border-purple-100 hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 z-0"></div>
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-purple-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-600/20">
                    <Clock className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Plano que acompanha sua rotina</h3>
                  <p className="text-slate-600 mb-4">O cronograma se ajusta aos seus dias reais: se teve um dia corrido ou levou mais tempo em uma matéria, o plano recalcula sem você ficar atrasado.</p>
                </div>
              </div>
              {/* Feature 3 — Benefício: progresso visível */}
              <div className="group bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-2xl hover:border-orange-100 hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 z-0"></div>
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-orange-500 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20">
                    <Zap className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Progresso que você vê</h3>
                  <p className="text-slate-600 mb-4">Metas, questões resolvidas e evolução por matéria — você acompanha o que está avançando e onde precisa focar.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- PRICING --- */}
        <section id="planos" className="py-24 bg-slate-900 text-white relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-30">
             <div className="absolute top-[20%] right-[10%] w-96 h-96 bg-blue-600 rounded-full blur-[100px]"></div>
             <div className="absolute bottom-[10%] left-[10%] w-96 h-96 bg-violet-600 rounded-full blur-[100px]"></div>
           </div>

          <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Planos que cabem no seu orçamento de estudante.</h2>
              <p className="text-lg text-slate-300 max-w-2xl mx-auto">Escolha o que faz sentido para sua fase. Teste grátis, cancele quando quiser.</p>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {/* TRIAL */}
              <div className="flex flex-col h-full bg-slate-800/40 backdrop-blur-md border border-slate-700 p-8 rounded-3xl relative group hover:border-slate-500 transition-all">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">Degustação</div>
                <h3 className="text-lg font-medium text-slate-400">Trial 72h</h3>
                <div className="my-4"><span className="text-4xl font-bold text-white">Grátis</span></div>
                <p className="text-sm text-slate-400 mb-6 flex-1">Experimente sem compromisso. Sem cartão no trial.</p>
                
                <div className="mt-auto">
                    <a href="/auth/register?plan=free" className="block w-full py-3 rounded-xl border border-slate-600 hover:bg-slate-700 text-center font-semibold transition-all">Começar teste grátis</a>
                    <div className="mt-8 space-y-3 text-sm text-slate-300">
                    <p className="flex gap-2 text-slate-400"><CheckCircle className="w-4 h-4"/> Acesso ao Chat IA</p>
                    <p className="flex gap-2 text-slate-400"><CheckCircle className="w-4 h-4"/> Curadoria de Conteúdo</p>
                    </div>
                </div>
              </div>

              {/* BÁSICO */}
              <div className="flex flex-col h-full bg-slate-800/60 backdrop-blur-md border border-slate-600 p-8 rounded-3xl relative hover:bg-slate-800 transition-all">
                <h3 className="text-lg font-medium text-blue-200">Básico</h3>
                <div className="my-4 flex items-end gap-1">
                    <span className="text-4xl font-bold text-white">R$ 14,90</span>
                    <span className="text-xs text-slate-400 mb-1">/mês</span>
                </div>
                <p className="text-sm text-slate-400 mb-6 flex-1">Suporte essencial para acompanhar seus estudos diários.</p>
                
                <div className="mt-auto">
                    <a href="/auth/register?plan=basic" className="block w-full py-3 rounded-xl bg-slate-700 text-white hover:bg-slate-600 text-center font-semibold transition-all border border-slate-600">Assinar Básico</a>
                    <div className="mt-8 space-y-3 text-sm text-slate-300">
                    <p className="flex gap-2"><CheckCircle className="w-4 h-4 text-blue-400"/> Cronograma Standard</p>
                    <p className="flex gap-2"><CheckCircle className="w-4 h-4 text-blue-400"/> Curadoria Básica</p>
                    </div>
                </div>
              </div>

              {/* PRO */}
              <div className="flex flex-col h-full bg-gradient-to-b from-blue-600 to-blue-900 p-8 rounded-3xl shadow-2xl shadow-blue-900/50 border border-blue-400 relative animate-pulse-glow z-10 order-first xl:order-none md:col-span-2 xl:col-span-1">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-orange-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg flex gap-1 items-center whitespace-nowrap">
                  <Star className="w-3 h-3 fill-white" /> Mais Escolhido
                </div>
                <h3 className="text-lg font-medium text-blue-100">Pro Aprovação</h3>
                <div className="my-4 flex items-end gap-1">
                    <span className="text-5xl font-bold text-white">R$ 29,90</span>
                    <span className="text-sm text-blue-200 mb-2">/mês</span>
                </div>
                <p className="text-sm text-blue-100 mb-8 opacity-90 flex-1">O mais completo: IA avançada, cronograma adaptativo e tutor de exatas.</p>
                
                <div className="mt-auto">
                    <a href="/auth/register?plan=pro" className="block w-full py-4 rounded-xl bg-white text-blue-700 text-center font-bold hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1">Começar teste grátis</a>
                    
                    <div className="mt-8 space-y-4 text-sm text-white font-medium">
                    <div className="flex gap-3 items-center">
                        <div className="p-1 bg-blue-500 rounded-full shrink-0"><CheckCircle className="w-3 h-3"/></div> 
                        Curadoria IA Avançada
                    </div>
                    <div className="flex gap-3 items-center">
                        <div className="p-1 bg-blue-500 rounded-full shrink-0"><CheckCircle className="w-3 h-3"/></div> 
                        Cronograma Adaptativo IA
                    </div>
                    <div className="flex gap-3 items-center">
                        <div className="p-1 bg-blue-500 rounded-full shrink-0"><Brain className="w-3 h-3"/></div> 
                        Tutor Exatas Passo-a-Passo
                    </div>
                    </div>
                </div>
              </div>

              {/* ELITE / REDAÇÃO — EM BREVE */}
              <div className="flex flex-col h-full bg-slate-900 border border-slate-700 p-8 rounded-3xl relative transition-all opacity-60 pointer-events-none select-none">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-600 text-slate-300 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">Em breve</div>
                <h3 className="text-lg font-medium text-slate-500">Redação Master</h3>
                <div className="my-4 flex items-end gap-1">
                    <span className="text-4xl font-bold text-slate-500">R$ 49,90</span>
                    <span className="text-xs text-slate-600 mb-1">/mês</span>
                </div>
                <p className="text-sm text-slate-500 mb-6 flex-1">Acompanhamento premium com correção especializada de redações.</p>
                
                <div className="mt-auto">
                    <span className="block w-full py-3 rounded-xl border border-slate-700 text-slate-500 text-center font-semibold cursor-not-allowed">Em breve</span>
                    <div className="mt-8 space-y-3 text-sm text-slate-600">
                    <p className="flex gap-2"><CheckCircle className="w-4 h-4 text-slate-600"/> Tudo do Plano Pro</p>
                    <p className="flex gap-2 font-bold text-slate-500"><PenTool className="w-4 h-4 text-slate-600"/> Correção Ilimitada</p>
                    <p className="flex gap-2"><CheckCircle className="w-4 h-4 text-slate-600"/> Feedback Detalhado</p>
                    </div>
                </div>
              </div>

            </div>

            <div className="mt-12 text-center">
              <p className="text-slate-400 text-sm flex items-center justify-center gap-2 flex-wrap">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                Cancele a qualquer momento • Sem fidelidade • Suporte por WhatsApp
              </p>
            </div>
          </div>
        </section>

        {/* --- CTA FINAL --- */}
        <section className="py-20 bg-white">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">Pronto para organizar seus estudos?</h2>
            <p className="text-slate-600 mb-8">Comece em 2 minutos. Teste grátis por 3 dias, sem cartão.</p>
            <a href="/auth/register?plan=free" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/30 hover:-translate-y-0.5">
              Começar teste grátis
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </section>

        {/* --- FAQ --- */}
        <section id="duvidas" className="py-20 bg-white">
          <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-slate-900">Dúvidas Frequentes</h2>
            <div className="space-y-4">
              {faqItems.map((item, i) => (
                <div 
                  key={i} 
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className={`border border-slate-200 rounded-2xl p-6 cursor-pointer group transition-all bg-slate-50 hover:bg-white ${
                    openFaq === i ? 'ring-2 ring-blue-500 bg-white shadow-md' : 'hover:border-blue-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <h3 className={`font-bold text-lg transition-colors ${openFaq === i ? 'text-blue-600' : 'text-slate-700 group-hover:text-blue-600'}`}>
                      {item.question}
                    </h3>
                    <ChevronDown className={`w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-transform duration-300 ${openFaq === i ? 'rotate-180 text-blue-600' : ''}`} />
                  </div>
                    
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === i ? 'max-h-64 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                    <p className="text-slate-600 leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- FOOTER --- */}
        <footer className="bg-slate-50 pt-20 pb-10 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 text-center">
            {/* LOGO NO FOOTER */}
            <div className="flex items-center justify-center gap-0 font-bold text-2xl text-slate-900 mb-6">
              <div className="flex items-center justify-center -mr-2">
                <Image 
                   src="/logost-transparente-sombra.png" 
                   alt="Logo StudyTrack" 
                   width={60} 
                   height={60} 
                   className="w-16 h-16 object-contain"
                   priority
                   unoptimized
                 />
              </div>
              <span>StudyTrack</span>
            </div>
            <p className="text-slate-400 text-sm">© 2025 StudyTrack.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}