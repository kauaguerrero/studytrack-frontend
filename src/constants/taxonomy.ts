export const TAXONOMY = {
    "Matemática": ["Matemática Básica", "Grandezas Proporcionais", "Geometria Plana", "Geometria Espacial", "Estatística e Gráficos", "Probabilidade", "Análise Combinatória", "Funções", "Logaritmos", "Trigonometria", "Matemática Financeira"],
    "Física": ["Cinemática", "Dinâmica", "Estática e Hidrostática", "Termologia", "Óptica Geométrica", "Ondulatória", "Eletrodinâmica", "Eletrostática e Magnetismo", "Física Moderna"],
    "Química": ["Química Geral e Inorgânica", "Atomística", "Físico-Química", "Termoquímica", "Equilíbrio Químico", "Eletroquímica", "Química Orgânica", "Química Ambiental"],
    "Biologia": ["Citologia e Metabolismo", "Genética e Biotecnologia", "Evolução", "Ecologia", "Fisiologia Humana", "Saúde e Doenças", "Botânica", "Zoologia"],
    "História": ["Brasil Colônia", "Brasil Império", "Brasil República", "História Antiga", "Idade Média", "Idade Moderna", "Idade Contemporânea", "História da América"],
    "Geografia": ["Geografia Física", "Geografia Humana", "Geografia Econômica", "Geopolítica", "Geografia do Brasil", "Cartografia", "Meio Ambiente e Sustentabilidade"],
    "Filosofia": ["Filosofia Antiga e Medieval", "Filosofia Moderna", "Filosofia Contemporânea", "Ética e Política", "Teoria do Conhecimento"],
    "Sociologia": ["Mundo do Trabalho", "Cultura e Indústria Cultural", "Poder, Estado e Política", "Movimentos Sociais", "Desigualdade e Estratificação Social"],
    "Linguagens": ["Interpretação de Texto", "Gêneros Textuais", "Funções da Linguagem", "Figuras de Linguagem", "Literatura Brasileira", "Arte e Cultura", "Variação Linguística", "Gramática Aplicada"],
    "Inglês": ["Interpretação de Texto", "Vocabulário e Gramática"],
    "Espanhol": ["Interpretação de Texto", "Vocabulário e Gramática"]
} as const;

export type Subject = keyof typeof TAXONOMY;

// Helper: Retorna todas as Matérias disponíveis
export function getSubjects(): string[] {
    return Object.keys(TAXONOMY);
}

// Helper: Retorna tópicos de uma matéria específica
export function getTopics(subject: string): readonly string[] {
    // @ts-ignore
    return TAXONOMY[subject] || [];
}