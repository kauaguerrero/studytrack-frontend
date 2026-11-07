// CT-P: página do cronograma inteira (componentes reais, backend mockado).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';

const { fetchMock, toast } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), warning: vi.fn() }),
}));
vi.mock('sonner', () => ({ toast }));
vi.mock('next/navigation', () => ({ useParams: () => ({ slug: 'cenas' }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));
vi.mock('@/contexts/OrgContext', () => ({ useOrg: () => ({ org: { name: 'Cenas', brand_primary: '#1f2d56', permissions: { cronograma_enabled: true } } }) }));
vi.mock('@/components/partners/ModuleGuard', () => ({ ModuleGuard: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/questions/QuestionRichText', () => ({ QuestionRichText: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('@/components/partners/founder-ui', () => {
  const Box = ({ children, className }: { children?: React.ReactNode; className?: string }) => <div className={className}>{children}</div>;
  return {
    RevealGroup: Box, RevealItem: Box, ElevatedCard: Box,
    SectionTitle: ({ title, action }: { title: string; action?: React.ReactNode }) => <h2>{title}{action}</h2>,
    Segmented: ({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) => (
      <div>{options.map((o) => <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>)}</div>
    ),
  };
});
vi.mock('@/lib/cronograma', async (orig) => ({ ...(await orig<typeof import('@/lib/cronograma')>()), cronogramaFetch: fetchMock }));

import CronogramaPage from '@/app/partners/[slug]/student/cronograma/page';
import { CronogramaApiError, addDays, type CronogramaView, type PlanItem } from '@/lib/cronograma';
import { TODAY, item, view, insights, proposal } from './fixtures';

// ── backend falso: rotas → respostas; cada teste sobrescreve o que precisa ──
type Handler = (path: string, init?: RequestInit) => unknown;
let routes: { match: RegExp; method?: string; handle: Handler }[] = [];
let items: PlanItem[] = [];
const on = (method: string, match: RegExp, handle: Handler) => { routes.unshift({ method, match, handle }); };
const calls = (method: string, match: RegExp) =>
  fetchMock.mock.calls.filter(([p, i]) => (i?.method ?? 'GET') === method && match.test(p));

function viewFor(path: string): CronogramaView {
  const p = new URLSearchParams(path.split('?')[1]);
  const start = p.get('start') ?? TODAY;
  const days = Number(p.get('days') ?? 7);
  const v = view(start, items.filter((i) => i.date >= start && i.date < addDays(start, days)));
  return { ...v, range: { start, days }, days: Array.from({ length: days }, (_, k) => ({ ...v.days[k % 7], date: addDays(start, k) })) };
}

beforeEach(() => {
  fetchMock.mockReset();
  for (const f of [toast, toast.success, toast.error, toast.warning]) f.mockReset();
  items = [item({ id: 'A', topic: 'Logaritmos', date: TODAY }), item({ id: 'R', kind: 'review', topic: 'Frações', date: TODAY, minutes: 15 })];
  routes = [];
  on('GET', /^\/status$/, () => ({ enabled: true, has_plan: true, plan: view().plan }));
  on('GET', /^\/\?/, (p) => viewFor(p));
  on('GET', /^\/insights$/, () => insights());
  fetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const r = routes.find((x) => (x.method ?? 'GET') === method && x.match.test(path));
    if (!r) throw new Error(`rota não mockada: ${method} ${path}`);
    return r.handle(path, init);
  });
});

const day = (label: string) => screen.getByRole('region', { name: label });
// o quadro (o "Próximo passo" repete o tópico fora dele)
const board = () => screen.getAllByRole('region')[0].parentElement as HTMLElement;
async function ready() {
  render(<CronogramaPage />);
  await waitFor(() => within(board()).getByText('Logaritmos'));
}
const moveVia = (topic: string, to: string) => {
  const card = within(board()).getByText(topic).closest('div.relative') as HTMLElement;
  fireEvent.click(within(card).getByLabelText('Mover para…'));
  fireEvent.click(within(card).getByText(to));
};

describe('carga', () => {
  it('CT-P01 enquanto carrega o status mostra o esqueleto', () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<CronogramaPage />);
    expect(screen.getByRole('status', { name: 'Carregando cronograma' })).toBeInTheDocument();
  });
  it('CT-P01b o esqueleto só sai quando a semana e os insights chegaram', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    on('GET', /^\/insights$/, async () => { await gate; return insights(); });
    render(<CronogramaPage />);
    await waitFor(() => expect(calls('GET', /^\/\?start=/).length).toBeGreaterThan(0));
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.getByRole('status', { name: 'Carregando cronograma' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Cronograma' })).toBeNull();
    release();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Cronograma' })).toBeInTheDocument());
    expect(screen.queryByRole('status', { name: 'Carregando cronograma' })).toBeNull();
  });
  it('CT-P01c se a semana falhar, mostra "Tentar de novo" em vez de esqueleto eterno', async () => {
    on('GET', /^\/\?start=/, () => { throw new Error('falhou'); });
    render(<CronogramaPage />);
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });
  it('CT-P02 módulo desligado mostra o aviso', async () => {
    on('GET', /^\/status$/, () => ({ enabled: false }));
    render(<CronogramaPage />);
    expect(await screen.findByText(/não está habilitado/)).toBeInTheDocument();
  });
  it('CT-P03 sem plano abre o assistente de criação', async () => {
    on('GET', /^\/status$/, () => ({ enabled: true, has_plan: false, defaults: { exam_date: '2027-11-07', days_per_week: 5, hours_per_day: 2 } }));
    render(<CronogramaPage />);
    expect(await screen.findByText('Passo 1 de 3')).toBeInTheDocument();
  });
  it('CT-P04 criar o plano recarrega e mostra o quadro', async () => {
    let has = false;
    on('GET', /^\/status$/, () => ({ enabled: true, has_plan: has, plan: view().plan, defaults: { exam_date: '2027-11-07', days_per_week: 5, hours_per_day: 2 } }));
    on('POST', /^\/setup$/, () => { has = true; return {}; });
    render(<CronogramaPage />);
    await screen.findByText('Passo 1 de 3');
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }));
    fireEvent.click(screen.getByRole('button', { name: /Continuar/ }));
    fireEvent.click(screen.getByRole('button', { name: /Montar meu cronograma/ }));
    await waitFor(() => expect(within(board()).getByText('Logaritmos')).toBeInTheDocument());
  });
  it('CT-P05 ancora na semana de "hoje" do backend', async () => {
    await ready();
    expect(calls('GET', /^\/\?start=2026-11-09&days=7$/)).toHaveLength(1);
    expect(within(day('QUA 11/11')).getByText(/HOJE/)).toBeInTheDocument();
    expect(screen.getByText('Semana 3 · novembro 2026')).toBeInTheDocument();
  });
  it('CT-P06 erro no status vira toast (sem tela branca quebrada)', async () => {
    on('GET', /^\/status$/, () => { throw new CronogramaApiError('Sessão expirada. Faça login novamente.', 401); });
    render(<CronogramaPage />);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Sessão expirada. Faça login novamente.'));
  });
  it('CT-P07 insights falhando não derruba a página', async () => {
    on('GET', /^\/insights$/, () => { throw new Error('boom'); });
    await ready();
    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe('mover', () => {
  it('CT-P08 mover é otimista e manda a versão do plano', async () => {
    let release!: () => void;
    on('PATCH', /^\/items\/A$/, () => new Promise((r) => { release = () => r({ warnings: [] }); }));
    await ready();
    moveVia('Logaritmos', 'SEX 13/11');
    expect(within(day('SEX 13/11')).getByText('Logaritmos')).toBeInTheDocument(); // antes do backend responder
    expect(JSON.parse(calls('PATCH', /^\/items\/A$/)[0][1].body)).toEqual({ to_date: '2026-11-13', version: 7 });
    await act(async () => { release(); });
  });
  it('CT-P09 depois do PATCH recarrega quadro e insights', async () => {
    on('PATCH', /^\/items\/A$/, () => { items = items.map((i) => (i.id === 'A' ? { ...i, date: '2026-11-13', pinned: true } : i)); return { warnings: [] }; });
    await ready();
    const before = calls('GET', /^\/insights$/).length;
    moveVia('Logaritmos', 'SEX 13/11');
    await waitFor(() => expect(calls('GET', /^\/insights$/).length).toBe(before + 1));
    expect(within(day('SEX 13/11')).getByLabelText('Fixado por você')).toBeInTheDocument();
  });
  it('CT-P10 erro desfaz o movimento e avisa', async () => {
    on('PATCH', /^\/items\/A$/, () => { throw new CronogramaApiError('to_date precisa ser antes da prova', 400); });
    await ready();
    moveVia('Logaritmos', 'SEX 13/11');
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('to_date precisa ser antes da prova'));
    expect(within(day('QUA 11/11')).getByText('Logaritmos')).toBeInTheDocument();
    // o card que "pulou" sai com animação de saída
    await waitFor(() => expect(within(day('SEX 13/11')).queryByText('Logaritmos')).toBeNull());
  });
  it('CT-P11 conflito de versão (409) recarrega do backend', async () => {
    on('PATCH', /^\/items\/A$/, () => { throw new CronogramaApiError('O cronograma mudou.', 409); });
    await ready();
    const n = calls('GET', /^\/\?start=/).length;
    moveVia('Logaritmos', 'SEX 13/11');
    await waitFor(() => expect(calls('GET', /^\/\?start=/).length).toBe(n + 1));
  });
  it('CT-P12 avisos do backend viram toast de aviso', async () => {
    on('PATCH', /^\/items\/A$/, () => ({ warnings: [{ message: 'Atrasar a revisão reduz a retenção.' }] }));
    await ready();
    moveVia('Logaritmos', 'SEX 13/11');
    await waitFor(() => expect(toast.warning).toHaveBeenCalledWith('Atrasar a revisão reduz a retenção.'));
  });
});

const nextBtn = () => screen.getByRole('button', { name: /^Ir para o período seguinte/ });
const prevBtn = () => screen.getByRole('button', { name: /^Ir para o período anterior/ });

describe('navegação', () => {
  it('CT-P13 próxima semana busca a semana seguinte', async () => {
    await ready();
    fireEvent.click(nextBtn());
    await waitFor(() => expect(calls('GET', /^\/\?start=2026-11-16&days=7$/)).toHaveLength(1));
  });
  it('CT-P14 não volta mais que ~30 dias', async () => {
    await ready();
    for (let k = 0; k < 4; k++) { fireEvent.click(prevBtn()); await screen.findByRole('region', { name: `SEG ${['02/11', '26/10', '19/10', '12/10'][k]}` }); }
    expect(prevBtn()).toBeDisabled();
  });
  it('CT-P15 respostas fora de ordem não deixam a semana errada na tela', async () => {
    await ready();
    const pending: Record<string, () => void> = {};
    on('GET', /^\/\?start=/, (p) => new Promise((r) => { pending[p] = () => r(viewFor(p)); }));
    fireEvent.click(nextBtn());
    fireEvent.click(nextBtn());
    await waitFor(() => expect(Object.keys(pending)).toHaveLength(2));
    await act(async () => { pending['/?start=2026-11-23&days=7'](); });
    await act(async () => { pending['/?start=2026-11-16&days=7'](); });
    expect(screen.getByRole('region', { name: 'SEG 23/11' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'SEG 16/11' })).toBeNull();
  });
  it('CT-P16 visão do mês busca 6 semanas a partir da segunda da 1ª semana', async () => {
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Mês' }));
    await waitFor(() => expect(calls('GET', /^\/\?start=2026-10-26&days=42$/)).toHaveLength(1));
  });
  it('CT-P17 clicar num dia do mês volta para a semana dele', async () => {
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Mês' }));
    await waitFor(() => expect(calls('GET', /days=42/)).toHaveLength(1));
    const cell = await waitFor(() => {
      const c = screen.getAllByRole('button').find((b) => b.querySelector('span span')?.textContent === '25');
      if (!c) throw new Error('sem grade'); return c;
    });
    fireEvent.click(cell);
    await waitFor(() => expect(calls('GET', /^\/\?start=2026-11-23&days=7$/)).toHaveLength(1));
  });
  it('CT-P18 "Hoje" volta para a semana atual', async () => {
    await ready();
    fireEvent.click(nextBtn());
    await screen.findByRole('region', { name: 'SEG 16/11' });
    fireEvent.click(screen.getByRole('button', { name: 'Hoje' }));
    expect(await screen.findByRole('region', { name: 'SEG 09/11' })).toBeInTheDocument();
  });
  it('CT-P19 roda de semanas: atual no meio, anterior em cima e seguinte embaixo', async () => {
    await ready();
    const wheel = screen.getByRole('group', { name: 'Seletor de semana' });
    expect(within(wheel).getByText('09/11 – 15/11')).toBeInTheDocument();
    expect(within(wheel).getByText('Esta semana')).toBeInTheDocument();
    const next = within(wheel).getByRole('button', { name: 'Ir para o período seguinte: 16/11 – 22/11' });
    within(wheel).getByRole('button', { name: 'Ir para o período anterior: 02/11 – 08/11' });
    fireEvent.click(next);
    await waitFor(() => expect(calls('GET', /^\/\?start=2026-11-16&days=7$/)).toHaveLength(1));
    expect(await within(wheel).findByText('16/11 – 22/11', { selector: '[aria-current] *' })).toBeInTheDocument();
  });
  it('CT-P19d rótulo do navegador acompanha a semana do mês', async () => {
    await ready();
    expect(screen.getByText('Semana 3 · novembro 2026')).toBeInTheDocument();
    fireEvent.click(nextBtn());
    expect(await screen.findByText('Semana 4 · novembro 2026')).toBeInTheDocument();
    fireEvent.click(nextBtn());
    fireEvent.click(nextBtn());
    expect(await screen.findByText('Semana 1 · dezembro 2026')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mês' }));
    expect(await within(screen.getByRole('group', { name: 'Seletor de mês' })).findByText('dezembro 2026', { selector: '[aria-current] *' })).toBeInTheDocument();
  });
  it('CT-P19b roda responde a ↓/↑ do teclado', async () => {
    await ready();
    const wheel = screen.getByRole('group', { name: 'Seletor de semana' });
    fireEvent.keyDown(wheel, { key: 'ArrowDown' });
    await waitFor(() => expect(calls('GET', /^\/\?start=2026-11-16&days=7$/)).toHaveLength(1));
    fireEvent.keyDown(wheel, { key: 'ArrowUp' });
    await screen.findByRole('region', { name: 'SEG 09/11' });
  });
  it('CT-P19c roda no modo mês mostra meses', async () => {
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Mês' }));
    const wheel = await screen.findByRole('group', { name: 'Seletor de mês' });
    expect(within(wheel).getByText('Este mês')).toBeInTheDocument();
    expect(within(wheel).getByRole('button', { name: /seguinte: dezembro 2026/ })).toBeInTheDocument();
  });
});

describe('agente', () => {
  const preview = () => proposal({
    diff: { moved: [{ id: 'A', node_id: 'n', kind: 'study', topic: 'Logaritmos', from: TODAY, to: '2026-11-12' }], added: [], removed: [] },
    preview_items: [{ ...items[0], date: '2026-11-12' }, items[1]],
  });

  it('CT-P20 chip gera prévia: quadro fica só leitura e mostra o novo dia', async () => {
    on('POST', /^\/agent$/, () => preview());
    await ready();
    fireEvent.click(screen.getByText('Semana leve'));
    expect(await screen.findByText(/Prévia: os cards destacados/)).toBeInTheDocument();
    expect(within(day('QUI 12/11')).getByText('Logaritmos')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByLabelText('Mover para…')).toBeNull()); // após a animação de saída
    expect(JSON.parse(calls('POST', /^\/agent$/)[0][1].body)).toEqual({ chip: 'lighter_week' });
  });
  it('CT-P21 confirmar aplica, recarrega e libera o desfazer', async () => {
    on('POST', /^\/agent$/, () => preview());
    on('POST', /^\/agent\/req-1\/confirm$/, () => ({ applied: true }));
    await ready();
    fireEvent.click(screen.getByText('Semana leve'));
    fireEvent.click(await screen.findByRole('button', { name: /Confirmar/ }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Cronograma atualizado.'));
    expect(screen.getByText('Desfazer última')).toBeInTheDocument();
    expect(screen.queryByText(/Prévia:/)).toBeNull();
  });
  it('CT-P22 confirmação expirada fecha a prévia e recarrega', async () => {
    on('POST', /^\/agent$/, () => preview());
    on('POST', /confirm$/, () => { throw new CronogramaApiError('A sugestão expirou.', 409, 'expired'); });
    await ready();
    fireEvent.click(screen.getByText('Semana leve'));
    fireEvent.click(await screen.findByRole('button', { name: /Confirmar/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('A sugestão expirou.'));
    expect(screen.queryByText(/Prévia:/)).toBeNull();
    expect(screen.queryByText('Desfazer última')).toBeNull();
  });
  it('CT-P23 descartar avisa o backend e devolve o quadro original', async () => {
    on('POST', /^\/agent$/, () => preview());
    on('POST', /discard$/, () => ({}));
    await ready();
    fireEvent.click(screen.getByText('Semana leve'));
    fireEvent.click(await screen.findByRole('button', { name: /Descartar/ }));
    expect(calls('POST', /^\/agent\/req-1\/discard$/)).toHaveLength(1);
    expect(within(day('QUA 11/11')).getByText('Logaritmos')).toBeInTheDocument();
  });
  it('CT-P24 pedido que falhou não trava nada e não chama discard', async () => {
    on('POST', /^\/agent$/, () => proposal({ status: 'failed', reply: 'Não entendi.' }));
    await ready();
    fireEvent.click(screen.getByText('Semana leve'));
    expect(await screen.findByText('Não entendi.')).toBeInTheDocument();
    expect(screen.queryByText('Fechar')).toBeNull();
    expect(screen.getByRole('button', { name: /Semana leve/ })).not.toBeDisabled();
    expect(calls('POST', /discard$/)).toHaveLength(0);
  });
  it('CT-P25 cota estourada (429) mostra o aviso por mais tempo', async () => {
    on('POST', /^\/agent$/, () => { throw new CronogramaApiError('Aguarde 2h 30min', 429, 'agent_quota'); });
    await ready();
    fireEvent.change(screen.getByLabelText('Mensagem para o assistente do cronograma'), { target: { value: 'folga sexta' } });
    fireEvent.keyDown(screen.getByLabelText('Mensagem para o assistente do cronograma'), { key: 'Enter' });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Aguarde 2h 30min', { duration: 8000 }));
  });
  it('CT-P26 desfazer chama o backend e some', async () => {
    on('POST', /^\/agent$/, () => preview());
    on('POST', /confirm$/, () => ({ applied: true }));
    on('POST', /^\/agent\/undo$/, () => ({ undone: true }));
    await ready();
    fireEvent.click(screen.getByText('Semana leve'));
    fireEvent.click(await screen.findByRole('button', { name: /Confirmar/ }));
    fireEvent.click(await screen.findByText('Desfazer última'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Alteração desfeita.'));
    expect(screen.queryByText('Desfazer última')).toBeNull();
  });
  it('CT-P27 prévia pedida na visão do mês volta para a semana', async () => {
    on('POST', /^\/agent$/, () => preview());
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Mês' }));
    await waitFor(() => expect(calls('GET', /days=42/)).toHaveLength(1));
    fireEvent.click(screen.getByText('Semana leve'));
    expect(await screen.findByText(/Prévia: os cards destacados/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'QUI 12/11' })).toHaveTextContent('Logaritmos');
  });
});

describe('estudar e revisar', () => {
  it('CT-P28 concluir pelo modal fecha, avisa e recarrega', async () => {
    on('POST', /^\/items\/A\/complete$/, () => { items = items.map((i) => (i.id === 'A' ? { ...i, status: 'done' } : i)); return {}; });
    await ready();
    fireEvent.click(within(board()).getByText('Logaritmos'));
    fireEvent.click(await screen.findByRole('button', { name: /Já estudei/ }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText('feito')).toBeInTheDocument();
  });
  it('CT-P29 pular pelo modal', async () => {
    on('POST', /^\/items\/A\/skip$/, () => ({}));
    await ready();
    fireEvent.click(within(board()).getByText('Logaritmos'));
    fireEvent.click(await screen.findByRole('button', { name: /Pular hoje/ }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Conteúdo remarcado para outro dia.'));
  });
  it('CT-P30 card de revisão → lista → mini-quiz → resultado recarrega o quadro', async () => {
    on('GET', /^\/items\/R\/quiz$/, () => ({ ...items[1], item_id: 'R', basis: 'self', questions: [] }));
    on('POST', /^\/items\/R\/review$/, () => ({ grade: 'good', grade_source: 'self', accuracy: null, next_due_on: '2026-11-14', interval_days: 3, results: [] }));
    await ready();
    fireEvent.click(screen.getByText(/Revisão · Matemática/));
    fireEvent.click(await screen.findByRole('button', { name: /Frações/ }));
    fireEvent.click(await screen.findByText('Lembrei bem'));
    expect(await screen.findByText('Bom')).toBeInTheDocument();
    const n = calls('GET', /^\/\?start=/).length;
    await waitFor(() => expect(n).toBeGreaterThanOrEqual(2));
  });
});

describe('pergunta sim/não do agente', () => {
  it('CT-P31 "Sim" confirma a sugestão sem nova mensagem; "Não" descarta', async () => {
    on('POST', /^\/agent$/, () => proposal({ question: 'Quer isso em todo sábado?' }));
    on('POST', /confirm$/, () => ({ applied: true }));
    await ready();
    fireEvent.change(screen.getByLabelText('Mensagem para o assistente do cronograma'), { target: { value: 'coloca mais coisa pra sábado' } });
    fireEvent.keyDown(screen.getByLabelText('Mensagem para o assistente do cronograma'), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('button', { name: 'Sim' }));
    await waitFor(() => expect(calls('POST', /^\/agent\/req-1\/confirm$/)).toHaveLength(1));
    expect(calls('POST', /^\/agent$/)).toHaveLength(1);
  });
  it('CT-P32 ajustar o tempo chama /adjust (sem nova mensagem à IA) e troca Sim/Não por Confirmar', async () => {
    const ed = (minutes: number) => [{ index: 0, op: 'set_day_capacity', label: 'sábado 14/11', minutes, routine_minutes: 0, date: '2026-11-14' }];
    on('POST', /^\/agent$/, () => proposal({ question: 'Coloco 1h30 no sábado?', editable: ed(90) as never, routine_max_minutes: 120 }));
    on('POST', /adjust$/, () => proposal({ reply: 'Ajustado: 1h45 em sábado 14/11.', editable: ed(105) as never, routine_max_minutes: 120 }));
    await ready();
    fireEvent.change(screen.getByLabelText('Mensagem para o assistente do cronograma'), { target: { value: 'coloca mais coisa pra sábado' } });
    fireEvent.keyDown(screen.getByLabelText('Mensagem para o assistente do cronograma'), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('button', { name: 'Mais 15 minutos' }));
    await waitFor(() => expect(calls('POST', /^\/agent\/req-1\/adjust$/)).toHaveLength(1));
    expect(JSON.parse(calls('POST', /adjust$/)[0][1].body)).toEqual({ index: 0, minutes: 105 });
    expect(await screen.findByText('Ajustado: 1h45 em sábado 14/11.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirmar/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sim' })).toBeNull();
    expect(calls('POST', /^\/agent$/)).toHaveLength(1);
  });
});

describe('volta do banco com a meta batida', () => {
  it('CT-P33 ?concluido=<id> solta confete, avisa e limpa a URL', async () => {
    window.history.replaceState(null, '', '/partners/cenas/student/cronograma?concluido=A');
    await ready();
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Conteúdo concluído: Logaritmos', expect.anything()));
    expect(screen.getByTestId('celebration-confetti')).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });
  it('CT-P35 "Voltar a estudar" no dia bloqueado chama /days/<data>/unblock sem IA e recarrega', async () => {
    const blockedDate = addDays(TODAY, 2);
    on('GET', /^\/\?/, (p) => {
      const v = viewFor(p);
      return { ...v, days: v.days.map((d) => (d.date === blockedDate ? { ...d, blocked: true, minutes: 0 } : d)) };
    });
    on('POST', /^\/days\/.+\/unblock$/, () => ({ date: blockedDate, diff: { moved: [], added: [], removed: [] } }));
    await ready();
    const before = calls('GET', /^\/\?/).length;
    fireEvent.click(screen.getByRole('button', { name: /Voltar a estudar em/ }));
    await waitFor(() => expect(calls('POST', new RegExp(`^/days/${blockedDate}/unblock$`))).toHaveLength(1));
    await waitFor(() => expect(calls('GET', /^\/\?/).length).toBeGreaterThan(before));
    expect(calls('POST', /^\/agent$/)).toHaveLength(0);
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('voltou para o cronograma'));
  });
  it('CT-P36 "Corrigir" chama /items/<id>/fix-order, avisa a nova data e recarrega', async () => {
    items = [item({ id: 'A', topic: 'Logaritmos', date: TODAY, depends_on_late: ['Potências'] })];
    on('POST', /^\/items\/A\/fix-order$/, () => ({ date: addDays(TODAY, 3), diff: { moved: [], added: [], removed: [] } }));
    await ready();
    const before = calls('GET', /^\/\?/).length;
    fireEvent.click(within(board()).getByText('Logaritmos'));
    fireEvent.click(await screen.findByRole('button', { name: 'Corrigir' }));
    await waitFor(() => expect(calls('POST', /fix-order$/)).toHaveLength(1));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('depois do que ele depende')));
    await waitFor(() => expect(calls('GET', /^\/\?/).length).toBeGreaterThan(before));
  });
  it('CT-P34 sem ?concluido não há confete', async () => {
    window.history.replaceState(null, '', '/partners/cenas/student/cronograma');
    await ready();
    expect(screen.queryByTestId('celebration-confetti')).toBeNull();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
