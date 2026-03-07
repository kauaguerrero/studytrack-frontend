'use client';

import { useId } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  BookOpen,
  ArrowLeft,
  Library,
  Brain,
  Timer,
  Gamepad2,
  Target,
  BarChart3,
  MessageSquare,
  Mail,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const SECTIONS = [
  { id: 'intro', label: 'Introdução' },
  { id: 'biblioteca', label: 'Biblioteca de Livros' },
  { id: 'banco', label: 'Banco de Questões' },
  { id: 'simulado', label: 'Simulados' },
  { id: 'gamificacao', label: 'Gamificação e Jogos' },
  { id: 'metas', label: 'Metas' },
  { id: 'desempenho', label: 'Meu Desempenho' },
  { id: 'suporte', label: 'Suporte' },
] as const;

/**
 * Imagens do manual: coloque os arquivos na pasta public/images/kb/
 * Nomes: biblioteca, banco-filtros, reportar-erro, simulado-setup, speedrun-menu, metas, desempenho
 * Formatos aceitos: .png ou .jpg
 */
const KB_IMAGES_BASE = '/images/kb';

function KbImage({ slug, alt }: { slug: string; alt: string }) {
  const src = `${KB_IMAGES_BASE}/${slug}.png`;
  return (
    <div className="my-6 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
      <div className="relative w-full min-h-[200px] flex items-center justify-center p-2">
        <Image
          src={src}
          alt={alt}
          width={800}
          height={450}
          className="object-contain max-h-[500px] w-auto rounded-lg"
        />
      </div>
    </div>
  );
}

function ProTip({ children, title = 'Dica de ouro' }: { children: React.ReactNode; title?: string }) {
  return (
    <Card className="my-6 border-amber-200 bg-amber-50/80 shadow-sm">
      <CardContent className="p-5">
        <p className="flex items-center gap-2 text-amber-800 font-bold text-sm mb-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          {title}
        </p>
        <div className="text-slate-700 text-sm leading-relaxed">{children}</div>
      </CardContent>
    </Card>
  );
}

export default function BaseConhecimentoPage() {
  const selectId = useId();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F4F7FA] font-sans text-slate-900">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2">
          <Link href="/portal/support">
            <ArrowLeft className="h-4 w-4" />
            Voltar à Central de Ajuda
          </Link>
        </Button>
        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
          <BookOpen className="h-4 w-4 text-blue-600" />
          Manual do Estudante
        </div>
      </div>

      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 p-4 md:p-8">
        {/* Sidebar: desktop sticky / mobile dropdown */}
        <aside className="lg:w-56 shrink-0">
          <div className="lg:hidden mb-4">
            <label htmlFor={selectId} className="sr-only">
              Ir para seção
            </label>
            <div className="relative">
              <select
                id={selectId}
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) scrollTo(v);
                }}
                className="w-full appearance-none bg-white border border-slate-200 rounded-xl py-3 pl-4 pr-10 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
              >
                <option value="">Navegar por seção...</option>
                {SECTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <nav className="hidden lg:block lg:sticky lg:top-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">
              Nesta página
            </p>
            <ul className="space-y-1">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => scrollTo(s.id)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="max-w-prose space-y-12 pb-20">
            {/* --- INTRODUÇÃO --- */}
            <section id="intro" className="scroll-mt-24">
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
                Manual do Estudante StudyTrack
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed mb-4">
                Boas-vindas ao StudyTrack. Este manual explica, passo a passo, como usar a plataforma para
                turbinar sua preparação para o ENEM e vestibulares. Tudo pensado para você estudar com
                foco, acompanhar seu progresso e manter a constância.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Use o menu ao lado (ou o seletor no celular) para pular direto para o tema que precisar.
              </p>
            </section>

            {/* --- BIBLIOTECA --- */}
            <section id="biblioteca" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Library className="h-7 w-7 text-blue-600" />
                Biblioteca de Livros
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                A Biblioteca reúne leituras obrigatórias e materiais de apoio para vestibulares. Você acessa
                pelo menu do portal, em <strong>Biblioteca Digital</strong>.
              </p>
              <p className="text-slate-600 leading-relaxed mb-4">
                No topo da tela você encontra a <strong>barra de busca</strong>: digite o nome do livro, do autor
                ou do exame (ex.: FUVEST, ENEM). Os resultados aparecem na hora. Abaixo da busca ficam os
                <strong> filtros por tipo</strong>: clique em <strong>Literários</strong>, <strong>Apostilas</strong>,
                <strong> Resumos</strong> ou <strong>Editais</strong> para ver só aquele tipo. O filtro
                &quot;Todos&quot; mostra todo o acervo.
              </p>
              <KbImage slug="biblioteca" alt="Tela da Biblioteca: barra de busca, filtros e grid de livros com ranking de leitores." />
              <p className="text-slate-600 leading-relaxed mb-4">
                Ao clicar em um livro, você pode abrir o PDF ou ver detalhes. O ranking de leitores da plataforma
                aparece na lateral (desktop): quem mais leu no mês. Completar leituras ajuda a subir no
                ranking e a manter o ritmo de estudos.
              </p>
              <ProTip title="Produtividade">
                Reserve um horário fixo por dia para leitura. Marque os livros obrigatórios da sua prova e
                use o filtro para não se perder.
              </ProTip>
            </section>

            {/* --- BANCO DE QUESTÕES --- */}
            <section id="banco" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Brain className="h-7 w-7 text-blue-600" />
                Banco de Questões
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                O Banco de Questões é o coração da prática: milhares de questões por matéria, tópico, ano e
                dificuldade. Acesse pelo <strong>Dashboard</strong> ou pelo menu, em <strong>Banco de Questões</strong>.
              </p>

              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-2">Como usar os filtros</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                Na parte superior da tela há um botão (ícone de olho) que <strong>abre e fecha o painel de filtros</strong>.
                Com o painel aberto, você vê quatro seletores em linha: <strong>Matéria</strong>, <strong>Tópico</strong>,
                <strong> Ano</strong> e <strong>Dificuldade</strong>. Primeiro, escolha a matéria no dropdown
                &quot;Selecione a Matéria&quot; (ex.: Matemática, Física, Língua Portuguesa). Em seguida, se quiser
                afunilar, selecione um tópico (a lista de tópicos depende da matéria), o ano da prova e a dificuldade.
                Não é obrigatório preencher todos; o importante é ter pelo menos a <strong>matéria</strong> selecionada
                para as questões aparecerem.
              </p>
              <KbImage slug="banco-filtros" alt="Painel de filtros do Banco de Questões: Matéria, Tópico, Ano, Dificuldade e abas A Fazer / Respondidas." />
              <p className="text-slate-600 leading-relaxed mb-4">
                Acima dos filtros existem duas abas: <strong>A Fazer</strong> (questões que você ainda não respondeu)
                e <strong>Respondidas</strong> (histórico para revisão). O contador &quot;Total do Filtro&quot; mostra
                quantas questões batem com a sua seleção atual.
              </p>

              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-2">Respondendo e vendo o resultado</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                Depois de aplicar os filtros, uma questão aparece em destaque. Leia o enunciado, clique na alternativa
                que você acredita ser a correta e confirme. A plataforma mostra na hora se você acertou ou errou,
                com feedback visual e, quando disponível, a explicação. Você pode avançar para a próxima questão
                ou trocar de aba para rever as que já respondeu.
              </p>
              <ProTip title="Gamificação">
                Quanto mais você pratica, mais XP e sequência de dias (streak) você ganha. Isso aparece no
                 painel Meu Desempenho. Mantenha a rotina para subir de nível.
              </ProTip>

              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-2">Reportar erro em uma questão</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                Se você encontrar erro no enunciado, na resposta correta, em formatação ou em imagens, use o botão
                <strong> Reportar Erro</strong> (geralmente no card da questão). Um modal abre em etapas: primeiro
                você escolhe o tipo do problema (erro no enunciado, resposta incorreta, problema de formatação,
                imagens mal formatadas ou outro). Na segunda etapa, pode escrever uma descrição opcional para
                ajudar a equipe pedagógica. Depois de enviar, o report entra na fila de auditoria e você pode
                acompanhar o status na aba <strong>Auditoria de Questões</strong>, na página de Ajuda e Suporte.
              </p>
              <KbImage slug="reportar-erro" alt="Modal Reportar Erro: opções de tipo de problema na questão." />
            </section>

            {/* --- SIMULADOS --- */}
            <section id="simulado" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Timer className="h-7 w-7 text-emerald-600" />
                Simulados
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                O modo Simulado simula uma prova cronometrada. Acesse pelo <strong>Dashboard</strong> (card
                &quot;Modo Simulado&quot;) ou pelo menu, em <strong>Simulado</strong>.
              </p>

              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-2">Iniciando um simulado</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                Na tela de configuração, escolha a <strong>Matéria</strong> (ex.: Matemática, Todas as Matérias)
                e a <strong>Quantidade de questões</strong> (5, 10, 15 ou 30). Em seguida, clique em
                <strong> Iniciar Simulado</strong>. O sistema sorteia as questões e inicia o cronômetro. O tempo
                total é calculado com base na quantidade (ex.: 3 minutos por questão).
              </p>
              <KbImage slug="simulado-setup" alt="Tela Novo Simulado: matéria, quantidade de questões e botão Iniciar Simulado." />

              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-2">Durante a prova</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                No topo da tela ficam o indicador de questão (ex.: Questão 3 / 10), o <strong>cronômetro</strong>
                e o botão <strong>Finalizar</strong>. Role a página para ler o enunciado e as alternativas;
                clique na letra que você escolhe para marcar. Use os botões <strong>Anterior</strong> e
                <strong> Próxima</strong> no rodapé para navegar. Quando terminar, clique em <strong>Finalizar</strong>;
                o sistema pede confirmação. Ao confirmar, a prova é encerrada e você vê o resultado.
              </p>

              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-2">Resultado e gabarito</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                Na tela de resultado aparece sua pontuação (quantas questões você acertou do total). Você pode
                clicar em <strong>Novo Simulado</strong> para fazer outra prova ou em <strong>Dashboard </strong>
                para voltar ao início. O histórico de questões respondidas no simulado conta para seu desempenho
                global e para as metas.
              </p>
              <ProTip title="Simulado realista">
                Faça simulados em um ambiente quieto e cronometrado. Use a mesma quantidade de questões que
                costuma cair na sua prova para treinar o ritmo.
              </ProTip>
            </section>

            {/* --- GAMIFICAÇÃO E JOGOS --- */}
            <section id="gamificacao" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Gamepad2 className="h-7 w-7 text-amber-500" />
                Gamificação e Jogos
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                No portal você ganha <strong>XP</strong> (experiência) ao responder questões e completar metas,
                e mantém uma <strong>sequência de dias</strong> (streak) quando estuda com frequência. No
                <strong> Dashboard</strong> e em <strong>Meu Desempenho</strong> você vê precisão global,
                questões realizadas e sua ofensiva atual.
              </p>

              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-2">SpeedRun</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                O <strong>SpeedRun</strong> é um jogo de perguntas e respostas contra o tempo. Acesse pelo menu
                <strong> Sala de Jogos</strong> e depois <strong>SpeedRun</strong>.
              </p>
              <p className="text-slate-600 leading-relaxed mb-4">
                <strong>Regras:</strong> você começa com 60 segundos. Cada <strong>acerto</strong> dá pontos
                (base 100 + bônus por sequência de acertos) e <strong>adiciona tempo</strong> ao cronômetro.
                Cada <strong>erro</strong> <strong>reduz tempo</strong> e zera a sequência. O jogo termina quando
                o tempo chega a zero ou quando você responde todas as questões. Sua pontuação e a maior sequência
                (max combo) são salvas. No menu do SpeedRun você pode <strong>Jogar</strong>, ver o
                <strong> Ranking</strong> (global, por escola ou por turma) e o <strong>Histórico</strong> das
                suas partidas.
              </p>
              <KbImage slug="speedrun-menu" alt="Menu do SpeedRun: abas Jogar, Ranking e Histórico." />
              <ProTip title="Ranking">
                Treine no SpeedRun com frequência para aparecer no ranking da plataforma. Acertar em
                sequência aumenta a pontuação e o tempo disponível.
              </ProTip>
            </section>

            {/* --- METAS --- */}
            <section id="metas" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Target className="h-7 w-7 text-emerald-600" />
                Metas
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                A página <strong>Metas</strong> (menu do aluno) é onde você acompanha e cumpre objetivos de
                estudo. As metas podem vir da
                <strong> sugestão da IA</strong> ou ser <strong>pessoais</strong> (criadas por você).
              </p>
              <p className="text-slate-600 leading-relaxed mb-4">
                No topo da página há três abas: <strong>Em Aberto</strong>, <strong>Concluídas</strong> e
                <strong> Ranking</strong>. Em &quot;Em Aberto&quot; aparecem as metas que você ainda não
                finalizou; a primeira da lista pode ser destacada como &quot;Foco Principal&quot; com barra
                de progresso. Em &quot;Concluídas&quot; fica o histórico do que você já bateu. Em
                &quot;Ranking&quot; você vê como ganhar pontos (sugestão IA, meta pessoal)
                e o Hall da plataforma.
              </p>
              <KbImage slug="metas" alt="Página Metas: abas Em Aberto, Concluídas, Ranking; Nova Meta, Sugestão IA e card Foco Principal." />
              <p className="text-slate-600 leading-relaxed mb-4">
                Para criar uma meta pessoal, clique em <strong>Nova Meta</strong>: preencha título, descrição
                (opcional), quantidade e prazo, depois <strong>Confirmar Meta</strong>. Para aceitar uma
                sugestão da IA, clique em <strong>Sugestão IA</strong> e, quando aparecer a sugestão, abra
                o modal e confirme. Para atualizar o progresso de uma meta (ex.: &quot;Li 2 de 5 capítulos&quot;),
                use o controle de progresso no card da meta; quando atingir 100%, ela vai para Concluídas.
              </p>
            </section>

            {/* --- MEU DESEMPENHO --- */}
            <section id="desempenho" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <BarChart3 className="h-7 w-7 text-indigo-600" />
                Meu Desempenho
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                A página <strong>Meu Desempenho</strong> (ou Performance Global) reúne suas métricas de
                estudo em um só lugar. Acesse pelo menu do aluno.
              </p>
              <p className="text-slate-600 leading-relaxed mb-4">
                Você verá: <strong>Precisão global</strong> (percentual de acertos nas questões realizadas),
                <strong> total de questões</strong> respondidas, <strong>ofensiva atual</strong> (streak em
                dias) e <strong>XP total</strong>. Há também o desempenho por matéria (quantas questões por
                disciplina e qual sua taxa de acerto em cada uma), um gráfico de <strong>atividade ao longo
                do tempo</strong> (quantas questões por dia) e um resumo de <strong>jogos</strong> (partidas,
                melhor pontuação, tempo de jogo). As metas ativas e concluídas também aparecem em resumo.
              </p>
              <KbImage slug="desempenho" alt="Dashboard Meu Desempenho: Precisão, Questões, Streak, XP e gráfico de atividade." />
              <p className="text-slate-600 leading-relaxed mb-4">
                Use essa tela para identificar em qual matéria você está mais forte ou mais fraco e para
                manter a consistência. A opção &quot;Revisar erros&quot; (quando disponível) leva você a
                questões que você errou para revisão.
              </p>
              <ProTip title="Estratégia">
                Priorize as matérias com menor precisão no Meu Desempenho. Fazer um pouco todo dia mantém o
                streak e o ritmo para os vestibulares.
              </ProTip>
            </section>

            {/* --- SUPORTE --- */}
            <section id="suporte" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                <MessageSquare className="h-7 w-7 text-blue-600" />
                Suporte
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Se precisar de ajuda além deste manual, use a <strong>Central de Ajuda e Suporte</strong>:
                no menu, acesse <strong>Ajuda e Suporte</strong>. Lá você encontra:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 mb-4">
                <li>
                  <strong>Base de Conhecimento</strong> — este manual e outros guias.
                </li>
                <li>
                  <strong>Suporte via WhatsApp</strong> — link para conversar com a equipe.
                </li>
                <li>
                  <strong>E-mail de Suporte</strong> — <a href="https://mail.google.com/mail/?view=cm&fs=1&to=igorsilvacruz284@gmail.com&su=Suporte%20StudyTrack&body=Ol%C3%A1%2C%20equipe%20StudyTrack!%0A%0APreciso%20de%20ajuda%20com%3A%0A%0A%5BDescreva%20aqui%20sua%20d%C3%BAvida%2C%20problema%20t%C3%A9cnico%20ou%20solicita%C3%A7%C3%A3o%5D%0A%0AMeus%20dados%20(opcional)%3A%0A-%20Nome%3A%0A-%20E-mail%20da%20conta%3A%0A%0AObrigado(a)!" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">abre o Gmail</a> com um modelo de mensagem para dúvidas sobre conta, assinatura ou problemas técnicos.
                </li>
                <li>
                  <strong>Auditoria de Questões</strong> — status dos reports de erro que você enviou no Banco de Questões.
                </li>
              </ul>
              <p className="text-slate-600 leading-relaxed">
                Para reportar erro em questão, use sempre o botão &quot;Reportar Erro&quot; no card da questão;
                não envie apenas por e-mail. Assim o time pedagógico consegue localizar e corrigir mais rápido.
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
