export type QuestionBankFilters = {
  questionType: 'vestibular' | 'concurso' | 'todos';
  role: string;
  institution: string;
  area: string;
  region: string;
  subjects: string[];
  banks: string[];
  topics: string[];
  years: string[];
  difficulties: string[];
  tab: 'todo' | 'done' | 'all';
};

export function buildQuestionBankQuery(filters: QuestionBankFilters, page: number): URLSearchParams {
  const params = new URLSearchParams({ page: String(page), limit: '20', question_type: filters.questionType });
  for (const [name, value] of Object.entries({ role: filters.role, institution: filters.institution, area: filters.area, region: filters.region })) {
    if (value !== 'Todas') params.append(name, value);
  }
  for (const [name, values] of Object.entries({ subject: filters.subjects, bank: filters.banks, topic: filters.topics, year: filters.years, difficulty: filters.difficulties })) {
    for (const value of values) params.append(name, value);
  }
  params.append('tab', filters.tab);
  return params;
}
