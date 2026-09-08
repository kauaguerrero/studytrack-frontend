// Taxonomia oficial de subject/discipline, sincronizada com public.questions.
// Fonte: auditoria de normalização de 08/09/2026 (130→88 disciplines, 14→13 subjects).
// Ao adicionar uma disciplina nova via ETL, atualize esta lista no mesmo PR —
// é ela quem alimenta os filtros e formulários de criação de questão no frontend.
export const TAXONOMY = {
    "Matemática": ["Matemática Básica", "Grandezas Proporcionais", "Geometria Plana", "Geometria Espacial", "Geometria Analítica", "Estatística e Gráficos", "Probabilidade", "Análise Combinatória", "Funções", "Logaritmos", "Trigonometria", "Matemática Financeira", "Matrizes, Determinantes e Sistemas", "Números Complexos e Polinômios"],
    "Física": ["Cinemática", "Dinâmica", "Estática e Hidrostática", "Termologia", "Óptica Geométrica", "Ondulatória", "Eletrodinâmica", "Eletrostática e Magnetismo", "Física Moderna", "Gravitação Universal"],
    "Química": ["Química Geral e Atomística", "Físico-Química", "Estequiometria", "Equilíbrio Químico", "Eletroquímica", "Soluções", "Separação de Misturas", "Funções Inorgânicas", "Química Orgânica", "Química Ambiental"],
    "Biologia": ["Bioquímica e Citologia", "Histologia e Embriologia", "Genética e Biotecnologia", "Evolução e Origem da Vida", "Ecologia", "Fisiologia Humana", "Saúde, Doenças e Imunologia", "Botânica", "Zoologia"],
    "História": ["História Antiga", "Idade Média", "Idade Moderna", "Idade Contemporânea", "Brasil Colônia", "Brasil Império", "Brasil República", "História da América", "História da África e Cultura Afro-Brasileira"],
    "Geografia": ["Geografia Física", "Geografia Humana", "Geografia do Brasil", "Geografia Urbana e Demografia", "Geografia Agrária", "Geografia Econômica e Indústria", "Geopolítica", "Cartografia e Geoprocessamento", "Meio Ambiente e Sustentabilidade"],
    "Filosofia": ["Filosofia Antiga (Pré-Socráticos a Helenismo)", "Filosofia Medieval (Patrística e Escolástica)", "Filosofia Moderna (Racionalismo, Empirismo, Iluminismo)", "Filosofia Contemporânea (Existencialismo, Escola de Frankfurt)", "Ética e Política", "Teoria do Conhecimento e Lógica"],
    "Sociologia": ["Teoria Sociológica Clássica", "Poder, Estado e Política", "Desigualdade, Estratificação e Violência", "Mundo do Trabalho e Produção", "Cultura, Ideologia e Indústria Cultural", "Movimentos Sociais e Cidadania"],
    "Arte": ["Arte Antiga (Egito, Grécia, Roma)", "Romantismo e Arte Acadêmica", "Impressionismo e Pós-Impressionismo", "Modernismo (Cubismo, Expressionismo, Futurismo, Abstracionismo, Surrealismo)", "Barroco e Neoclassicismo", "Arte Contemporânea (Pop Art, Arte Conceitual, Minimalismo)"],
    "Língua Portuguesa": ["Interpretação de Texto", "Variação Linguística", "Gêneros e Tipos Textuais", "Funções e Figuras de Linguagem", "Gramática e Semântica", "Arte e Cultura", "Literatura: Escolas Literárias", "Literatura Contemporânea"],
    "Inglês": ["Interpretação de Texto", "Vocabulário e Gramática"],
    "Espanhol": ["Interpretação de Texto", "Vocabulário e Gramática"],
    "Francês": ["Interpretação de Texto", "Vocabulário e Gramática"]
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
