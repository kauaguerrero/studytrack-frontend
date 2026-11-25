// Simulado por gabarito: helpers do editor (colar letras, pendências, payload).
import { describe, it, expect } from 'vitest';
import { applyLetters, draftProblem, emptyItems, toPayload } from '@/lib/answer-key';

describe('gabarito', () => {
  it('cola letras na ordem, ignora espaços/números e * anula', () => {
    const items = applyLetters(emptyItems(5), '1-a 2-B c*e');
    expect(items.map((i) => i.correct_option)).toEqual(['A', 'B', 'C', null, 'E']);
    expect(items[3].annulled).toBe(true);
  });
  it('aponta a primeira pendência', () => {
    const items = emptyItems(2);
    expect(draftProblem(items)).toBe('Questão 1: falta a resposta certa.');
    items[0] = { ...items[0], correct_option: 'A' };
    expect(draftProblem(items)).toBe('Questão 1: falta a matéria.');
    items[0].subject = 'Matemática';
    items[1] = { ...items[1], annulled: true, subject: 'Física' };
    expect(draftProblem(items)).toBeNull();
    expect(draftProblem([])).toMatch(/quantas questões/);
  });
  it('aumentar a quantidade preserva o que já foi preenchido', () => {
    const a = applyLetters(emptyItems(2), 'AB');
    const b = emptyItems(4, a);
    expect(b.map((i) => i.correct_option)).toEqual(['A', 'B', null, null]);
    expect(toPayload([{ ...a[0], subject: ' Matemática ', discipline: '' }])[0]).toEqual(
      { number: 1, correct_option: 'A', subject: 'Matemática', discipline: null, annulled: false });
  });
});
