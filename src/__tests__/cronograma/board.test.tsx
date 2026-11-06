// CT-W / CT-M / CT-I: quadro da semana, grade do mês e painel de insights.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { WeekBoard } from '@/components/cronograma/WeekBoard';
import { MonthGrid } from '@/components/cronograma/MonthGrid';
import { InsightsPanel } from '@/components/cronograma/InsightsPanel';
import { addDays, type PlanItem } from '@/lib/cronograma';
import { MONDAY, TODAY, item, week, insights } from './fixtures';

function board(items: PlanItem[], props: Partial<React.ComponentProps<typeof WeekBoard>> = {}) {
  const onMove = vi.fn(); const onOpenItem = vi.fn(); const onOpenReviews = vi.fn();
  const r = render(
    <WeekBoard days={week()} items={items} today={TODAY} onMove={onMove} onOpenItem={onOpenItem}
      onOpenReviews={onOpenReviews} {...props} />,
  );
  return { ...r, onMove, onOpenItem, onOpenReviews };
}
const day = (label: string) => screen.getByRole('region', { name: label });

describe('WeekBoard', () => {
  it('CT-W01 renderiza 7 dias com rótulo dia-da-semana + data', () => {
    board([]);
    expect(screen.getAllByRole('region')).toHaveLength(7);
    expect(day('SEG 09/11')).toBeInTheDocument();
    expect(day('DOM 15/11')).toBeInTheDocument();
  });
  it('CT-W02 marca HOJE só no dia de hoje', () => {
    board([]);
    expect(within(day('QUA 11/11')).getByText(/HOJE/)).toBeInTheDocument();
    expect(screen.getAllByText(/HOJE/)).toHaveLength(1);
  });
  it('CT-W03 cada estudo aparece no seu dia', () => {
    board([item({ topic: 'Logaritmos', date: TODAY }), item({ topic: 'Citologia', date: addDays(TODAY, 1) })]);
    expect(within(day('QUA 11/11')).getByText('Logaritmos')).toBeInTheDocument();
    expect(within(day('QUI 12/11')).getByText('Citologia')).toBeInTheDocument();
  });
  it('CT-W04 estudo pulado não aparece', () => {
    board([item({ topic: 'Pulado', status: 'skipped' })]);
    expect(screen.queryByText('Pulado')).toBeNull();
  });
  it('CT-W05 estudos do dia ordenados por position', () => {
    board([item({ topic: 'B', position: 2 }), item({ topic: 'A', position: 1 })]);
    const txt = day('QUA 11/11').textContent!;
    expect(txt.indexOf('A')).toBeLessThan(txt.indexOf('B'));
  });
  it('CT-W06 item com data fora da semana é ignorado sem quebrar', () => {
    board([item({ topic: 'Longe', date: '2027-01-01' })]);
    expect(screen.queryByText('Longe')).toBeNull();
  });
  it('CT-W07 revisões do mesmo dia e área viram um card só', () => {
    board([item({ kind: 'review', minutes: 15 }), item({ kind: 'review', minutes: 15 })]);
    const d = day('QUA 11/11');
    expect(within(d).getAllByText(/Revisão · Matemática/)).toHaveLength(1);
    expect(within(d).getByText('2 tópicos · 30 min')).toBeInTheDocument();
  });
  it('CT-W08 revisões de áreas diferentes viram cards separados', () => {
    board([item({ kind: 'review' }), item({ kind: 'review', area: 'natureza', area_label: 'Natureza' })]);
    expect(screen.getByText(/Revisão · Matemática/)).toBeInTheDocument();
    expect(screen.getByText(/Revisão · Natureza/)).toBeInTheDocument();
  });
  it('CT-W09 singular "1 tópico"', () => {
    board([item({ kind: 'review', minutes: 15 })]);
    expect(screen.getByText('1 tópico · 15 min')).toBeInTheDocument();
  });
  it('CT-W10 card de revisão marca "feita" só quando todas estão feitas', () => {
    board([item({ kind: 'review', status: 'done' }), item({ kind: 'review' })]);
    expect(screen.queryByText('feita')).toBeNull();
  });
  it('CT-W11 card de revisão só prevista mostra "prevista"', () => {
    board([item({ kind: 'review', projected: true })]);
    expect(screen.getByText('prevista')).toBeInTheDocument();
  });
  it('CT-W12 contador soma estudos e tópicos de revisão, ignorando previstas', () => {
    board([item({ status: 'done' }), item(), item({ kind: 'review', status: 'done' }), item({ kind: 'review', projected: true })]);
    expect(within(day('QUA 11/11')).getByLabelText('2 de 3 concluídos')).toHaveTextContent('2/3');
  });
  it('CT-W13 contador fica verde quando tudo foi feito', () => {
    board([item({ status: 'done' })]);
    expect(screen.getByLabelText('1 de 1 concluídos').className).toMatch(/emerald/);
  });
  it('CT-W14 sem contador quando o dia só tem revisões previstas', () => {
    board([item({ kind: 'review', projected: true })]);
    expect(screen.queryByLabelText(/concluídos/)).toBeNull();
  });
  it('CT-W15 dia bloqueado mostra "Livre"', () => {
    const days = week(); days[3] = { ...days[3], blocked: true, minutes: 0 };
    board([], { days });
    expect(within(day('QUI 12/11')).getByText('Livre')).toBeInTheDocument();
    expect(within(day('QUI 12/11')).getByText('Dia livre')).toBeInTheDocument();
  });
  it('CT-W16 fim de semana com capacidade 0 mostra "Folga" e sem barra de carga', () => {
    board([]);
    expect(within(day('SÁB 14/11')).getByText('Folga')).toBeInTheDocument();
    expect(within(day('SÁB 14/11')).queryByRole('meter')).toBeNull();
  });
  it('CT-W17 dia passado vazio não convida a arrastar', () => {
    board([]);
    expect(within(day('SEG 09/11')).queryByText('Arraste um conteúdo para cá')).toBeNull();
    expect(within(day('QUI 12/11')).getByText('Arraste um conteúdo para cá')).toBeInTheDocument();
  });
  it('CT-W18 barra de carga limitada a 100% mesmo com dia estourado', () => {
    const days = week(); days[2] = { ...days[2], ratio: 1.8, level: 'red', minutes: 216 };
    board([], { days });
    const m = within(day('QUA 11/11')).getByRole('meter');
    expect(m).toHaveAttribute('aria-valuenow', '100');
    expect(m).toHaveAccessibleName('Carga do dia: Pesado');
    expect(within(day('QUA 11/11')).getByText('216/120min')).toBeInTheDocument();
  });
  it('CT-W18b barra do dia é o progresso: 1/1 enche a barra', () => {
    board([item({ status: 'done', minutes: 30 })]);
    const bar = within(day('QUA 11/11')).getByRole('progressbar', { name: 'Progresso do dia' });
    expect(bar).toHaveAttribute('aria-valuenow', '1');
    expect(bar).toHaveAttribute('aria-valuemax', '1');
    expect((bar.firstElementChild as HTMLElement).style.background).toMatch(/rgb\(16, 185, 129\)|#10b981/);
  });
  it('CT-W18c metade feita → barra pela metade, na cor da org', () => {
    board([item({ status: 'done' }), item()]);
    const bar = within(day('QUA 11/11')).getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '1');
    expect(bar).toHaveAttribute('aria-valuemax', '2');
  });
  it('CT-W18d dia sem itens não tem barra de progresso', () => {
    board([]);
    expect(within(day('QUI 12/11')).queryByRole('progressbar')).toBeNull();
  });
  it('CT-W18e dia de folga com itens fixados mostra minutos neutros e progresso', () => {
    const days = week(); days[5] = { ...days[5], minutes: 75, ratio: 9.99, level: 'red' };
    board([item({ date: '2026-11-14', pinned: true, minutes: 75 })], { days });
    expect(within(day('SÁB 14/11')).getByText('75min')).toBeInTheDocument();
    expect(within(day('SÁB 14/11')).queryByRole('meter')).toBeNull();
    expect(within(day('SÁB 14/11')).getByRole('progressbar')).toBeInTheDocument();
  });
  it('CT-W19 card concluído mostra "feito"', () => {
    board([item({ topic: 'Feito1', status: 'done' })]);
    expect(screen.getByText('feito')).toBeInTheDocument();
  });
  it('CT-W20 selo de pré-requisito atrasado', () => {
    board([item({ depends_on_late: ['Frações'] })]);
    expect(screen.getByTitle('Depende de: Frações')).toBeInTheDocument();
  });
  it('CT-W21 card fixado mostra o pino', () => {
    board([item({ pinned: true })]);
    expect(screen.getByLabelText('Fixado por você')).toBeInTheDocument();
  });
  it('CT-W22 clicar no estudo abre o item', () => {
    const it1 = item({ topic: 'Abrir' });
    const { onOpenItem } = board([it1]);
    fireEvent.click(screen.getByText('Abrir'));
    expect(onOpenItem).toHaveBeenCalledWith(it1);
  });
  it('CT-W23 clicar no card de revisão abre o grupo', () => {
    const { onOpenReviews } = board([item({ kind: 'review' })]);
    fireEvent.click(screen.getByText(/Revisão · Matemática/));
    expect(onOpenReviews).toHaveBeenCalledWith(expect.objectContaining({ date: TODAY, area: 'matematica' }));
  });
  it('CT-W24 menu "Mover para" lista só hoje em diante, sem o próprio dia', () => {
    board([item()]);
    fireEvent.click(screen.getByLabelText('Mover para…'));
    const opts = screen.getAllByRole('button').map((b) => b.textContent).filter((t) => /^\S{3} \d\d\/\d\d$/.test(t || ''));
    expect(opts).toEqual(['QUI 12/11', 'SEX 13/11', 'SÁB 14/11', 'DOM 15/11']);
  });
  it('CT-W25 escolher um dia no menu chama onMove e fecha o menu', () => {
    const it1 = item();
    const { onMove } = board([it1]);
    fireEvent.click(screen.getByLabelText('Mover para…'));
    fireEvent.click(screen.getByText('SEX 13/11'));
    expect(onMove).toHaveBeenCalledWith(it1.id, '2026-11-13');
    expect(screen.queryByText('Mover para')).toBeNull();
  });
  it('CT-W26 abrir o menu não abre o item', () => {
    const { onOpenItem } = board([item()]);
    fireEvent.click(screen.getByLabelText('Mover para…'));
    expect(onOpenItem).not.toHaveBeenCalled();
  });
  it('CT-W27 menu não oferece dia bloqueado pelo aluno (folga de rotina pode)', () => {
    const days = week(); days[4] = { ...days[4], blocked: true };
    board([item()], { days });
    fireEvent.click(screen.getByLabelText('Mover para…'));
    expect(screen.queryByText('SEX 13/11')).toBeNull(); // bloqueado
    expect(screen.getByText('SÁB 14/11')).toBeInTheDocument(); // folga de rotina: escolha do aluno
    expect(screen.getByText('QUI 12/11')).toBeInTheDocument();
  });
  it('CT-W28 em modo prévia (readOnly) não há menu de mover', () => {
    board([item()], { readOnly: true });
    expect(screen.queryByLabelText('Mover para…')).toBeNull();
  });
  it('CT-W29 item concluído e item de dia passado não podem ser movidos', () => {
    board([item({ status: 'done' }), item({ date: MONDAY })]);
    expect(screen.queryByLabelText('Mover para…')).toBeNull();
  });
  it('CT-W30 destaque da prévia no card', () => {
    const it1 = item({ topic: 'Muda' });
    const { container } = board([it1], { highlightIds: new Set([it1.id]) });
    expect(container.querySelector('.ring-amber-400')).not.toBeNull();
  });
  it('CT-W31 com mais de 3 cards aparece "+N · role para ver"', () => {
    board([item(), item(), item(), item({ kind: 'review' }), item()]);
    expect(within(day('QUA 11/11')).getByText('+2 · role para ver')).toBeInTheDocument();
  });
  it('CT-W32 com 3 cards não há rolagem', () => {
    board([item(), item(), item()]);
    expect(screen.queryByText(/role para ver/)).toBeNull();
  });
  it('CT-W33 dica de rolagem some quando os cards voltam a ser 3', () => {
    const its = [item(), item(), item(), item()];
    const r = board(its);
    expect(screen.getByText('+1 · role para ver')).toBeInTheDocument();
    r.rerender(<WeekBoard days={week()} items={its.slice(0, 3)} today={TODAY} onMove={r.onMove} onOpenItem={r.onOpenItem} onOpenReviews={r.onOpenReviews} />);
    expect(screen.queryByText(/role para ver/)).toBeNull();
  });
});

describe('MonthGrid', () => {
  const days42 = Array.from({ length: 42 }, (_, k) => ({
    date: addDays('2026-10-26', k), minutes: 60, capacity: 120, ratio: 0.5, level: 'green' as const, blocked: false,
  }));
  const grid = (p: Partial<React.ComponentProps<typeof MonthGrid>> = {}) => {
    const onPickDay = vi.fn();
    const r = render(<MonthGrid days={days42} items={[]} projection={[]} today={TODAY} month={10} onPickDay={onPickDay} {...p} />);
    return { ...r, onPickDay };
  };
  const cell = (n: string, k = 0) => screen.getAllByRole('button').filter((b) => b.querySelector('span span')?.textContent === n)[k];

  it('CT-M01 grade de 6 semanas', () => {
    grid();
    expect(screen.getAllByRole('button')).toHaveLength(42);
  });
  it('CT-M02 dias fora do mês ficam apagados', () => {
    grid();
    expect(cell('26').className).toMatch(/opacity-60/);
    expect(cell('11').className).not.toMatch(/opacity-60/);
  });
  it('CT-M03 conta estudos por área e revisões', () => {
    grid({ items: [item(), item(), item({ area: 'natureza' }), item({ kind: 'review' })] });
    expect(cell('11')).toHaveTextContent('21↻1');
  });
  it('CT-M04 pulados não entram no resumo', () => {
    grid({ items: [item({ status: 'skipped' })] });
    expect(cell('11').textContent).toBe('11');
  });
  it('CT-M05 dia só com projeção vira "previsto"', () => {
    grid({ projection: [{ ...item({ date: '2026-11-30' }), projected: true }] });
    expect(cell('30', 1)).toHaveTextContent('previsto'); // 1º "30" é 30/10
  });
  it('CT-M06 dia com item real não é "previsto" mesmo com projeção', () => {
    grid({ items: [item()], projection: [{ ...item(), projected: true }] });
    expect(cell('11')).not.toHaveTextContent('previsto');
  });
  it('CT-M07 dia bloqueado mostra "livre"', () => {
    const d = days42.map((x) => (x.date === TODAY ? { ...x, blocked: true } : x));
    grid({ days: d });
    expect(cell('11')).toHaveTextContent('livre');
  });
  it('CT-M08 clicar no dia escolhe a data', () => {
    const { onPickDay } = grid();
    fireEvent.click(cell('20'));
    expect(onPickDay).toHaveBeenCalledWith('2026-11-20');
  });
  it('CT-M09 hoje tem o anel de destaque', () => {
    grid();
    expect(cell('11').className).toMatch(/ring-2/);
  });
});

describe('InsightsPanel', () => {
  it('CT-I01 sem dados mostra o esqueleto', () => {
    const { container } = render(<InsightsPanel data={null} />);
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });
  it('CT-I02 semanas e dias até a prova', () => {
    render(<InsightsPanel data={insights()} />);
    expect(screen.getByText('51 sem')).toBeInTheDocument();
    expect(screen.getByText('361 dias')).toBeInTheDocument();
  });
  it('CT-I03 adiantado com delta positivo', () => {
    render(<InsightsPanel data={insights({ pace: 'adiantado', pace_delta: 3 })} />);
    expect(screen.getByText('Adiantado')).toBeInTheDocument();
    expect(screen.getByText('3 conteúdos à frente')).toBeInTheDocument();
  });
  it('CT-I04 atrasado com delta negativo mostra valor absoluto', () => {
    render(<InsightsPanel data={insights({ pace: 'atrasado', pace_delta: -4 })} />);
    expect(screen.getByText('4 conteúdos atrás')).toBeInTheDocument();
  });
  it('CT-I05 singular quando a diferença é 1 conteúdo', () => {
    render(<InsightsPanel data={insights({ pace: 'atrasado', pace_delta: -1 })} />);
    expect(screen.getByText('1 conteúdo atrás')).toBeInTheDocument();
  });
  it('CT-I06 memória sem revisões mostra traço', () => {
    render(<InsightsPanel data={insights({ retention_pct: null })} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });
  it('CT-I07 barras só das 4 áreas (sem "Geral")', () => {
    render(<InsightsPanel data={insights()} />);
    expect(screen.queryByText('Geral')).toBeNull();
    expect(screen.getByText('12/100 · 12%')).toBeInTheDocument();
  });
  it('CT-I08 freio do dia explica que hoje é só revisão', () => {
    render(<InsightsPanel data={insights({ brake_today: true, reviews_due_today: 9 })} />);
    expect(screen.getByText(/Hoje só revisão: você tem 9 revisões vencidas/)).toBeInTheDocument();
  });
  it('CT-I09 conteúdos que ficam de fora com a área principal', () => {
    render(<InsightsPanel data={insights({ left_out: 40, weekly_minutes: 450, left_out_by_area: [{ area: 'humanas', label: 'Humanas', count: 30 }] })} />);
    expect(screen.getByText(/No ritmo atual \(8h por semana\)/)).toHaveTextContent('a maioria de Humanas');
  });
  it('CT-I10 nada de fora → sem aviso', () => {
    render(<InsightsPanel data={insights()} />);
    expect(screen.queryByText(/No ritmo atual/)).toBeNull();
  });
});
