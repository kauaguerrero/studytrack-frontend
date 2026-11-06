// CT-B: barra de progresso do Cronograma dentro do banco de questões.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

const { fetchMock, push } = vi.hoisted(() => ({ fetchMock: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));
vi.mock('@/lib/cronograma', async (orig) => ({ ...(await orig<typeof import('@/lib/cronograma')>()), cronogramaFetch: fetchMock }));

import { StudyProgressBar, RETURN_DELAY_MS } from '@/components/cronograma/StudyProgressBar';
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
  it('CT-B04 meta batida: comemora e volta pro cronograma com ?concluido', async () => {
    fetchMock.mockResolvedValue(prog({ answered: 10, status: 'done', just_completed: true }));
    localStorage.setItem('cronograma:study-start:it-1', '2026-11-06T10:00:00.000Z');
    mount(); await flush();
    expect(screen.getByRole('status')).toHaveTextContent('Meta batida!');
    expect(localStorage.getItem('cronograma:study-start:it-1')).toBeNull();
    await flush(RETURN_DELAY_MS + 10);
    expect(push).toHaveBeenCalledWith('/partners/cenas/student/cronograma?concluido=it-1');
  });
  it('CT-B05 "Continuar respondendo" cancela a volta automática', async () => {
    fetchMock.mockResolvedValue(prog({ answered: 10, status: 'done', just_completed: true }));
    mount(); await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar respondendo' }));
    await flush(RETURN_DELAY_MS + 10);
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Ir para o cronograma' })).toHaveAttribute('href', '/partners/cenas/student/cronograma?concluido=it-1');
  });
  it('CT-B06 card já concluído antes: só avisa, sem confete nem redirecionar', async () => {
    fetchMock.mockResolvedValue(prog({ answered: 10, status: 'done', just_completed: false }));
    mount(); await flush(RETURN_DELAY_MS + 10);
    expect(screen.getByText(/Conteúdo já concluído/)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
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
