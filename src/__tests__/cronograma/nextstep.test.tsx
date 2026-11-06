// CT-N: "Próximo passo" abaixo do assistente.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextStep, pickNext } from '@/components/cronograma/NextStep';
import { TODAY, item } from './fixtures';

describe('NextStep', () => {
  it('CT-N01 escolhe o pendente mais cedo, pela posição no dia', () => {
    const a = item({ date: '2026-11-12', position: 1 });
    const b = item({ date: TODAY, position: 5 });
    const c = item({ date: TODAY, position: 2 });
    expect(pickNext([a, b, c], TODAY)?.id).toBe(c.id);
  });
  it('CT-N02 ignora feitos, pulados, previstos e dias passados', () => {
    const its = [
      item({ status: 'done' }), item({ status: 'skipped' }), item({ kind: 'review', projected: true }),
      item({ date: '2026-11-10' }),
    ];
    expect(pickNext(its, TODAY)).toBeNull();
  });
  it('CT-N03 "Começar" abre o item', () => {
    const it1 = item({ topic: 'Logaritmos' });
    const onOpen = vi.fn();
    render(<NextStep items={[it1]} today={TODAY} onOpen={onOpen} />);
    expect(screen.getByText(/^Hoje · Matemática · 45 min$/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Logaritmos/ }));
    expect(onOpen).toHaveBeenCalledWith(it1);
  });
  it('CT-N04 próximo em outro dia mostra o dia da semana', () => {
    render(<NextStep items={[item({ date: '2026-11-13' })]} today={TODAY} onOpen={vi.fn()} />);
    expect(screen.getByText(/^SEX 13\/11 ·/)).toBeInTheDocument();
  });
  it('CT-N05 contador de hoje e semana sem pendências', () => {
    render(<NextStep items={[item({ status: 'done' }), item({ status: 'done' })]} today={TODAY} onOpen={vi.fn()} />);
    expect(screen.getByText(/hoje 2\/2/)).toBeInTheDocument();
    expect(screen.getByText(/Nada pendente nesta semana/)).toBeInTheDocument();
  });
});
