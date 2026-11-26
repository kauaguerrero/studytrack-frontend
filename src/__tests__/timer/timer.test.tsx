// Timer de estudo (fase 8): formatação, tela do aluno, widget e relatório da coordenação.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const fetchMock = vi.fn();
vi.mock('@/lib/org-classes', () => ({
  classesFetch: (...a: unknown[]) => fetchMock(...a),
  useOrgClasses: () => ({ classes: [{ id: 'c1', name: 'Turma A' }] }),
}));
vi.mock('@/contexts/OrgContext', () => ({ useOrg: () => ({ org: { slug: 'cenas', permissions: { timer_enabled: true } } }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

import { formatClock, formatDuration } from '@/lib/timer';
import { StudyTimerPage } from '@/components/timer/StudyTimerPage';
import { StudyTimerWidget } from '@/components/timer/StudyTimerWidget';
import { SchoolTimerReport } from '@/components/timer/SchoolTimerReport';
import { StudyTimeKpi } from '@/components/timer/StudyTimeKpi';

const OPEN = { id: 't1', subject: 'Física', discipline: 'Cinemática', plan_item_id: null, status: 'running', started_at: '2026-11-25T13:00:00Z',
  auto_paused: false, ended_at: null, elapsed_seconds: 125 };
const EMPTY_REPORT = { from: '2026-11-19', to: '2026-11-25', total_seconds: 0, sessions: 0, by_subject: [], by_day: [] };

beforeEach(() => { fetchMock.mockReset(); });

/** Backend falso com estado: as ações mudam o que GET /timer devolve. */
function fakeBackend(initial: typeof OPEN | null) {
  let cur: Record<string, unknown> | null = initial ? { ...initial } : null;
  fetchMock.mockImplementation((_s: string, path: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    if (path === '/timer') return Promise.resolve({ timer: cur, today_seconds: 0 });
    if (String(path).startsWith('/timer/report')) return Promise.resolve(EMPTY_REPORT);
    if (path === '/timer/start') { cur = { ...OPEN, elapsed_seconds: 0, discipline: null, ...body }; return Promise.resolve({ timer: cur }); }
    if (path === '/timer/pause') { cur = { ...cur, status: 'paused' }; return Promise.resolve({ timer: cur }); }
    if (path === '/timer/stop') { const t = { ...cur, status: 'finished' }; cur = null; return Promise.resolve({ timer: t, logged_minutes: 2 }); }
    return Promise.reject(new Error(String(path)));
  });
}

describe('timer', () => {
  it('CT-T01 formata relógio e duração', () => {
    expect(formatClock(125)).toBe('02:05');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(formatDuration(600)).toBe('10min');
    expect(formatDuration(5400)).toBe('1h30');
    expect(formatDuration(7200)).toBe('2h');
  });

  it('CT-T02 sem timer aberto: começa com a matéria escolhida', async () => {
    fakeBackend(null);
    render(<StudyTimerPage />);
    fireEvent.click(await screen.findByRole('radio', { name: 'Química' }));
    fireEvent.change(screen.getByLabelText('Assunto'), { target: { value: 'Estequiometria' } });
    fireEvent.click(screen.getByRole('button', { name: /Começar/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('cenas', '/timer/start', expect.objectContaining({ method: 'POST' })));
    const body = JSON.parse(fetchMock.mock.calls.find((c) => c[1] === '/timer/start')![2].body);
    expect(body).toEqual({ subject: 'Química', discipline: 'Estequiometria' });
    expect(await screen.findByTestId('clock')).toHaveTextContent('00:00');
  });

  it('CT-T03 timer aberto: encerra com a anotação', async () => {
    fakeBackend(OPEN);
    render(<StudyTimerPage />);
    expect(await screen.findByTestId('clock')).toHaveTextContent(/02:0\d/);
    fireEvent.change(screen.getByLabelText('Anotação'), { target: { value: 'lista 3' } });
    fireEvent.click(screen.getByRole('button', { name: /Encerrar/ }));
    await waitFor(() => expect(fetchMock.mock.calls.some((c) => c[1] === '/timer/stop')).toBe(true));
    expect(JSON.parse(fetchMock.mock.calls.find((c) => c[1] === '/timer/stop')![2].body)).toEqual({ note: 'lista 3' });
    expect(await screen.findByRole('button', { name: /Começar/ })).toBeInTheDocument();
  });

  it('CT-T04 widget some sem timer e pausa quando há', async () => {
    fakeBackend(null);
    const { container, unmount } = render(<StudyTimerWidget slug="cenas" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    unmount();
    fetchMock.mockReset();
    fakeBackend(OPEN);
    render(<StudyTimerWidget slug="cenas" />);
    expect(await screen.findByTestId('widget-clock')).toHaveTextContent(/02:0\d/);
    fireEvent.click(screen.getByRole('button', { name: 'Pausar timer' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Retomar timer' })).toBeInTheDocument());
  });

  it('CT-T05 relatório da coordenação filtra por turma', async () => {
    fetchMock.mockResolvedValue({ from: '2026-11-19', to: '2026-11-25', total_seconds: 2400, active_students: 1, avg_seconds_active: 2400,
      by_subject: [{ subject: 'Biologia', seconds: 2400, sessions: 1, disciplines: [] }],
      students: [{ user_id: 'u1', name: 'Ana', seconds: 2400, sessions: 1, last_at: null, subjects: [{ subject: 'Biologia', seconds: 2400 }] },
        { user_id: 'u2', name: 'Bia', seconds: 0, sessions: 0, last_at: null, subjects: [] }] });
    render(<SchoolTimerReport />);
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('1 de 2')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Turma'), { target: { value: 'c1' } });
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith('cenas', '/timer-report?days=7&class_id=c1'));
  });

  it('CT-T06 KPI do desempenho: 7 dias vs. anteriores, hoje e matéria top', async () => {
    const by_day = Array.from({ length: 14 }, (_, k) => ({
      date: `2026-11-${String(12 + k).padStart(2, '0')}`, seconds: k < 7 ? 600 : (k === 13 ? 1800 : 900),
    }));
    fetchMock.mockResolvedValue({ from: '2026-11-12', to: '2026-11-25', total_seconds: 0, sessions: 0, by_day,
      by_subject: [{ subject: 'Física', seconds: 3000, sessions: 3, disciplines: [] }] });
    render(<StudyTimeKpi slug="cenas" accent="#4f46e5" />);
    // atual: 6×900 + 1800 = 7200 (2h); anterior: 7×600 = 4200 → +71%
    expect(await screen.findByTestId('study-time-total')).toHaveTextContent('2h');
    expect(screen.getByTestId('study-time-delta')).toHaveTextContent('+71% vs. 7 dias anteriores');
    expect(screen.getByText('Hoje 30min')).toBeInTheDocument();
    expect(screen.getByText('Mais estudada: Física')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('cenas', '/timer/report?days=14');
  });
});
