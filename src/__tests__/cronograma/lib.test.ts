// CT-L: helpers puros e cliente HTTP do cronograma.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getSession = vi.fn();
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { getSession } }) }));

import {
  addDays, parseISODate, toISODate, weekStart, weekdayIndex, formatDayMonth, studyLinks,
  cronogramaFetch, CronogramaApiError, parseSimuladoDeepLink,
} from '@/lib/cronograma';

describe('datas', () => {
  it('CT-L01 parse/format ida e volta', () => {
    expect(toISODate(parseISODate('2026-11-05'))).toBe('2026-11-05');
  });
  it('CT-L02 addDays vira o mês', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
  });
  it('CT-L03 addDays vira o ano', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('CT-L04 addDays negativo', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('CT-L05 ano bissexto', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
  it('CT-L06 dia de início do antigo horário de verão (meia-noite não existe)', () => {
    // 04/11/2018 em São Paulo pulou de 00:00 para 01:00.
    expect(toISODate(parseISODate('2018-11-04'))).toBe('2018-11-04');
    expect(addDays('2018-11-03', 1)).toBe('2018-11-04');
    expect(addDays('2018-11-04', 1)).toBe('2018-11-05');
    expect(weekStart('2018-11-04')).toBe('2018-10-29');
  });
  it('CT-L07 fim do horário de verão (dia com 25h)', () => {
    expect(addDays('2019-02-16', 1)).toBe('2019-02-17');
    expect(addDays('2019-02-17', 1)).toBe('2019-02-18');
  });
  it('CT-L08 weekStart de uma segunda é ela mesma', () => {
    expect(weekStart('2026-11-09')).toBe('2026-11-09');
  });
  it('CT-L09 weekStart de domingo volta para a segunda anterior', () => {
    expect(weekStart('2026-11-15')).toBe('2026-11-09');
  });
  it('CT-L10 weekStart atravessando o ano', () => {
    expect(weekStart('2027-01-01')).toBe('2026-12-28');
  });
  it('CT-L11 weekdayIndex: 0 = segunda, 6 = domingo', () => {
    expect(weekdayIndex('2026-11-09')).toBe(0);
    expect(weekdayIndex('2026-11-15')).toBe(6);
  });
  it('CT-L12 formatDayMonth com zero à esquerda', () => {
    expect(formatDayMonth('2026-03-05')).toBe('05/03');
  });
});

describe('studyLinks', () => {
  const node = { q_subject: 'Matemática', q_discipline: 'Funções & Gráficos', subject: 'Funções' };
  it('CT-L13 banco usa q_subject e topic', () => {
    const u = new URL(studyLinks('cenas', node).bank, 'http://x');
    expect(u.pathname).toBe('/partners/cenas/student/banco-de-questoes');
    expect(u.searchParams.get('subject')).toBe('Matemática');
    expect(u.searchParams.get('topic')).toBe('Funções & Gráficos');
  });
  it('CT-L14 simulado leva cronograma=1 e qty=10', () => {
    const u = new URL(studyLinks('cenas', node).simulado, 'http://x');
    expect(u.searchParams.get('cronograma')).toBe('1');
    expect(u.searchParams.get('qty')).toBe('10');
    expect(u.searchParams.get('topic')).toBe('Funções & Gráficos');
  });
  it('CT-L15 sem q_subject cai no subject do nó e sem topic', () => {
    const u = new URL(studyLinks('cenas', { q_subject: null, q_discipline: null, subject: 'Ótica' }).bank, 'http://x');
    expect(u.searchParams.get('subject')).toBe('Ótica');
    expect(u.searchParams.has('topic')).toBe(false);
  });
  it('CT-L16 o link do simulado é lido de volta pelo parser do simulado', () => {
    const s = studyLinks('cenas', node).simulado;
    expect(parseSimuladoDeepLink(s.slice(s.indexOf('?')))).toEqual({ subject: 'Matemática', topic: 'Funções & Gráficos', qty: 10, planItem: null });
  });
});

describe('parseSimuladoDeepLink', () => {
  it('CT-L17 sem cronograma=1 ignora', () => {
    expect(parseSimuladoDeepLink('?subject=Matemática')).toBeNull();
  });
  it('CT-L18 sem matéria ignora', () => {
    expect(parseSimuladoDeepLink('?cronograma=1&qty=10')).toBeNull();
  });
  it('CT-L19 qty fora da faixa é limitada (5..30) e lixo vira 10', () => {
    expect(parseSimuladoDeepLink('?cronograma=1&subject=A&qty=999')?.qty).toBe(30);
    expect(parseSimuladoDeepLink('?cronograma=1&subject=A&qty=1')?.qty).toBe(5);
    expect(parseSimuladoDeepLink('?cronograma=1&subject=A&qty=abc')?.qty).toBe(10);
  });
  it('CT-L20b leva o card do cronograma', () => {
    expect(parseSimuladoDeepLink('?cronograma=1&subject=A&plan_item=abc')?.planItem).toBe('abc');
  });
  it('CT-L20 topic vazio vira null', () => {
    expect(parseSimuladoDeepLink('?cronograma=1&subject=A&topic=')?.topic).toBeNull();
  });
});

describe('cronogramaFetch', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    getSession.mockReset();
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
    vi.stubGlobal('fetch', fetchMock);
  });
  const res = (status: number, body?: unknown) => ({
    ok: status >= 200 && status < 300, status,
    json: body === undefined ? () => Promise.reject(new Error('vazio')) : () => Promise.resolve(body),
  });

  it('CT-L21 sem sessão lança 401 sem chamar a rede', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    await expect(cronogramaFetch('/status')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('CT-L22 manda Bearer e Content-Type no caminho certo', async () => {
    fetchMock.mockResolvedValue(res(200, { ok: 1 }));
    await expect(cronogramaFetch('/status')).resolves.toEqual({ ok: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/student\/cronograma\/status$/);
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(init.headers['Content-Type']).toBe('application/json');
  });
  it('CT-L23 erro traz mensagem, status e code do backend', async () => {
    fetchMock.mockResolvedValue(res(409, { error: 'Versão desatualizada', code: 'stale' }));
    const e = await cronogramaFetch('/x').catch((x) => x);
    expect(e).toBeInstanceOf(CronogramaApiError);
    expect(e).toMatchObject({ message: 'Versão desatualizada', status: 409, code: 'stale' });
  });
  it('CT-L24 erro com detail (dev) anexa o diagnóstico', async () => {
    fetchMock.mockResolvedValue(res(500, { error: 'Erro inesperado', detail: 'KeyError: x' }));
    await expect(cronogramaFetch('/x')).rejects.toThrow('Erro inesperado (KeyError: x)');
  });
  it('CT-L25 erro sem corpo usa mensagem padrão', async () => {
    fetchMock.mockResolvedValue(res(502));
    await expect(cronogramaFetch('/x')).rejects.toThrow('Não foi possível falar com o cronograma.');
  });
  it('CT-L26 sucesso sem corpo devolve null', async () => {
    fetchMock.mockResolvedValue(res(204));
    await expect(cronogramaFetch('/x', { method: 'POST' })).resolves.toBeNull();
  });
  it('CT-L27 falha de rede vira erro amigável do cronograma', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const e = await cronogramaFetch('/x').catch((x: CronogramaApiError) => x) as CronogramaApiError;
    expect(e).toBeInstanceOf(CronogramaApiError);
    expect(e.status).toBe(0);
    expect(e.message).toMatch(/conexão/i);
  });
});

describe('formatMinutes', () => {
  it('CT-L28 formata minutos como no balão do agente', async () => {
    const { formatMinutes } = await import('@/lib/cronograma');
    expect(formatMinutes(90)).toBe('1h30');
    expect(formatMinutes(120)).toBe('2h');
    expect(formatMinutes(45)).toBe('45min');
    expect(formatMinutes(135)).toBe('2h15');
    expect(formatMinutes(65)).toBe('1h05');
  });
});

describe('sessão de estudo pelo banco', () => {
  it('CT-L29 início da sessão fica guardado por card (sair e voltar não zera)', async () => {
    const { studySessionStart, clearStudySession } = await import('@/lib/cronograma');
    localStorage.clear();
    const a = studySessionStart('x1');
    expect(Number.isNaN(Date.parse(a))).toBe(false);
    expect(studySessionStart('x1')).toBe(a);
    expect(localStorage.getItem('cronograma:study-start:x1')).toBe(a);
    clearStudySession('x1');
    expect(localStorage.getItem('cronograma:study-start:x1')).toBeNull();
  });
  it('CT-L30 valor corrompido no storage é trocado por agora', async () => {
    const { studySessionStart } = await import('@/lib/cronograma');
    localStorage.setItem('cronograma:study-start:x2', 'lixo');
    expect(studySessionStart('x2')).not.toBe('lixo');
  });
  it('CT-L31 studyLinks com itemId adiciona plan_item no banco e no simulado', async () => {
    const { studyLinks } = await import('@/lib/cronograma');
    const l = studyLinks('cenas', { q_subject: 'Matemática', q_discipline: 'Funções', subject: 'Funções' }, 'it-9');
    expect(new URL(l.bank, 'http://x').searchParams.get('plan_item')).toBe('it-9');
    expect(new URL(l.simulado, 'http://x').searchParams.get('plan_item')).toBe('it-9');
  });
});


describe('simulado aberto pelo card do Cronograma', () => {
  it('leva matéria, assunto e quantidade para a API do wizard, sem questões já respondidas', async () => {
    const { composicaoToApiCompositions } = await import('@/lib/simuladoComposicao');
    const { deepLinkComposicao, parseSimuladoDeepLink } = await import('@/lib/cronograma');
    const link = parseSimuladoDeepLink('?cronograma=1&subject=Matemática&topic=Funções&qty=15&plan_item=abc')!;
    expect(link.planItem).toBe('abc');
    const api = composicaoToApiCompositions(deepLinkComposicao(link), false);
    expect(api.reduce((n, c) => n + c.qty, 0)).toBe(15);
    expect(api[0]).toMatchObject({ subject: 'Matemática', include_answered: false });
    expect(api[0].topic ?? api[0].topics?.[0]).toBe('Funções');
  });
  it('sem assunto, usa a matéria inteira', async () => {
    const { composicaoToApiCompositions } = await import('@/lib/simuladoComposicao');
    const { deepLinkComposicao } = await import('@/lib/cronograma');
    const api = composicaoToApiCompositions(deepLinkComposicao({ subject: 'Física', topic: null, qty: 10 }), false);
    expect(api).toHaveLength(1);
    expect(api[0]).toMatchObject({ subject: 'Física', qty: 10 });
    expect(api[0].topic ?? null).toBeNull();
  });
});
