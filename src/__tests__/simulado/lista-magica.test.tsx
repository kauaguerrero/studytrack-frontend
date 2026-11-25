// Lista mágica (fase 6): temas com o motivo, começar leva ao simulado,
// conflito com outro simulado aberto, lista feita mostra a revisão, vazia explica.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { fetchMock, push, toast } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  push: vi.fn(),
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));
vi.mock('sonner', () => ({ toast }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/contexts/OrgContext', () => ({ useOrg: () => ({ org: { slug: 'cenas' } }) }));
vi.mock('@/lib/lista-magica', async (orig) => ({
  ...(await orig<typeof import('@/lib/lista-magica')>()), magicListFetch: fetchMock,
}));

import { ListaMagica } from '@/components/lista-magica/ListaMagica';
import { MagicListFetchError, type MagicList } from '@/lib/lista-magica';

const LIST: MagicList = {
  id: 'L1', week_start: '2026-11-23', status: 'ready', total_questions: 10, session_id: null,
  score: null, total: null, completed_at: null,
  topics: [
    { subject: 'Matemática', discipline: 'Funções', qty: 6, reason: 'erro_recente', temperature: 2, mastery: 0.4 },
    { subject: 'Química', discipline: 'Estequiometria', qty: 4, reason: 'nivel_baixo', temperature: 0, mastery: 0.3 },
  ],
};

beforeEach(() => { fetchMock.mockReset(); push.mockReset(); });

describe('Lista mágica', () => {
  it('CT-L01 mostra os temas com o motivo e começa no simulado', async () => {
    fetchMock.mockResolvedValueOnce({ enabled: true, list: LIST })
      .mockResolvedValueOnce({ session_id: '11111111-1111-1111-1111-111111111111' });
    render(<ListaMagica />);
    expect(await screen.findByText('Funções')).toBeInTheDocument();
    expect(screen.getByText(/semana de 23\/11/)).toBeInTheDocument();
    expect(screen.getByText(/você errou recentemente/)).toBeInTheDocument();
    expect(screen.getByText(/seu nível ainda está baixo/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Começar a lista' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/partners/cenas/student/simulado?resume=11111111-1111-1111-1111-111111111111'));
    expect(fetchMock).toHaveBeenLastCalledWith('/start', { method: 'POST' });
  });

  it('CT-L02 outro simulado aberto: avisa e não navega', async () => {
    fetchMock.mockResolvedValueOnce({ enabled: true, list: LIST })
      .mockRejectedValueOnce(new MagicListFetchError('x', 409, { code: 'active_session' }));
    render(<ListaMagica />);
    fireEvent.click(await screen.findByRole('button', { name: 'Começar a lista' }));
    expect(await screen.findByText(/outro simulado em andamento/)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('CT-L03 feita: nota e link de revisão; vazia: explica', async () => {
    fetchMock.mockResolvedValueOnce({ enabled: true, list: { ...LIST, status: 'done', score: 7, total: 10, session_id: 's9' } });
    const { unmount } = render(<ListaMagica />);
    expect(await screen.findByText(/Lista feita: 7 de 10/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Revisar/ })).toHaveAttribute('href', '/partners/cenas/student/simulado/s9/revisao');
    unmount();
    fetchMock.mockResolvedValueOnce({ enabled: true, list: { ...LIST, status: 'empty', topics: [], total_questions: 0 } });
    render(<ListaMagica />);
    expect(await screen.findByText(/Ainda não há temas/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Começar/ })).toBeNull();
  });
});
