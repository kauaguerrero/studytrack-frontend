// Bancas com formatos fixos de vestibular. Bancas de concursos vêm do catálogo.
export const VESTIBULAR_BANK_OPTIONS = [
  { value: 'Todas', label: 'Todas as bancas' },
  { value: 'ENEM', label: 'ENEM' },
  { value: 'UFU', label: 'UFU' },
  { value: 'UEG', label: 'UEG' },
  { value: 'UFG', label: 'UFG' },
  { value: 'UNESP', label: 'UNESP' },
] as const;

export const VESTIBULAR_BANK_LABELS: Record<string, string> = Object.fromEntries(
  VESTIBULAR_BANK_OPTIONS.map(({ value, label }) => [value, label]),
);
