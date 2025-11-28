"use client";

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  CheckCircle, 
  ArrowRight, 
  PenTool, 
  Brain, 
  MessageCircle, 
  Send,
  Zap,
  Star,
  ShieldCheck,
  TrendingUp,
  Clock,
  Users,
  ChevronDown,
  Menu,
  X
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
      question: "A IA seleciona o conteúdo sozinha?",
      answer: "Sim! Nossa IA analisa seu cronograma diário e busca automaticamente os melhores vídeos e materiais educacionais na internet (como YouTube) que se encaixam perfeitamente no seu tópico de estudo, economizando horas de pesquisa."
    },
    {
      question: "Funciona se eu não tiver computador?",
      answer: "Com certeza. O StudyTrack foi desenhado para funcionar perfeitamente no seu celular via WhatsApp e navegador mobile. Você recebe suas tarefas e acessa o conteúdo onde estiver."
    },
    {
      question: "Posso cancelar se não gostar?",
      answer: "Sem letras miúdas. Você pode cancelar sua assinatura a qualquer momento diretamente pelo painel do usuário. Se estiver no período de teste de 3 dias, não haverá cobrança alguma."
    },
    {
      question: "O cronograma serve para Medicina?",
      answer: "Sim. Nosso algoritmo adapta a intensidade e os tópicos baseados no seu objetivo. Para cursos de alta concorrência como Medicina, o cronograma foca em consolidar a base e aprofundar em matérias específicas com maior peso."
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
    const timers = [
      setTimeout(() => setChatStep(1), 1000), // User msg
      setTimeout(() => setChatStep(2), 2500), // AI Typing
      setTimeout(() => setChatStep(3), 4000), // AI Response
      setTimeout(() => setChatStep(4), 5500), // Material Card
    ];
    return () => timers.forEach(clearTimeout);
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
          isScrolled ? 'bg-white/90 backdrop-blur-lg shadow-sm py-3' : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-2 font-extrabold text-2xl tracking-tight text-slate-900 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            <div className="bg-blue-600 text-white p-1.5 rounded-lg">
              <BookOpen className="w-5 h-5" />
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
            <a href="/auth/register" className="px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-blue-600 hover:scale-105 transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2">
              Começar Agora <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-slate-700">
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-white border-t border-slate-100 shadow-xl flex flex-col p-4 gap-4 animate-fade-in-up">
            <a href="#planos" onClick={() => setMobileMenuOpen(false)} className="text-slate-700 font-medium p-2">Planos</a>
            <a href="/auth/login" className="text-slate-700 font-medium p-2">Entrar</a>
            <a href="/auth/register" className="bg-blue-600 text-white text-center p-3 rounded-lg font-bold">Começar Agora</a>
          </div>
        )}
      </header>

      <main className="relative z-10">
        {/* --- HERO SECTION --- */}
        <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-32 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
              
              {/* Copywriting */}
              <div className="flex-1 text-center lg:text-left animate-fade-in-up">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold mb-8 uppercase tracking-wide hover:bg-blue-100 transition-colors cursor-pointer">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  Lançamento Exclusivo: Experimente Grátis por 3 Dias!
                </div>
                
                <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                  Seu mentor de estudos <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">injustamente</span> inteligente.
                </h1>
                
                <p className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed max-w-xl mx-auto lg:mx-0">
                  O StudyTrack substitui cursinhos caros por uma IA que vive no seu WhatsApp. Cronogramas que se adaptam à sua preguiça e curadoria de conteúdo personalizada.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <a href="/auth/register" className="px-8 py-4 rounded-2xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transform hover:-translate-y-1 hover:shadow-2xl ring-4 ring-blue-600/10">
                    Criar Conta Grátis
                    <Zap className="w-5 h-5 fill-current" />
                  </a>
                  <a href="#recursos" className="px-8 py-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-semibold text-lg hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Ver Resultados
                  </a>
                </div>
              </div>

              {/* SIMULAÇÃO INTERATIVA (Phone) */}
              <div className="flex-1 w-full max-w-md relative mx-auto lg:mr-auto animate-float">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-blue-500/20 to-violet-500/20 rounded-full blur-3xl -z-10"></div>
                <div className="relative mx-auto border-slate-900 bg-slate-900 border-[12px] rounded-[2.5rem] h-[620px] w-[320px] shadow-2xl overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[24px] w-[100px] bg-black rounded-b-2xl z-20"></div>
                  <div className="w-full h-full bg-[#E4E2DC] relative flex flex-col font-sans">
                    <div className="bg-[#075E54] pt-8 pb-3 px-4 flex items-center gap-3 text-white shadow-md z-10">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#075E54]">
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
                          <p>Terminei o simulado de Matemática. Acertei 25/45 😕 O que eu faço?</p>
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
                          <p>Não desanime! 📊 Identifiquei que 70% dos seus erros foram em <strong>Geometria Analítica</strong>.</p>
                          <p className="mt-2">Não adianta fazer outro simulado agora. Vamos corrigir a base primeiro.</p>
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

        {/* --- FEATURES --- */}
        <section id="recursos" className="py-24 bg-slate-50 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">Estudar sozinho é difícil.<br/>Com o StudyTrack, é <span className="text-blue-600">injusto</span>.</h2>
              <p className="text-lg text-slate-600">O StudyTrack não é apenas um chatbot. É um sistema completo de engenharia pedagógica rodando no seu bolso.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="group bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-2xl hover:border-blue-100 hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 z-0"></div>
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-600/20">
                    <TrendingUp className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Curadoria IA</h3>
                  <p className="text-slate-600 mb-4">O sistema encontra os melhores vídeos do YouTube para cada tópico do seu dia, poupando horas de busca.</p>
                </div>
              </div>
              {/* Feature 2 */}
              <div className="group bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-2xl hover:border-purple-100 hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 z-0"></div>
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-purple-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-600/20">
                    <Clock className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Cronograma Líquido</h3>
                  <p className="text-slate-600 mb-4">Ficou doente? Saiu para uma festa? O sistema recalcula automaticamente sua rota de estudos.</p>
                </div>
              </div>
              {/* Feature 3 */}
              <div className="group bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-2xl hover:border-orange-100 hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 z-0"></div>
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-orange-500 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20">
                    <Zap className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Gamificação Real</h3>
                  <p className="text-slate-600 mb-4">Mantenha sua sequência (streak) e ganhe benefícios, descontos e aprendizado.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- PRICING --- */}
        <section id="planos" className="py-24 bg-slate-900 text-white relative overflow-hidden">
           {/* Background details */}
           <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-30">
             <div className="absolute top-[20%] right-[10%] w-96 h-96 bg-blue-600 rounded-full blur-[100px]"></div>
             <div className="absolute bottom-[10%] left-[10%] w-96 h-96 bg-violet-600 rounded-full blur-[100px]"></div>
           </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Sua aprovação custa menos<br/>que um lanche.</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-end">
              {/* TRIAL */}
              <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700 p-8 rounded-3xl relative group hover:border-slate-500 transition-all">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">Degustação</div>
                <h3 className="text-lg font-medium text-slate-400">Trial 72h</h3>
                <div className="my-4"><span className="text-4xl font-bold text-white">Grátis</span></div>
                <p className="text-sm text-slate-400 mb-6">Acesso total por 3 dias para viciar na metodologia.</p>
                <a href="/auth/register?plan=trial" className="block w-full py-3 rounded-xl border border-slate-600 hover:bg-slate-700 text-center font-semibold transition-all">Testar Agora</a>
                <div className="mt-8 space-y-3 text-sm text-slate-300">
                  <p className="flex gap-2 text-slate-400"><CheckCircle className="w-4 h-4"/> Acesso ao Chat IA</p>
                  <p className="flex gap-2 text-slate-400"><CheckCircle className="w-4 h-4"/> Curadoria de Conteúdo</p>
                </div>
              </div>

              {/* BÁSICO */}
              <div className="bg-slate-800/60 backdrop-blur-md border border-slate-600 p-8 rounded-3xl relative hover:bg-slate-800 transition-all">
                <h3 className="text-lg font-medium text-blue-200">Básico</h3>
                <div className="my-4 flex items-end gap-1">
                    <span className="text-4xl font-bold text-white">R$ 14,90</span>
                    <span className="text-xs text-slate-400 mb-1">/mês</span>
                </div>
                <p className="text-sm text-slate-400 mb-6">Para quem estuda em ritmo leve.</p>
                <a href="/auth/register?plan=basic" className="block w-full py-3 rounded-xl bg-slate-700 text-white hover:bg-slate-600 text-center font-semibold transition-all border border-slate-600">Assinar Básico</a>
                <div className="mt-8 space-y-3 text-sm text-slate-300">
                  <p className="flex gap-2"><CheckCircle className="w-4 h-4 text-blue-400"/> Cronograma Standard</p>
                  <p className="flex gap-2"><CheckCircle className="w-4 h-4 text-blue-400"/> Curadoria Básica</p>
                </div>
              </div>

              {/* PRO */}
              <div className="bg-gradient-to-b from-blue-600 to-blue-900 p-8 rounded-3xl shadow-2xl shadow-blue-900/50 transform md:scale-110 border border-blue-400 relative animate-pulse-glow z-10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-orange-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg flex gap-1 items-center whitespace-nowrap">
                  <Star className="w-3 h-3 fill-white" /> Mais Escolhido
                </div>
                <h3 className="text-lg font-medium text-blue-100">Pro Aprovação</h3>
                <div className="my-4 flex items-end gap-1">
                    <span className="text-5xl font-bold text-white">R$ 29,90</span>
                    <span className="text-sm text-blue-200 mb-2">/mês</span>
                </div>
                <p className="text-sm text-blue-100 mb-8 opacity-90">A máquina completa de estudos. Sem limites.</p>
                <a href="/auth/register?plan=pro" className="block w-full py-4 rounded-xl bg-white text-blue-700 text-center font-bold hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1">Quero Ser Aprovado</a>
                
                {/* CORREÇÃO DO ERRO DE HIDRATAÇÃO AQUI: Trocado <p> por <div> */}
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
                  
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === i ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
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
            <div className="flex items-center justify-center gap-2 font-bold text-2xl text-slate-900 mb-6">
              <BookOpen className="w-6 h-6 text-blue-600" />
              <span>StudyTrack</span>
            </div>
            <p className="text-slate-400 text-sm">© 2025 StudyTrack.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}