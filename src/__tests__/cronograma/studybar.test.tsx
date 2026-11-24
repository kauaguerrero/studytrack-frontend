// CT-B: barra de progresso do Cronograma dentro do banco de questões.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

const { fetchMock, push } = vi.hoisted(() => ({ fetchMock: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));
vi.mock('@/lib/cronograma', async (orig) => ({ ...(await orig<typeof import('@/lib/cronograma')>()), cronogramaFetch: fetchMock }));

import { StudyProgressBar } from '@/components/cronograma/StudyProgressBar';
import type { StudyProgress } from '@/lib/cronograma';

const prog = (over: Partial<StudyProgress> = {}): StudyProgress => ({
  item_id: 'it-1', goal: 10, answered: 3, status: 'pending', just_completed: false,
  topic: 'Elementos da Comunicação', subject: 'Língua Portuguesa', discipline: 'Interpretação de Texto', ...over,
});

const flush = async (ms = 0) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  fetchMock.mockReset(); push.mockReset(); localStorage.clear();
});
afterEach(() => { vi.useRealTimers(); });

const mount = (tick = 0) => render(<StudyProgressBar slug="cenas" itemId="it-1" answerTick={tick} />);

describe('StudyProgressBar', () => {
  it('CT-B01 mostra o conteúdo e "3/10 questões" com a barra', async () => {
    fetchMock.mockResolvedValue(prog());
    mount(); await flush();
    expect(screen.getByText(/Elementos da Comunicação/)).toBeInTheDocument();
    expect(screen.getByText('3/10 questões')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Questões do conteúdo' })).toHaveAttribute('aria-valuenow', '3');
  });
  it('CT-B02 manda o início da sessão (guardado) no since', async () => {
    localStorage.setItem('cronograma:study-start:it-1', '2026-11-06T10:00:00.000Z');
    fetchMock.mockResolvedValue(prog());
    mount(); await flush();
    expect(fetchMock).toHaveBeenCalledWith('/items/it-1/progress?since=2026-11-06T10%3A00%3A00.000Z');
  });
  it('CT-B03 cada resposta soma +1 na hora e reconta no backend', async () => {
    fetchMock.mockResolvedValue(prog());
    const r = mount(); await flush();
    fetchMock.mockResolvedValue(prog({ answered: 4 }));
    r.rerender(<StudyProgressBar slug="cenas" itemId="it-1" answerTick={1} />);
    expect(screen.getByText('4/10 questões')).toBeInTheDocument();
    await flush(500);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText('4/10 questões')).toBeInTheDocument();
  });
  const stats = { correct: 7, total: 10, avg_seconds: 72 };
  it('CT-B04 meta batida: abre o resumo com acertos e tempo médio, sem sair da página', async () => {
    fetchMock.mockResolvedValue(prog({ answered: 10, status: 'done', just_completed: true, stats }));
    localStorage.setItem('cronograma:study-start:it-1', '2026-11-06T10:00:00.000Z');
    mount(); await flush();
    const d = screen.getByRole('dialog');
    expect(d).toHaveTextContent('Conteúdo concluído!');
    expect(d).toHaveTextContent('7/10');
    expect(d).toHaveTextContent('70%');
    expect(d).toHaveTextContent('1min 12s');
    expect(localStorage.getItem('cronograma:study-start:it-1')).toBeNull();
    await flush(10000);
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Voltar ao cronograma' })).toHaveAttribute('href', '/partners/cenas/student/cronograma?concluido=it-1');
  });
  it('CT-B05 "Continuar respondendo" fecha o resumo e deixa o resultado na barra', async () => {
    fetchMock.mockResolvedValue(prog({ answered: 10, status: 'done', just_completed: true, stats }));
    mount(); await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar respondendo' }));
    await flush(300);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText(/7\/10 acertos \(70%\) · 1min 12s por questão/)).toBeInTheDocument();
  });
  it('CT-B05b resumo sem respostas (concluiu por outro caminho) não inventa número', async () => {
    fetchMock.mockResolvedValue(prog({ answered: 10, status: 'done', just_completed: true, stats: null }));
    mount(); await flush();
    expect(screen.getByRole('dialog')).toHaveTextContent('Você bateu a meta de 10 questões.');
  });
  it('CT-B06 card já concluído antes: barra com o resultado, sem resumo nem redirecionar', async () => {
    fetchMock.mockResolvedValue(prog({ answered: 10, status: 'done', just_completed: false, stats }));
    mount(); await flush(4000);
    expect(screen.getByText(/Conteúdo concluído · Elementos/)).toBeInTheDocument();
    expect(screen.getByText(/7\/10 acertos/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
  it('CT-B06b ao rolar, a barra vira círculo com x/10 e a borda acompanha o progresso', async () => {
    let cb: (e: { isIntersecting: boolean }[]) => void = () => {};
    vi.stubGlobal('IntersectionObserver', class {
      constructor(fn: typeof cb) { cb = fn; }
      observe() {} disconnect() {}
    });
    fetchMock.mockResolvedValue(prog());
    mount(); await flush();
    expect(screen.queryByRole('progressbar', { name: /Progresso em/ })).toBeNull();
    act(() => cb([{ isIntersecting: false }]));
    const rings = screen.getAllByRole('progressbar', { name: /Progresso em/ });
    expect(rings[0]).toHaveAttribute('aria-valuenow', '3');
    expect(rings[0]).toHaveTextContent('3/10');
    vi.unstubAllGlobals();
  });
  it('CT-B07 erro no backend esconde a barra (não atrapalha o banco)', async () => {
    fetchMock.mockRejectedValue(new Error('x'));
    const r = mount(); await flush();
    expect(r.container).toBeEmptyDOMElement();
  });
  it('CT-B08 +1 otimista nunca passa da meta', async () => {
    fetchMock.mockResolvedValue(prog({ answered: 10 }));
    const r = mount(); await flush();
    r.rerender(<StudyProgressBar slug="cenas" itemId="it-1" answerTick={1} />);
    expect(screen.getByText('10/10 questões')).toBeInTheDocument();
  });
});
