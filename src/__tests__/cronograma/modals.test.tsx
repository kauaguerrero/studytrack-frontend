// CT-S / CT-T / CT-Q / CT-R / CT-A: assistente de criação, modais e chat do agente.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';

const { fetchMock, toast } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), warning: vi.fn() }),
}));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/lib/cronograma', async (orig) => ({ ...(await orig<typeof import('@/lib/cronograma')>()), cronogramaFetch: fetchMock }));
vi.mock('@/components/questions/QuestionRichText', () => ({ QuestionRichText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('@/components/partners/founder-ui', () => ({
  ElevatedCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { SetupWizard } from '@/components/cronograma/SetupWizard';
import { StartStudyModal, type StartTarget } from '@/components/cronograma/StartStudyModal';
import { ReviewQuizModal } from '@/components/cronograma/ReviewQuizModal';
import { ReviewListModal } from '@/components/cronograma/ReviewListModal';
import { AgentChat } from '@/components/cronograma/AgentChat';
import type { QuizResponse, ReviewResult } from '@/lib/cronograma';
import { TODAY, item, proposal } from './fixtures';

beforeEach(() => {
  fetchMock.mockReset();
  toast.mockReset(); toast.success.mockReset(); toast.error.mockReset();
});

function deferred<T>() {
  let resolve!: (v: T) => void; let reject!: (e: unknown) => void;
  const promise = new Promise<T>((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}

// ─── SetupWizard ─────────────────────────────────────────────────────────────
describe('SetupWizard', () => {
  const defaults = { exam_date: '2027-11-07', days_per_week: 5, hours_per_day: 2 };
  const next = () => fireEvent.click(screen.getByRole('button', { name: /Continuar/ }));
  const slider = (label: string) => screen.getByLabelText(`Minutos de estudo na ${label}`) as HTMLInputElement;

  it('CT-S01 começa no passo 1 com a data padrão', () => {
    render(<SetupWizard defaults={defaults} onCreated={vi.fn()} />);
    expect(screen.getByText('Passo 1 de 3')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2027-11-07')).toBeInTheDocument();
  });
  it('CT-S02 capacidade inicial vem do perfil (5 dias × 2h)', () => {
    render(<SetupWizard defaults={defaults} onCreated={vi.fn()} />);
    next();
    expect(slider('Segunda').value).toBe('120');
    expect(slider('Sexta').value).toBe('120');
    expect(slider('Sábado').value).toBe('0');
    expect(screen.getByText('10h por semana')).toBeInTheDocument();
  });
  it('CT-S03 perfil com horas acima do slider é limitado ao máximo do slider (6h)', () => {
    render(<SetupWizard defaults={{ ...defaults, hours_per_day: 12 }} onCreated={vi.fn()} />);
    next();
    expect(slider('Segunda').value).toBe('360');
    expect(screen.getByText('30h por semana')).toBeInTheDocument();
  });
  it('CT-S04 rótulo de horas: folga, 1h, 1h30', () => {
    render(<SetupWizard defaults={defaults} onCreated={vi.fn()} />);
    next();
    fireEvent.change(slider('Segunda'), { target: { value: '90' } });
    fireEvent.change(slider('Terça'), { target: { value: '60' } });
    expect(screen.getByText('1h30')).toBeInTheDocument();
    expect(screen.getByText('1h')).toBeInTheDocument();
    expect(screen.getAllByText('folga')).toHaveLength(2);
  });
  it('CT-S05 menos de 1h por semana bloqueia o Continuar', () => {
    render(<SetupWizard defaults={{ ...defaults, days_per_week: 1, hours_per_day: 1 }} onCreated={vi.fn()} />);
    next();
    fireEvent.change(slider('Segunda'), { target: { value: '45' } });
    expect(screen.getByRole('button', { name: /Continuar/ })).toBeDisabled();
  });
  it('CT-S06 data apagada bloqueia o Continuar do passo 1', () => {
    render(<SetupWizard defaults={defaults} onCreated={vi.fn()} />);
    fireEvent.change(screen.getByDisplayValue('2027-11-07'), { target: { value: '' } });
    expect(screen.getByRole('button', { name: /Continuar/ })).toBeDisabled();
  });
  it('CT-S07 voltar preserva o que foi escolhido', () => {
    render(<SetupWizard defaults={defaults} onCreated={vi.fn()} />);
    next();
    fireEvent.change(slider('Domingo'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: /Voltar/ }));
    next();
    expect(slider('Domingo').value).toBe('30');
  });
  it('CT-S08 payload do setup: capacidade por dia e autoavaliação 0..1', async () => {
    fetchMock.mockResolvedValue({});
    const onCreated = vi.fn();
    render(<SetupWizard defaults={defaults} onCreated={onCreated} />);
    next(); next();
    fireEvent.change(screen.getByLabelText('Confiança em Matemática'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Confiança em Humanas'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: /Montar meu cronograma/ }));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe('/setup');
    const body = JSON.parse(init.body);
    expect(body.exam_date).toBe('2027-11-07');
    expect(body.capacity).toEqual({ 0: 120, 1: 120, 2: 120, 3: 120, 4: 120, 5: 0, 6: 0 });
    expect(body.self_assessment).toEqual({ matematica: 0, natureza: 0.5, humanas: 1, linguagens: 0.5 });
  });
  it('CT-S09 erro do backend mostra toast e não chama onCreated', async () => {
    fetchMock.mockRejectedValue(new Error('A prova precisa estar a pelo menos 14 dias.'));
    const onCreated = vi.fn();
    render(<SetupWizard defaults={defaults} onCreated={onCreated} />);
    next(); next();
    fireEvent.click(screen.getByRole('button', { name: /Montar meu cronograma/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('A prova precisa estar a pelo menos 14 dias.'));
    expect(onCreated).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Montar meu cronograma/ })).not.toBeDisabled();
  });
  it('CT-S10 clique duplo cria um plano só', async () => {
    const d = deferred<unknown>();
    fetchMock.mockReturnValue(d.promise);
    render(<SetupWizard defaults={defaults} onCreated={vi.fn()} />);
    next(); next();
    const b = screen.getByRole('button', { name: /Montar meu cronograma/ });
    fireEvent.click(b); fireEvent.click(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => { d.resolve({}); });
  });
});

// ─── StartStudyModal ─────────────────────────────────────────────────────────
describe('StartStudyModal', () => {
  const study = (over: Partial<StartTarget> = {}): StartTarget => ({ ...item({ topic: 'Funções afins' }), ...over });
  const open = (target: StartTarget | null, p: Partial<React.ComponentProps<typeof StartStudyModal>> = {}) => {
    const h = { onClose: vi.fn(), onComplete: vi.fn(), onSkip: vi.fn(), onStartReview: vi.fn() };
    render(<StartStudyModal slug="cenas" target={target} {...h} {...p} />);
    return h;
  };

  it('CT-T01 fechado não renderiza nada', () => {
    open(null);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('CT-T02 estudo mostra banco e simulado com filtros', () => {
    open(study());
    expect(screen.getByRole('link', { name: /Banco de questões/ })).toHaveAttribute('href', expect.stringContaining('/partners/cenas/student/banco-de-questoes?subject='));
    expect(screen.getByRole('link', { name: /Simulado/ })).toHaveAttribute('href', expect.stringContaining('cronograma=1'));
  });
  it('CT-T02b banco leva o id do card (plan_item) para a barra de progresso', () => {
    open(study({ id: 'abc' }));
    expect(screen.getByRole('link', { name: /Banco de questões/ })).toHaveAttribute('href', expect.stringContaining('plan_item=abc'));
  });
  it('CT-T03 cabeçalho: tipo, minutos e data', () => {
    open(study({ minutes: 60 }));
    expect(screen.getByText('Estudo · 60 min · 11/11')).toBeInTheDocument();
  });
  it('CT-T04 descrição usa matéria · disciplina, ou o subject do nó', () => {
    open(study({ q_discipline: null, subject: 'Funções' }));
    expect(screen.getByText('Funções')).toBeInTheDocument();
  });
  it('CT-T05 "Já estudei" e "Pular hoje" chamam com o id', () => {
    const t = study();
    const h = open(t);
    fireEvent.click(screen.getByRole('button', { name: /Já estudei/ }));
    fireEvent.click(screen.getByRole('button', { name: /Pular hoje/ }));
    expect(h.onComplete).toHaveBeenCalledWith(t.id);
    expect(h.onSkip).toHaveBeenCalledWith(t.id);
  });
  it('CT-T06 ocupado desabilita as ações', () => {
    open(study(), { busy: true });
    expect(screen.getByRole('button', { name: /Já estudei/ })).toBeDisabled();
  });
  it('CT-T07 sem onSkip/onComplete (dashboard) não mostra os botões', () => {
    render(<StartStudyModal slug="cenas" target={study()} onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Pular hoje/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Já estudei/ })).toBeNull();
  });
  it('CT-T08 revisão oferece o mini-quiz e não o banco', () => {
    const t = study({ kind: 'review', minutes: 15 });
    const h = open(t);
    expect(screen.queryByRole('link', { name: /Banco/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Fazer a revisão/ }));
    expect(h.onStartReview).toHaveBeenCalledWith(t);
  });
  it('CT-T09 concluído mostra "Concluído" sem ações', () => {
    open(study({ status: 'done' }));
    expect(screen.getByText(/Concluído/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Já estudei/ })).toBeNull();
  });
  it('CT-T10 revisão prevista explica que ainda não vale', () => {
    open(study({ kind: 'review', projected: true }));
    expect(screen.getByText(/Revisão prevista/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Fazer a revisão/ })).toBeNull();
  });
  it('CT-T11 aviso de pré-requisito', () => {
    open(study({ depends_on_late: ['Frações', 'Razão'] }));
    expect(screen.getByText('Frações, Razão')).toBeInTheDocument();
  });
});

// ─── ReviewQuizModal ─────────────────────────────────────────────────────────
const q = (id: string) => ({
  id, title: null, context: `Enunciado ${id}`, alternatives_intro: null, images: null, exam_year: 2023, bank: 'ENEM',
  alternatives: ['A', 'B', 'C', 'D', 'E'].map((letter) => ({ letter, text: `Alt ${letter} de ${id}` })),
});
const quiz = (over: Partial<QuizResponse> = {}): QuizResponse => ({
  ...item({ topic: 'Logaritmos' }), item_id: 'r1', basis: 'node', questions: [q('q1'), q('q2'), q('q3')], ...over,
});
const result = (over: Partial<ReviewResult> = {}): ReviewResult => ({
  grade: 'good', grade_source: 'quiz', accuracy: 2 / 3, next_due_on: '2026-11-14', interval_days: 3,
  results: [
    { question_id: 'q1', is_correct: true, correct_option: 'A' },
    { question_id: 'q2', is_correct: false, correct_option: 'C' },
    { question_id: 'q3', is_correct: true, correct_option: 'A' },
  ], ...over,
});

describe('ReviewQuizModal', () => {
  const answerAll = () => {
    for (const id of ['q1', 'q2', 'q3']) {
      fireEvent.click(screen.getByText(`Alt A de ${id}`));
      const nextBtn = screen.queryByRole('button', { name: 'Próxima' });
      if (nextBtn) fireEvent.click(nextBtn);
    }
  };

  it('CT-Q01 abre e busca o quiz do item', async () => {
    fetchMock.mockResolvedValue(quiz());
    render(<ReviewQuizModal itemId="r1" onClose={vi.fn()} onDone={vi.fn()} />);
    expect(await screen.findByText('Enunciado q1')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/items/r1/quiz');
    expect(screen.getByText('Revisão: Logaritmos')).toBeInTheDocument();
  });
  it('CT-Q02 erro ao buscar fecha com toast', async () => {
    fetchMock.mockRejectedValue(new Error('Item não encontrado'));
    const onClose = vi.fn();
    render(<ReviewQuizModal itemId="r1" onClose={onClose} onDone={vi.fn()} />);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith('Item não encontrado');
  });
  it.each([
    ['node', 'Questões deste conteúdo.'],
    ['mixed', 'Questões deste conteúdo, completadas com outras de Funções.'],
    ['discipline', 'Questões de Funções, baseadas na disciplina.'],
  ] as const)('CT-Q03 texto da base %s', async (basis, text) => {
    fetchMock.mockResolvedValue(quiz({ basis }));
    render(<ReviewQuizModal itemId="r1" onClose={vi.fn()} onDone={vi.fn()} />);
    expect(await screen.findByText(text)).toBeInTheDocument();
  });
  it('CT-Q04 "Próxima" só libera depois de responder', async () => {
    fetchMock.mockResolvedValue(quiz());
    render(<ReviewQuizModal itemId="r1" onClose={vi.fn()} onDone={vi.fn()} />);
    await screen.findByText('Enunciado q1');
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
    fireEvent.click(screen.getByText('Alt B de q1'));
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeEnabled();
  });
  it('CT-Q05 pular pela barra não libera concluir sem todas respondidas', async () => {
    fetchMock.mockResolvedValue(quiz());
    render(<ReviewQuizModal itemId="r1" onClose={vi.fn()} onDone={vi.fn()} />);
    await screen.findByText('Enunciado q1');
    fireEvent.click(screen.getByLabelText('Questão 3'));
    fireEvent.click(screen.getByText('Alt A de q3'));
    expect(screen.getByRole('button', { name: /Concluir revisão/ })).toBeDisabled();
  });
  it('CT-Q06 envia as respostas e mostra o resultado', async () => {
    fetchMock.mockResolvedValueOnce(quiz()).mockResolvedValueOnce(result());
    const onDone = vi.fn();
    render(<ReviewQuizModal itemId="r1" onClose={vi.fn()} onDone={onDone} />);
    await screen.findByText('Enunciado q1');
    answerAll();
    fireEvent.click(screen.getByRole('button', { name: /Concluir revisão/ }));
    expect(await screen.findByText('Bom')).toBeInTheDocument();
    const [path, init] = fetchMock.mock.calls[1];
    expect(path).toBe('/items/r1/review');
    expect(JSON.parse(init.body)).toEqual({ answers: { q1: 'A', q2: 'A', q3: 'A' } });
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ grade: 'good' }));
    expect(screen.getByText('67% de acerto')).toBeInTheDocument();
    expect(screen.getByText(/Questão 2: você marcou A, gabarito C/)).toBeInTheDocument();
  });
  it('CT-Q07 próxima revisão em 1 dia (singular)', async () => {
    fetchMock.mockResolvedValueOnce(quiz({ questions: [] })).mockResolvedValueOnce(result({ interval_days: 1, accuracy: null, results: [], next_due_on: '2026-11-12' }));
    render(<ReviewQuizModal itemId="r1" onClose={vi.fn()} onDone={vi.fn()} />);
    fireEvent.click(await screen.findByText('Não lembrei'));
    expect(await screen.findByText('1 dia')).toBeInTheDocument();
  });
  it('CT-Q08 sem próxima revisão (reta final) mostra consolidado', async () => {
    fetchMock.mockResolvedValueOnce(quiz({ questions: [] })).mockResolvedValueOnce(result({ next_due_on: null, results: [] }));
    render(<ReviewQuizModal itemId="r1" onClose={vi.fn()} onDone={vi.fn()} />);
    fireEvent.click(await screen.findByText('Lembrei bem'));
    expect(await screen.findByText(/Conteúdo consolidado/)).toBeInTheDocument();
  });
  it('CT-Q09 autoavaliação não oferece "Fácil" e envia self_grade', async () => {
    fetchMock.mockResolvedValueOnce(quiz({ questions: [], basis: 'self' })).mockResolvedValueOnce(result({ results: [] }));
    render(<ReviewQuizModal itemId="r1" onClose={vi.fn()} onDone={vi.fn()} />);
    fireEvent.click(await screen.findByText('Lembrei com esforço'));
    expect(screen.queryByText(/Fácil/)).toBeNull();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ self_grade: 'hard' });
  });
  it('CT-Q10 erro ao enviar mantém as respostas e permite tentar de novo', async () => {
    fetchMock.mockResolvedValueOnce(quiz()).mockRejectedValueOnce(new Error('Sem conexão'));
    render(<ReviewQuizModal itemId="r1" onClose={vi.fn()} onDone={vi.fn()} />);
    await screen.findByText('Enunciado q1');
    answerAll();
    fireEvent.click(screen.getByRole('button', { name: /Concluir revisão/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Sem conexão'));
    expect(screen.getByRole('button', { name: /Concluir revisão/ })).toBeEnabled();
  });
  it('CT-Q11 trocar de revisão no meio do carregamento não mostra o quiz antigo', async () => {
    const a = deferred<QuizResponse>(); const b = deferred<QuizResponse>();
    fetchMock.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    const { rerender } = render(<ReviewQuizModal itemId="rA" onClose={vi.fn()} onDone={vi.fn()} />);
    rerender(<ReviewQuizModal itemId="rB" onClose={vi.fn()} onDone={vi.fn()} />);
    await act(async () => { b.resolve(quiz({ topic: 'Tópico B', item_id: 'rB' })); });
    await act(async () => { a.resolve(quiz({ topic: 'Tópico A', item_id: 'rA' })); });
    expect(screen.getByText('Revisão: Tópico B')).toBeInTheDocument();
    expect(screen.queryByText('Revisão: Tópico A')).toBeNull();
  });
  it('CT-Q12 reabrir outra revisão zera respostas e resultado', async () => {
    fetchMock.mockResolvedValueOnce(quiz()).mockResolvedValueOnce(result()).mockResolvedValueOnce(quiz({ topic: 'Outra' }));
    const { rerender } = render(<ReviewQuizModal itemId="r1" onClose={vi.fn()} onDone={vi.fn()} />);
    await screen.findByText('Enunciado q1');
    answerAll();
    fireEvent.click(screen.getByRole('button', { name: /Concluir revisão/ }));
    await screen.findByText('Bom');
    rerender(<ReviewQuizModal itemId="r2" onClose={vi.fn()} onDone={vi.fn()} />);
    expect(await screen.findByText('Revisão: Outra')).toBeInTheDocument();
    expect(screen.queryByText('Bom')).toBeNull();
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  });
});

// ─── ReviewListModal ────────────────────────────────────────────────────────
describe('ReviewListModal', () => {
  it('CT-R01 lista tópicos e só deixa iniciar os pendentes reais', () => {
    const pend = item({ kind: 'review', topic: 'Pendente' });
    const group = {
      key: 'k', date: TODAY, area: 'matematica' as const, area_label: 'Matemática', minutes: 45,
      items: [pend, item({ kind: 'review', topic: 'Feita', status: 'done' }), item({ kind: 'review', topic: 'Prevista', projected: true })],
    };
    const onStart = vi.fn();
    render(<ReviewListModal group={group} onClose={vi.fn()} onStart={onStart} />);
    expect(screen.getByText('Revisão · Matemática · 11/11')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Feita/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Prevista/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Pendente/ }));
    expect(onStart).toHaveBeenCalledWith(pend);
  });
});

// ─── AgentChat ──────────────────────────────────────────────────────────────
describe('AgentChat', () => {
  const chat = (p: Partial<React.ComponentProps<typeof AgentChat>> = {}) => {
    const h = { onSend: vi.fn(), onChip: vi.fn(), onConfirm: vi.fn(), onDiscard: vi.fn(), onUndo: vi.fn() };
    const r = render(<AgentChat today={TODAY} proposal={null} busy={false} canUndo={false} {...h} {...p} />);
    const again = (q: Partial<React.ComponentProps<typeof AgentChat>>) =>
      r.rerender(<AgentChat today={TODAY} proposal={null} busy={false} canUndo={false} {...h} {...p} {...q} />);
    return { ...h, ...r, again };
  };
  const box = () => screen.getByLabelText('Mensagem para o assistente do cronograma');

  it('CT-A01 Enter envia o texto aparado e limpa', () => {
    const h = chat();
    fireEvent.change(box(), { target: { value: '  folga sexta  ' } });
    fireEvent.keyDown(box(), { key: 'Enter' });
    expect(h.onSend).toHaveBeenCalledWith('folga sexta');
    expect(box()).toHaveValue('');
  });
  it('CT-A02 Shift+Enter não envia', () => {
    const h = chat();
    fireEvent.change(box(), { target: { value: 'oi' } });
    fireEvent.keyDown(box(), { key: 'Enter', shiftKey: true });
    expect(h.onSend).not.toHaveBeenCalled();
  });
  it('CT-A03 só espaços não envia e o botão fica desabilitado', () => {
    const h = chat();
    fireEvent.change(box(), { target: { value: '   ' } });
    fireEvent.keyDown(box(), { key: 'Enter' });
    expect(h.onSend).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
  });
  it('CT-A04 mensagem limitada a 300 caracteres (mesmo teto do backend)', () => {
    chat();
    fireEvent.change(box(), { target: { value: 'x'.repeat(800) } });
    expect((box() as HTMLTextAreaElement).value).toHaveLength(300);
  });
  it('CT-A05 ocupado não envia por Enter', () => {
    const h = chat({ busy: true });
    fireEvent.change(box(), { target: { value: 'oi' } });
    fireEvent.keyDown(box(), { key: 'Enter' });
    expect(h.onSend).not.toHaveBeenCalled();
  });
  it('CT-A06 chips diretos', () => {
    const h = chat();
    fireEvent.click(screen.getByText('Folga amanhã'));
    fireEvent.click(screen.getByText('Semana leve'));
    expect(h.onChip.mock.calls).toEqual([[{ chip: 'skip_tomorrow' }], [{ chip: 'lighter_week' }]]);
  });
  it('CT-A07 "Focar em uma área" abre as áreas e envia a escolhida', () => {
    const h = chat();
    fireEvent.click(screen.getByText('Focar numa área'));
    fireEvent.click(screen.getByRole('button', { name: 'Natureza' }));
    expect(h.onChip).toHaveBeenCalledWith({ chip: 'more_subject', payload: { subject: 'natureza' } });
    expect(screen.queryByRole('button', { name: 'Natureza' })).toBeNull();
  });
  it('CT-A08 "Revisar uma área" usa o chip review_mistakes', () => {
    const h = chat();
    fireEvent.click(screen.getByText('Revisar área'));
    fireEvent.click(screen.getByRole('button', { name: 'Humanas' }));
    expect(h.onChip).toHaveBeenCalledWith({ chip: 'review_mistakes', payload: { subject: 'humanas' } });
  });
  it('CT-A09 clicar de novo no chip fecha o seletor', () => {
    chat();
    fireEvent.click(screen.getByText('Focar numa área'));
    fireEvent.click(screen.getByText('Focar numa área'));
    expect(screen.queryByRole('button', { name: 'Natureza' })).toBeNull();
  });
  it('CT-A10 "Tenho prova" sugere hoje+3 e envia a data', () => {
    const h = chat();
    fireEvent.click(screen.getByText('Prova na escola'));
    expect(screen.getByLabelText('Dia da prova:')).toHaveValue('2026-11-14');
    fireEvent.change(screen.getByLabelText('Dia da prova:'), { target: { value: '2026-11-20' } });
    fireEvent.click(screen.getByText('Liberar o dia'));
    expect(h.onChip).toHaveBeenCalledWith({ chip: 'exam_day', payload: { date: '2026-11-20' } });
  });
  it('CT-A11 data sugerida acompanha o "hoje" real do backend', () => {
    const r = chat({ today: '2026-11-05' });
    r.rerender(<AgentChat today={TODAY} proposal={null} busy={false} canUndo={false}
      onSend={r.onSend} onChip={r.onChip} onConfirm={r.onConfirm} onDiscard={r.onDiscard} onUndo={r.onUndo} />);
    fireEvent.click(screen.getByText('Prova na escola'));
    expect(screen.getByLabelText('Dia da prova:')).toHaveValue('2026-11-14');
  });
  it('CT-A12 prévia lista movidos, adicionados e removidos', () => {
    chat({ proposal: proposal({ diff: {
      moved: [{ id: 'a', node_id: 'n', kind: 'study', topic: 'Logaritmos', from: '2026-11-12', to: '2026-11-13' }],
      added: [{ node_id: 'n2', kind: 'review', topic: 'Citologia', to: '2026-11-12' }],
      removed: [{ id: 'c', node_id: 'n3', kind: 'study', topic: 'Barroco', from: '2026-11-12' }],
    } }) });
    expect(screen.getByText('Logaritmos')).toBeInTheDocument();
    expect(screen.getByText('Citologia')).toBeInTheDocument();
    expect(screen.getByText('sai de 12/11')).toBeInTheDocument();
    expect(screen.getByText('Tirei a quinta.')).toBeInTheDocument();
  });
  it('CT-A13 "e mais N" conta exatamente o que ficou escondido', () => {
    const moved = Array.from({ length: 20 }, (_, k) => ({ id: `m${k}`, node_id: `n${k}`, kind: 'study' as const, topic: `T${k}`, from: '2026-11-12', to: '2026-11-13' }));
    chat({ proposal: proposal({ diff: { moved, added: [], removed: [] } }) });
    expect(screen.getByText('e mais 12 ajustes…')).toBeInTheDocument();
  });
  it('CT-A14 prévia sem itens explica que é ajuste de configuração', () => {
    chat({ proposal: proposal() });
    expect(screen.getByText(/Ajuste nas configurações/)).toBeInTheDocument();
  });
  it('CT-A15 confirmar e descartar', () => {
    const h = chat({ proposal: proposal() });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar/ }));
    fireEvent.click(screen.getByRole('button', { name: /Descartar/ }));
    expect(h.onConfirm).toHaveBeenCalled();
    expect(h.onDiscard).toHaveBeenCalled();
  });
  it('CT-A16 avisos da prévia aparecem', () => {
    chat({ proposal: proposal({ warnings: [{ code: 'review_far_from_due', message: 'Atrasar a revisão reduz a retenção.' }] }) });
    expect(screen.getByText('Atrasar a revisão reduz a retenção.')).toBeInTheDocument();
  });
  it('CT-A17 com prévia aberta, o campo trava e os atalhos dão lugar a Confirmar/Descartar', () => {
    chat({ proposal: proposal() });
    expect(box()).toBeDisabled();
    expect(screen.queryByText('Semana leve')).toBeNull();
    expect(screen.getByRole('button', { name: /Confirmar/ })).toBeInTheDocument();
  });
  it('CT-A31 conversa: mensagem do aluno aparece e a resposta fechada fica no histórico', () => {
    const h = chat();
    fireEvent.change(box(), { target: { value: 'quinta tenho consulta' } });
    fireEvent.keyDown(box(), { key: 'Enter' });
    const log = screen.getByRole('log', { name: 'Conversa com o assistente' });
    expect(within(log).getByText('quinta tenho consulta')).toBeInTheDocument();
    h.again({ proposal: proposal({ reply: 'Tirei tudo da quinta.' }) });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar/ }));
    h.again({ proposal: null });
    expect(within(log).getByText('Tirei tudo da quinta.')).toBeInTheDocument();
    expect(within(log).getByText(/Você confirmou/)).toBeInTheDocument();
  });
  it('CT-A34 tela maior abre a MESMA conversa num modal e volta sem perder nada', () => {
    const h = chat();
    fireEvent.change(box(), { target: { value: 'sexta tô ocupado' } });
    fireEvent.keyDown(box(), { key: 'Enter' });
    fireEvent.change(box(), { target: { value: 'rascunho' } });
    fireEvent.click(screen.getByRole('button', { name: 'Abrir o chat em tela maior' }));
    const dlg = screen.getByRole('dialog', { name: 'Assistente do cronograma' });
    expect(within(dlg).getByText('sexta tô ocupado')).toBeInTheDocument();
    expect((within(dlg).getByLabelText('Mensagem para o assistente do cronograma') as HTMLTextAreaElement).value).toBe('rascunho');
    expect(screen.getByText('Conversa aberta em tela maior')).toBeInTheDocument();
    fireEvent.click(within(dlg).getByRole('button', { name: 'Voltar o chat ao tamanho normal' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(within(screen.getByRole('log')).getByText('sexta tô ocupado')).toBeInTheDocument();
    expect(h.onSend).toHaveBeenCalledTimes(1);
  });
  it('CT-A33 cada mensagem mostra o horário (hh:mm) ao lado', () => {
    chat();
    fireEvent.change(box(), { target: { value: 'oi' } });
    fireEvent.keyDown(box(), { key: 'Enter' });
    const times = within(screen.getByRole('log')).getAllByText(/^\d{2}:\d{2}$/);
    expect(times.length).toBe(2); // saudação + mensagem do aluno
  });
  it('CT-A32 atalho também vira mensagem do aluno na conversa', () => {
    chat();
    fireEvent.click(screen.getByText('Semana leve'));
    expect(within(screen.getByRole('log')).getByText('Semana leve')).toBeInTheDocument();
  });
  it('CT-A18 pedido que falhou vira mensagem comum: sem botão e com o chat liberado', () => {
    chat({ proposal: proposal({ status: 'failed', reply: '' }) });
    expect(within(screen.getByRole('log')).getByText('Não consegui aplicar esse pedido.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirmar/ })).toBeNull();
    expect(screen.queryByText('Fechar')).toBeNull();
    expect(screen.getByText('Semana leve')).toBeInTheDocument();
    expect(box()).not.toBeDisabled();
  });
  it('CT-A19 "Desfazer última" só aparece quando dá e sem prévia', () => {
    const r = chat({ canUndo: true });
    fireEvent.click(screen.getByText('Desfazer última'));
    expect(r.onUndo).toHaveBeenCalled();
    r.rerender(<AgentChat today={TODAY} proposal={proposal()} busy={false} canUndo
      onSend={r.onSend} onChip={r.onChip} onConfirm={r.onConfirm} onDiscard={r.onDiscard} onUndo={r.onUndo} />);
    expect(screen.queryByText('Desfazer última')).toBeNull();
  });
  it('CT-A20 movidos sem id não geram chaves duplicadas no React', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    chat({ proposal: proposal({ diff: {
      moved: [{ node_id: 'a', kind: 'study', topic: 'X', from: TODAY, to: TODAY }, { node_id: 'b', kind: 'study', topic: 'Y', from: TODAY, to: TODAY }],
      added: [], removed: [],
    } }) });
    expect(err.mock.calls.some((c) => String(c[0]).includes('same key'))).toBe(false);
    err.mockRestore();
  });

  it('CT-A21 pergunta sim/não: some o chat e os chips, aparecem Sim (verde) e Não (vermelho)', () => {
    const h = chat({ proposal: proposal({ question: 'Quer isso em todo sábado?' }) });
    expect(screen.getByText('Quer isso em todo sábado?')).toBeInTheDocument();
    expect(screen.queryByLabelText('Mensagem para o assistente do cronograma')).toBeNull();
    expect(screen.queryByText('Semana leve')).toBeNull();
    expect(screen.queryByRole('button', { name: /Confirmar/ })).toBeNull();
    const sim = screen.getByRole('button', { name: 'Sim' });
    const nao = screen.getByRole('button', { name: 'Não' });
    expect(sim.className).toMatch(/emerald/);
    expect(nao.className).toMatch(/red/);
    fireEvent.click(sim);
    expect(h.onConfirm).toHaveBeenCalled();
    fireEvent.click(nao);
    expect(h.onDiscard).toHaveBeenCalled();
  });
  it('CT-A22 sem pergunta continua Confirmar/Descartar e o chat volta depois', () => {
    const r = chat({ proposal: proposal({ question: null }) });
    expect(screen.getByRole('button', { name: /Confirmar/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sim' })).toBeNull();
    r.rerender(<AgentChat today={TODAY} proposal={null} busy={false} canUndo={false}
      onSend={r.onSend} onChip={r.onChip} onConfirm={r.onConfirm} onDiscard={r.onDiscard} onUndo={r.onUndo} />);
    expect(screen.getByLabelText('Mensagem para o assistente do cronograma')).toBeEnabled();
  });
  it('CT-A23 pedido que falhou nunca mostra Sim/Não', () => {
    chat({ proposal: proposal({ status: 'failed', question: 'Quer?' }) });
    expect(screen.queryByRole('button', { name: 'Sim' })).toBeNull();
  });

  const sat = (minutes: number) => ({
    index: 0, op: 'set_day_capacity' as const, label: 'sábado 14/11', minutes, routine_minutes: 0, date: '2026-11-14',
  });
  const editing = (minutes: number, extra: Partial<Parameters<typeof proposal>[0]> = {}) => {
    const onAdjust = vi.fn();
    const r = chat({ onAdjust, proposal: proposal({ editable: [sat(minutes)], routine_max_minutes: 120, ...extra }) });
    return { ...r, onAdjust };
  };

  it('CT-A24 tempo da prévia aparece com −/+ e ajusta 15 min sem passar pela IA', () => {
    const h = editing(90);
    const g = screen.getByRole('group', { name: 'Tempo de sábado 14/11' });
    expect(g).toHaveTextContent('1h30');
    fireEvent.click(screen.getByRole('button', { name: 'Mais 15 minutos' }));
    expect(h.onAdjust).toHaveBeenCalledWith(0, 105);
    fireEvent.click(screen.getByRole('button', { name: 'Menos 15 minutos' }));
    expect(h.onAdjust).toHaveBeenCalledWith(0, 75);
    expect(h.onSend).not.toHaveBeenCalled();
  });
  it('CT-A25 passar da rotina pergunta antes ("Opa!"), não proíbe', () => {
    const h = editing(120);
    fireEvent.click(screen.getByRole('button', { name: 'Mais 15 minutos' }));
    expect(h.onAdjust).not.toHaveBeenCalled();
    const dlg = screen.getByRole('alertdialog', { name: 'Carga acima da rotina' });
    expect(dlg).toHaveTextContent('Opa!');
    expect(dlg).toHaveTextContent('2h15');
    expect(dlg).toHaveTextContent('(2h)');
    // enquanto pergunta, não dá pra confirmar a prévia antiga
    expect(screen.queryByRole('button', { name: /Confirmar/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Manter 2h15' }));
    expect(h.onAdjust).toHaveBeenCalledWith(0, 135);
  });
  it('CT-A26 "Deixar como estava" fecha o aviso sem ajustar', () => {
    const h = editing(120);
    fireEvent.click(screen.getByRole('button', { name: 'Mais 15 minutos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Deixar como estava' }));
    expect(h.onAdjust).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('button', { name: /Confirmar/ })).toBeInTheDocument();
  });
  it('CT-A27 já acima da rotina: não pergunta de novo a cada +15', () => {
    const h = editing(150);
    fireEvent.click(screen.getByRole('button', { name: 'Mais 15 minutos' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(h.onAdjust).toHaveBeenCalledWith(0, 165);
  });
  it('CT-A28 diminuir nunca pergunta; mínimo de 15 min desabilita o −', () => {
    editing(15);
    expect(screen.getByRole('button', { name: 'Menos 15 minutos' })).toBeDisabled();
  });
  it('CT-A29 aviso aparece mesmo com pergunta sim/não e esconde Sim/Não', () => {
    editing(120, { question: 'Coloco 2h no sábado?' });
    expect(screen.getByRole('button', { name: 'Sim' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mais 15 minutos' }));
    expect(screen.queryByRole('button', { name: 'Sim' })).toBeNull();
  });
  it('CT-A30 sem onAdjust ou em pedido que falhou não há editor', () => {
    chat({ proposal: proposal({ editable: [sat(60)], routine_max_minutes: 120 }) });
    expect(screen.queryByRole('group', { name: /Tempo de/ })).toBeNull();
  });
});
