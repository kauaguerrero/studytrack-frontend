// CT-C: turma no cronograma (fase 4) — aulas roxas, faltas, registro manual,
// revisão da semana, data da turma no assistente de criação e flag do agente.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';

const { fetchMock, toast } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), warning: vi.fn() }),
}));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/lib/cronograma', async (orig) => ({ ...(await orig<typeof import('@/lib/cronograma')>()), cronogramaFetch: fetchMock }));
vi.mock('@/components/partners/founder-ui', () => ({
  ElevatedCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { WeekBoard } from '@/components/cronograma/WeekBoard';
import { AttendanceModal } from '@/components/cronograma/AttendanceModal';
import { StudyLogModal } from '@/components/cronograma/StudyLogModal';
import { SetupWizard } from '@/components/cronograma/SetupWizard';
import { AgentChat } from '@/components/cronograma/AgentChat';
import { addDays, type ClassOccurrence } from '@/lib/cronograma';
import { TODAY, week } from './fixtures';

beforeEach(() => { fetchMock.mockReset(); toast.success.mockReset(); });

function occ(over: Partial<ClassOccurrence> = {}): ClassOccurrence {
  return {
    key: `s1:${TODAY}`, date: TODAY, starts_at: '19:00:00', ends_at: '20:40:00', minutes: 100,
    subject: 'Matemática', title: null, plurall_url: null, slot_id: 's1', exception_id: null, changed: false,
    attendance: null, ...over,
  };
}

describe('Aulas no quadro', () => {
  it('CT-C01 aula aparece no dia com horário e abre a falta', () => {
    const onOpenClass = vi.fn();
    const days = week().map((d) => (d.date === TODAY ? { ...d, classes: [occ()] } : d));
    render(<WeekBoard days={days} items={[]} today={TODAY} onMove={vi.fn()} onOpenItem={vi.fn()} onOpenReviews={vi.fn()}
      onOpenClass={onOpenClass} />);
    const col = screen.getByRole('region', { name: 'QUA 11/11' });
    const card = within(col).getByRole('button', { name: /Aula de Matemática, 19:00–20:40/ });
    fireEvent.click(card);
    expect(onOpenClass).toHaveBeenCalledWith(expect.objectContaining({ key: `s1:${TODAY}` }));
  });
  it('CT-C02 falta marcada aparece no card', () => {
    const days = week().map((d) => (d.date === TODAY
      ? { ...d, classes: [occ({ attendance: { status: 'vai_faltar', will_study: true, studied_instead: null, makeup_item_id: null } })] } : d));
    render(<WeekBoard days={days} items={[]} today={TODAY} onMove={vi.fn()} onOpenItem={vi.fn()} onOpenReviews={vi.fn()} />);
    expect(screen.getByText(/Vou faltar · vou estudar/)).toBeInTheDocument();
  });
  it('CT-C03 dia de revisão mostra a revisão da semana', () => {
    const onWeeklyReview = vi.fn();
    const days = week().map((d) => (d.date === addDays(TODAY, 1) ? { ...d, review_only: true } : d));
    render(<WeekBoard days={days} items={[]} today={TODAY} onMove={vi.fn()} onOpenItem={vi.fn()} onOpenReviews={vi.fn()}
      onWeeklyReview={onWeeklyReview} />);
    fireEvent.click(screen.getByRole('button', { name: /Revisão da semana/ }));
    expect(onWeeklyReview).toHaveBeenCalledWith(addDays(TODAY, 1));
  });
});

describe('Falta', () => {
  it('CT-C04 aula futura: vou faltar + vou estudar', () => {
    const onSave = vi.fn();
    render(<AttendanceModal occ={occ({ date: addDays(TODAY, 2), key: 'k2' })} today={TODAY} onClose={vi.fn()} onSave={onSave} />);
    const confirm = screen.getByRole('button', { name: 'Confirmar falta' });
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Sim' }));
    expect(screen.getByText(/ganha 1h40 nesse dia/)).toBeInTheDocument();
    fireEvent.click(confirm);
    expect(onSave).toHaveBeenCalledWith({ occurrence_key: 'k2', status: 'vai_faltar', will_study: true });
  });
  it('CT-C05 aula passada: faltei sem estudar e desfazer', () => {
    const onSave = vi.fn();
    const past = occ({ date: addDays(TODAY, -2), key: 'k0', attendance: { status: 'faltou', will_study: false, studied_instead: false, makeup_item_id: 'i1' } });
    render(<AttendanceModal occ={past} today={TODAY} onClose={vi.fn()} onSave={onSave} />);
    expect(screen.getByText(/reposição de Matemática/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar falta' }));
    expect(onSave).toHaveBeenLastCalledWith({ occurrence_key: 'k0', status: 'faltou', studied_instead: false });
    fireEvent.click(screen.getByRole('button', { name: 'Na verdade, fui à aula' }));
    expect(onSave).toHaveBeenLastCalledWith({ occurrence_key: 'k0', status: 'presente' });
  });
});

describe('Registro manual', () => {
  it('CT-C06 valida acertos e envia o card junto', () => {
    const onSave = vi.fn();
    render(<StudyLogModal target={{ itemId: 'it1', topic: 'Funções', subject: 'Matemática' }} today={TODAY} onClose={vi.fn()} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('Questões feitas'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Acertos'), { target: { value: '6' } });
    expect(screen.getByRole('button', { name: /Registrar$/ })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Acertos'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Minutos'), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: /Registrar$/ }));
    expect(onSave).toHaveBeenCalledWith({ item_id: 'it1', logged_on: TODAY, minutes: 40, questions: 5, correct: 4 });
  });
});

describe('Assistente de criação com turma', () => {
  it('CT-C07 data da turma não é enviada (o plano segue a turma); horário de início vai junto', async () => {
    fetchMock.mockResolvedValue({});
    const onCreated = vi.fn();
    render(<SetupWizard defaults={{ exam_date: '2027-11-14', days_per_week: 5, hours_per_day: 2 }}
      klass={{ id: 'c1', name: 'Extensivo', exam_date: '2027-11-14', default_review_weekdays: [] }} onCreated={onCreated} />);
    expect(screen.getByText(/Sua turma/)).toHaveTextContent('Extensivo');
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }));
    fireEvent.change(screen.getByLabelText('Horário de início na Segunda'), { target: { value: '14:00' } });
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }));
    fireEvent.click(screen.getByRole('button', { name: /Montar meu cronograma/ }));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.exam_date).toBeUndefined();
    expect(body.start_times).toEqual({ '0': '14:00' });
  });
});

describe('Flag do agente', () => {
  it('CT-C08 sem texto livre quando a escola desliga a IA', () => {
    render(<AgentChat today={TODAY} proposal={null} busy={false} canUndo={false} onSend={vi.fn()} onChip={vi.fn()}
      onConfirm={vi.fn()} onDiscard={vi.fn()} onUndo={vi.fn()} freeText={false} />);
    expect(screen.queryByLabelText('Mensagem para o assistente do cronograma')).toBeNull();
    expect(screen.getByText(/Use os atalhos/)).toBeInTheDocument();
  });
});

describe('Minha rotina', () => {
  it('CT-C09 horário de início entra na rotina e some no dia de folga', async () => {
    const { RoutineModal } = await import('@/components/cronograma/RoutineModal');
    const onSave = vi.fn();
    render(<RoutineModal open today={TODAY} onClose={vi.fn()} onSave={onSave}
      initial={{ capacity: { 0: 120, 1: 120, 2: 120, 3: 120, 4: 120, 5: 0, 6: 0 }, reviewWeekdays: [], rules: { start_times: { '1': '08:00' } } }} />);
    expect(screen.getByLabelText('Horário de início de terça')).toHaveValue('08:00');
    expect(screen.getByLabelText('Horário de início de sábado')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Horário de início de segunda'), { target: { value: '14:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar rotina' }));
    expect(onSave.mock.calls[0][0].rules.start_times).toEqual({ '0': '14:30', '1': '08:00' });
  });
});
