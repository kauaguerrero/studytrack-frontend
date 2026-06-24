export interface Slide01Data {
  logoUrl: string;
  title: string;
  tagline: string;
  subtitle: string;
  badge: string;
}

export interface FounderData {
  name: string;
  role: string;
  details: string[];
  photoUrl: string;
}

export interface Slide02Data {
  founders: FounderData[];
}

export interface FeatureData {
  iconName: string;
  title: string;
  description: string;
}

export interface Slide03Data {
  features: FeatureData[];
}

export interface FlowStep {
  number: number;
  title: string;
  description: string;
}

export interface MetricCard {
  value: string;
  label: string;
  color: string;
}

export interface Slide04Data {
  flowSteps: FlowStep[];
  metrics: MetricCard[];
  flowQuote: string;
}

export interface StatData {
  value: number;
  label: string;
  color: string;
}

export interface ChartDataPoint {
  name: string;
  Madrugada: number;
  Manhã: number;
  Tarde: number;
  Noite: number;
}

export interface RankingEntry {
  position: number;
  name: string;
  subject: string;
  responses: number;
  accuracy: number;
  initials: string;
  color: string;
}

export interface Slide05Data {
  caseName: string;
  subtitle: string;
  stats: StatData[];
  chartData: ChartDataPoint[];
  ranking: RankingEntry[];
}

export interface ApprovalImage {
  url: string;
  alt: string;
}

export interface Slide06Data {
  sectionLabel: string;
  title: string;
  subtitle: string;
  images: ApprovalImage[];
}

export interface CostItem {
  label: string;
  percentage: number;
  color: string;
  description: string;
}

export interface Slide07Data {
  title: string;
  subtitle: string;
  breakdown: CostItem[];
  note: string;
}

export interface Slide08Data {
  label: string;
  clientName: string;
  price: string;
  period: string;
  features: string[];
  badge: string;
  footer: string;
}

export interface Slide09Data {
  logoUrl: string;
  mainText: string;
  highlightText: string;
  contact: string;
  nextStep: string;
  validity: string;
}

export interface PainPoint {
  icon: string;
  title: string;
  description: string;
}

export interface SlideDesafioData {
  sectionLabel: string;
  title: string;
  painPoints: PainPoint[];
  closing: string;
}

export interface RiskItem {
  title: string;
  description: string;
}

export interface SlideDecisaoData {
  sectionLabel: string;
  title: string;
  items: RiskItem[];
}

export interface TimelineEntry {
  name: string;
  status: 'active' | 'negotiation';
  statusLabel: string;
  description: string;
}

export interface SlideTimelineData {
  title: string;
  subtitle: string;
  entries: TimelineEntry[];
}

export interface PresentationData {
  slide01: Slide01Data;
  slideDesafio: SlideDesafioData;
  slide02: Slide02Data;
  slide03: Slide03Data;
  slide04: Slide04Data;
  slide05: Slide05Data;
  slideTimeline: SlideTimelineData;
  slide06: Slide06Data;
  slide07: Slide07Data;
  slideDecisao: SlideDecisaoData;
  slide08: Slide08Data;
  slide09: Slide09Data;
}

export const SLIDE_TITLES = [
  'Capa',
  'Equipe',
  'O Desafio',
  'O que Oferecemos',
  'Redação & Métricas',
  'Case de Sucesso',
  'Parcerias',
  'Aprovações',
  'Custos',
  'Decisão Sem Risco',
  'Proposta',
  'Encerramento',
];

export const DEFAULT_SLIDES: PresentationData = {
  slide01: {
    logoUrl: '/logost-transparente.png',
    title: 'Studytrack',
    tagline: 'Gestão de desempenho para\ncursinhos que aprovam.',
    subtitle: 'Software white-label B2B para o pré-vestibular',
    badge: 'PROPOSTA COMERCIAL · MAIS APROVAÇÃO',
  },
  slide02: {
    founders: [
      {
        name: 'Igor Cruz',
        role: 'Co-fundador & CTO',
        details: ['Engenharia de Software — FAFRAM', 'Diretório Acadêmico — Chapa Overflow'],
        photoUrl: '',
      },
      {
        name: 'Kauã Guerrero',
        role: 'Co-fundador & CEO',
        details: ['Engenharia de Software — FAFRAM', 'Diretório Acadêmico — Chapa Overflow'],
        photoUrl: '',
      },
    ],
  },
  slide03: {
    features: [
      {
        iconName: 'BookOpen',
        title: '+5.000 Questões Categorizadas',
        description: 'Por disciplina, assunto e dificuldade — com filtros por banca e ano.',
      },
      {
        iconName: 'BarChart2',
        title: 'Dashboard de Métricas por Aluno',
        description: 'Evolução individual em tempo real com gaps identificados automaticamente.',
      },
      {
        iconName: 'ClipboardCheck',
        title: 'Simulados com Correção Automática',
        description: 'Monte provas personalizadas e receba resultados instantâneos por competência.',
      },
      {
        iconName: 'Palette',
        title: 'Identidade Visual Exclusiva',
        description: 'Plataforma com a logo, cores e domínio do cursinho. Marca 100% sua.',
      },
      {
        iconName: 'LogIn',
        title: 'Portal Exclusivo para Alunos',
        description: 'Login dedicado com gestão de turmas, matrículas e perfis de alunos.',
      },
      {
        iconName: 'FileText',
        title: 'Fluxo Completo de Redações',
        description: 'Envio, correção por competências ENEM e feedback estruturado. Histórico por aluno.',
      },
      {
        iconName: 'Video',
        title: 'Hospedagem de Videoaulas',
        description: 'Publique até 50 videoaulas diretamente na plataforma, vinculadas ao plano de estudos de cada turma.',
      },
      {
        iconName: 'Headphones',
        title: 'Suporte Direto com os Devs',
        description: 'Canal prioritário com a equipe técnica. Sem tickets, sem fila.',
      },
    ],
  },
  slide04: {
    flowSteps: [
      { number: 1, title: 'Aluno envia digitalmente', description: 'Foto ou arquivo direto no app, em segundos' },
      { number: 2, title: 'Professor corrige na plataforma', description: 'Anotações, comentários e pontuação por competência' },
      { number: 3, title: 'Nota e feedback imediatos', description: 'Aluno recebe tudo em tempo real, com histórico' },
      { number: 4, title: 'Histórico de evolução', description: 'Evolução semana a semana, visível para aluno e professor' },
    ],
    metrics: [
      { value: '83%', label: 'Taxa média de acerto em simulados', color: '#6366f1' },
      { value: '34', label: 'Alunos monitorados em tempo real', color: '#14b8a6' },
      { value: '3×', label: 'Mais engajamento vs. turmas sem plataforma', color: '#f59e0b' },
      { value: '207', label: 'Simulados realizados em 1 semestre', color: '#3b82f6' },
    ],
    flowQuote: 'Sem papel, sem planilha, sem e-mail.',
  },
  slide05: {
    caseName: 'Opus Cursinho — Engajamento em Números',
    subtitle: 'CASE DE SUCESSO',
    stats: [
      { value: 1996, label: 'Questões resolvidas', color: '#6366f1' },
      { value: 207, label: 'Simulados gerados', color: '#3b82f6' },
      { value: 34, label: 'Alunos ativos', color: '#14b8a6' },
      { value: 28, label: 'Redações entregues', color: '#f59e0b' },
    ],
    chartData: [
      { name: '06h', Madrugada: 8, Manhã: 0, Tarde: 0, Noite: 0 },
      { name: '09h', Madrugada: 0, Manhã: 58, Tarde: 0, Noite: 0 },
      { name: '12h', Madrugada: 0, Manhã: 35, Tarde: 32, Noite: 0 },
      { name: '15h', Madrugada: 0, Manhã: 0, Tarde: 100, Noite: 0 },
      { name: '19h', Madrugada: 0, Manhã: 0, Tarde: 0, Noite: 74 },
      { name: '23h', Madrugada: 10, Manhã: 0, Tarde: 0, Noite: 28 },
    ],
    ranking: [
      { position: 1, name: 'Marcus Vinícius Rocha', subject: 'Exatas', responses: 185, accuracy: 78, initials: 'MV', color: '#6366f1' },
      { position: 2, name: 'Ana Karoline Dourada Gomes', subject: 'Humanas', responses: 162, accuracy: 74, initials: 'AK', color: '#14b8a6' },
      { position: 3, name: 'Pedro Henrique Silva', subject: 'Ciências', responses: 145, accuracy: 71, initials: 'PH', color: '#3b82f6' },
      { position: 4, name: 'Larissa Fernandes Costa', subject: 'Linguagens', responses: 138, accuracy: 68, initials: 'LF', color: '#f59e0b' },
    ],
  },
  slideTimeline: {
    title: 'Quem já confia na StudyTrack',
    subtitle: 'Parcerias ativas e em expansão',
    entries: [
      {
        name: 'Opus Cursinho',
        status: 'active',
        statusLabel: 'Parceiro Ativo',
        description: 'Cliente ativo com operação acompanhada pela plataforma, consolidando dados de engajamento, simulados e evolução dos alunos.',
      },
      {
        name: 'AVE',
        status: 'active',
        statusLabel: 'Parceiro Ativo',
        description: 'Cliente ativo com plataforma implantada, reforçando a presença da StudyTrack em operações educacionais parceiras.',
      },
      {
        name: 'Colégio JR',
        status: 'negotiation',
        statusLabel: 'Em negociação',
        description: 'Proposta em andamento para início no 2º semestre de 2026.',
      },
    ],
  },
  slide06: {
    sectionLabel: 'APROVAÇÕES',
    title: 'Resultados que falam por si.',
    subtitle: '1º semestre de 2026 — Opus Cursinho, Goiás',
    images: [
      { url: '', alt: 'Aprovado 1' },
      { url: '', alt: 'Aprovado 2' },
    ],
  },
  slide07: {
    title: 'Transparência nos Custos',
    subtitle: 'Cada real investido tem um propósito claro',
    breakdown: [
      {
        label: 'Processamento de dados (em dólar)',
        percentage: 40,
        color: '#6366f1',
        description: 'Processamento de dados em larga escala para correções, análises e geração de métricas automáticas — cobrado em dólar via provedores internacionais',
      },
      {
        label: 'Infraestrutura',
        percentage: 35,
        color: '#14b8a6',
        description: 'Servidores, banco de dados, escalabilidade e monitoramento em tempo real',
      },
      {
        label: 'Hospedagem',
        percentage: 25,
        color: '#f59e0b',
        description: 'CDN, domínios, SSL e entrega de conteúdo para todo o Brasil',
      },
    ],
    note: 'Infraestrutura e hospedagem em BRL · Processamento de dados cobrado em USD via provedores internacionais',
  },
  slide08: {
    label: 'PROPOSTA EXCLUSIVA',
    clientName: 'Para o seu cursinho',
    price: 'R$ 800',
    period: '/mês',
    features: [
      'White label com a marca do cursinho',
      'Banco de questões completo (+5.000)',
      'Simulados online e presenciais ilimitados',
      'Correção de redações com processamento de dados',
      'Até 50 videoaulas integradas à plataforma',
      'Dashboards e métricas em tempo real',
      'Suporte direto com os devs',
    ],
    badge: 'Tudo incluso',
    footer: 'Sem taxas ocultas · Sem contratos longos · Cancele quando quiser',
  },
  slideDesafio: {
    sectionLabel: 'O DESAFIO DE TODO CURSINHO',
    title: 'O que está pesando na rotina do seu cursinho hoje?',
    painPoints: [
      {
        icon: '📝',
        title: 'Correção manual sem visibilidade de evolução',
        description: 'Quando você corrige algumas poucas redações dá para perceber quem está evoluindo. Mas no acumulado do ano letivo, sem dados estruturados, não tem como saber exatamente o que o aluno melhorou e o que regrediu — o professor vai no feeling.',
      },
      {
        icon: '📉',
        title: 'Evasão percebida tarde demais',
        description: 'Sem acompanhamento individual de frequência e rendimento, o aluno começa a falhar, cai de desempenho e some. Você só percebe quando ele já cancelou — e recuperar um aluno perdido custa mais do que retê-lo.',
      },
      {
        icon: '📊',
        title: 'Impossível mostrar resultado na hora de renovar',
        description: 'Na reunião de renovação, o coordenador depende de memória ou planilhas avulsas. Sem um relatório claro de evolução por aluno, convencer o pai de que o cursinho está fazendo diferença vira um argumento subjetivo.',
      },
    ],
    closing: 'É exatamente isso que a StudyTrack resolve.',
  },
  slideDecisao: {
    sectionLabel: 'DECISÃO SEM RISCO',
    title: 'Por que começar agora',
    items: [
      {
        title: 'Suporte rápido e direto com os devs',
        description: 'Canal direto com a equipe técnica. Sem tickets, sem fila — qualquer problema resolvido com prioridade.',
      },
      {
        title: 'Sem surpresas no contrato',
        description: 'Cancele quando quiser, sem multa. Sem taxa de adesão. Sem custos escondidos.',
      },
      {
        title: 'Implementação e onboarding inclusos',
        description: 'Treinamento da equipe incluso, sem custo extra. A plataforma fica pronta pra usar em dias, não semanas.',
      },
    ],
  },
  slide09: {
    logoUrl: '/logost-transparente.png',
    mainText: 'Junte-se a nós e comece a',
    highlightText: 'impulsionar os seus resultados.',
    contact: 'studytrack.com.br · @studytrackbr',
    nextStep: 'Agende 15 minutos pra ver a plataforma funcionando com dados reais do seu cursinho',
    validity: 'Proposta válida por 15 dias',
  },
};
