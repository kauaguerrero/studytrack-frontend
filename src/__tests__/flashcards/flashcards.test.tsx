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

import { ReviewQueue } from '@/components/flashcards/ReviewQueue';

describe('Aprovação de cartões de aluno', () => {
  const GROUP = {
    deck: { id: 'D9', title: 'Fórmulas', subject: null, shared: false },
    author: { id: 'U1', name: 'Ana', classes: ['T1'] },
    cards: [
      { id: 'C1', front: 'F = ?', back: 'm·a', updated_at: '' },
      { id: 'C2', front: 'v = ?', back: 'errado', updated_at: '' },
    ],
  };

  it('CT-F04 aprova um, recusa outro com motivo e aprova todos', async () => {
    const onChange = vi.fn();
    fetchMock.mockResolvedValueOnce({ groups: [GROUP] })
      .mockResolvedValueOnce({ updated: 1 }).mockResolvedValueOnce({ groups: [{ ...GROUP, cards: [GROUP.cards[1]] }] })
      .mockResolvedValueOnce({ updated: 1 }).mockResolvedValueOnce({ groups: [] });
    render(<ReviewQueue slug="cenas" onChange={onChange} />);
    expect(await screen.findByText('Ana · T1')).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(2);
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar: F = ?' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('cenas', '/flashcard-reviews',
      { method: 'POST', body: JSON.stringify({ card_ids: ['C1'], action: 'approve' }) }));
    await waitFor(() => expect(screen.queryByText('F = ?')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Recusar: v = ?' }));
    fireEvent.change(screen.getByLabelText('Motivo da recusa'), { target: { value: 'Resposta errada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Recusar' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('cenas', '/flashcard-reviews',
      { method: 'POST', body: JSON.stringify({ card_ids: ['C2'], action: 'reject', note: 'Resposta errada' }) }));
    expect(await screen.findByText('Nenhum cartão aguardando aprovação.')).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it('CT-F05 aluno vê baralho da turma e o status dos próprios cartões', async () => {
    fetchMock.mockResolvedValueOnce({ enabled: true, decks: [
      { id: 'D8', title: 'Da Bia', subject: null, discipline: null, mine: false, source: 'class', card_count: 2, due: 0, new: 2, today: 2 },
      { id: 'D9', title: 'Fórmulas', subject: null, discipline: null, mine: true, source: 'mine', pending: 1, shared: true, card_count: 2, due: 0, new: 2, today: 2 },
    ] }).mockResolvedValueOnce({ deck: { title: 'Fórmulas', subject: null }, cards: [
      { id: 'C1', deck_id: 'D9', position: 0, front: 'F = ?', back: 'm·a', review_status: 'approved' },
      { id: 'C2', deck_id: 'D9', position: 1, front: 'v = ?', back: 'x', review_status: 'rejected', review_note: 'Resposta errada' },
    ] });
    render(<StudentFlashcards />);
    expect(await screen.findByText(/Da turma/)).toBeInTheDocument();
    expect(screen.getByText('1 aguardando aprovação')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Editar Fórmulas' }));
    expect(await screen.findByText('Aprovado: sua turma vê')).toBeInTheDocument();
    expect(screen.getByText('Recusado: Resposta errada')).toBeInTheDocument();
    expect(screen.getByText(/ficam só com você até a coordenação aprovar/)).toBeInTheDocument();
  });
});
