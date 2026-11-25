// Flashcards (fase 7): lista com o que há hoje, estudo vira o cartão e manda a
// nota, "Errei" repete no fim sem nova nota; rascunho sem verso é barrado.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { fetchMock, toast } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/contexts/OrgContext', () => ({ useOrg: () => ({ org: { slug: 'cenas' } }) }));
vi.mock('@/lib/flashcards', async (orig) => ({
  ...(await orig<typeof import('@/lib/flashcards')>()), fcFetch: fetchMock,
}));

import { StudentFlashcards } from '@/components/flashcards/StudentFlashcards';
import { StudyDeck } from '@/components/flashcards/StudyDeck';
import { draftsProblem, cleanDrafts } from '@/lib/flashcards';

const card = (id: string, front: string, back: string) => ({ id, deck_id: 'D1', position: 0, front, back, is_new: true });

beforeEach(() => { fetchMock.mockReset(); toast.error.mockReset(); });

describe('Flashcards', () => {
  it('CT-F01 lista baralhos com o que há para hoje', async () => {
    fetchMock.mockResolvedValueOnce({ enabled: true, decks: [
      { id: 'D1', title: 'Química', subject: 'Química', discipline: null, mine: false, card_count: 12, due: 2, new: 9, today: 12 },
      { id: 'D2', title: 'Meu', subject: null, discipline: null, mine: true, card_count: 3, due: 0, new: 0, today: 0 },
    ] });
    render(<StudentFlashcards />);
    expect(await screen.findByText('Química')).toBeInTheDocument();
    expect(screen.getByText('12 cartões para hoje.', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Estudar 12' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Em dia' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Editar Meu' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar Química' })).toBeNull();
  });

  it('CT-F02 estudo: vira, dá nota e repete o "Errei" sem nova nota', async () => {
    fetchMock.mockResolvedValueOnce({ deck: { id: 'D1', title: 'Química', mine: false },
      cards: [card('C1', 'Átomo?', 'Menor unidade'), card('C2', 'Íon?', 'Átomo com carga')] })
      .mockResolvedValue({});
    const onExit = vi.fn();
    render(<StudyDeck slug="cenas" deckId="D1" onExit={onExit} />);
    expect(await screen.findByText('Átomo?')).toBeInTheDocument();
    expect(screen.queryByTestId('card-back')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver resposta' }));
    expect(screen.getByTestId('card-back')).toHaveTextContent('Menor unidade');
    fireEvent.click(screen.getByRole('button', { name: /Errei/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('cenas', '/flashcards/decks/D1/cards/C1/review',
      { method: 'POST', body: JSON.stringify({ grade: 'again' }) }));
    expect(await screen.findByText('Íon?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver resposta' }));
    fireEvent.click(screen.getByRole('button', { name: /Fácil/ }));
    // volta o que errou, só para fixar
    expect(await screen.findByText(/de novo, para fixar/)).toBeInTheDocument();
    expect(screen.getByText('Átomo?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver resposta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Próximo' }));
    expect(await screen.findByText('Feito por hoje: 2 cartões.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);  // sessão + 2 notas
  });

  it('CT-F03 rascunho sem verso é barrado; vazios somem', () => {
    expect(cleanDrafts([{ front: ' a ', back: ' b ' }, { front: '', back: '' }])).toEqual([{ front: 'a', back: 'b' }]);
    expect(draftsProblem([{ front: 'a', back: 'b' }, { front: 'x', back: '' }])).toBe('Cartão 2: falta a resposta (verso).');
    expect(draftsProblem([{ front: '', back: 'y' }])).toBe('Cartão 1: falta a pergunta (frente).');
    expect(draftsProblem([{ front: 'a', back: 'b' }])).toBeNull();
  });
});
