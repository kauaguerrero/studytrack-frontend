// Tipos e mapeadores compartilhados entre o wizard Personalizado e o fluxo
// Aleatório (com preview) de criação de simulados pelo founder.
//
// `SelectedQuestion` é o formato usado para RENDERIZAR o preview em tela
// (SimuladoPreviewModal) e para montar `custom_question_ids`/`custom_questions`
// no payload de criação/edição — nos dois modos.

export interface SimuladoAlternative {
  letter: string;
  text: string;
  isCorrect?: boolean;
}

export interface SelectedQuestion {
  id: string;
  subject: string;
  discipline?: string | null;
  difficulty?: string | null;
  alternatives_intro: string;
  context?: string | null;
  images?: unknown;
  alternatives?: SimuladoAlternative[];
  correct_alternative?: string | null;
  testletGroupId?: string;
  testletPosition?: number;
  testletTotal?: number;
  // Carrega `agentic_etl.image_assets`/`content_blocks` — sem isso, o preview
  // do founder não tinha como saber de legendas/fontes/layout lado-a-lado
  // das imagens, nem dos blocos de conteúdo estruturado (heading/instrução/
  // fonte) que a tela do aluno (QuestionContentBlocks) já renderiza.
  metadata?: unknown;
}

// Formato "cru" devolvido tanto pelo endpoint de preview do modo Aleatório
// (POST /scheduled-simulados/preview) quanto pelo QuestionBankExplorer (modo
// Personalizado) — mesmo shape de linha da tabela `questions`.
export interface RawPreviewQuestion {
  id: string;
  subject: string;
  discipline?: string | null;
  difficulty?: string | null;
  alternatives_intro?: string | null;
  context?: string | null;
  images?: unknown;
  alternatives?: SimuladoAlternative[];
  correct_alternative?: string | null;
  testlet_group_id?: string | null;
  metadata?: {
    testlet_order?: number;
    testlet_total?: number;
    [key: string]: unknown;
  } | null;
}

// Deriva (context, alternatives_intro) exatamente como o backend faz ao
// servir a sessão do aluno (`_serialize_question` em simulado_service.py) —
// preview e sessão real precisam concordar aqui, senão o founder vê um
// texto (ex.: um fallback genérico) que o aluno nunca veria, ou vice-versa.
// Espelha bit a bit:
//   context = context; statement = alternatives_intro
//   if not context and statement: context, statement = statement, "Assinale a alternativa correta:"
//   elif context and not statement: statement = "Assinale a alternativa correta:"
export function deriveContextAndStatement(rawContext: string | null | undefined, rawIntro: string | null | undefined) {
  let context = rawContext || '';
  let statement = rawIntro || '';
  if (!context && statement) {
    context = statement;
    statement = 'Assinale a alternativa correta:';
  } else if (context && !statement) {
    statement = 'Assinale a alternativa correta:';
  }
  return { context, statement };
}

export function toSelectedQuestion(raw: RawPreviewQuestion): SelectedQuestion {
  const { context, statement } = deriveContextAndStatement(raw.context, raw.alternatives_intro);
  return {
    id: raw.id,
    subject: raw.subject,
    discipline: raw.discipline,
    difficulty: raw.difficulty,
    alternatives_intro: statement,
    context,
    images: raw.images,
    alternatives: raw.alternatives,
    correct_alternative: raw.correct_alternative,
    testletGroupId: raw.testlet_group_id || undefined,
    testletPosition: typeof raw.metadata?.testlet_order === 'number' ? raw.metadata.testlet_order + 1 : undefined,
    testletTotal: typeof raw.metadata?.testlet_total === 'number' ? raw.metadata.testlet_total : undefined,
    metadata: raw.metadata,
  };
}

// Snapshot enviado ao backend em config.custom_questions — usado como fallback
// quando alguma questão ainda não está persistida em `questions` (ex.: gerada
// por IA/criada manualmente no wizard Personalizado, ou para o PDF preview).
export function toCustomQuestionSnapshot(question: SelectedQuestion) {
  return {
    id: question.id,
    subject: question.subject,
    discipline: question.discipline,
    difficulty: question.difficulty,
    alternatives_intro: question.alternatives_intro,
    context: question.context,
    images: question.images,
    alternatives: question.alternatives,
    correct_alternative: question.correct_alternative,
    metadata: question.metadata,
  };
}
