/** Formata apenas a apresentação, preservando siglas e os valores usados nos filtros. */
export function capitalizeQuestionLabel(value: string): string {
  return value.replace(/^(\s*)(\p{Ll})/u, (_, whitespace: string, first: string) => whitespace + first.toLocaleUpperCase('pt-BR'));
}
