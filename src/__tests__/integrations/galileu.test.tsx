// Fase 11: Galileu financeiro (só leitura) — tela do gestor e do aluno.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const fetchMock = vi.fn();
vi.mock('@/lib/org-classes', () => ({ classesFetch: (...a: unknown[]) => fetchMock(...a) }));
vi.mock('@/contexts/OrgContext', () => ({
  useOrg: () => ({ org: { id: 'org1', slug: 'cenas', name: 'Cenas', whatsapp_finance: null, permissions: { integracoes_enabled: true } } }),
}));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));

import { GalileuSettings } from '@/components/integrations/GalileuSettings';
import { StudentFinance } from '@/components/integrations/StudentFinance';
import { formatDateBR, groupInstallments, type Installment } from '@/lib/integrations';

beforeEach(() => { fetchMock.mockReset(); });

const status = (over: Record<string, unknown> = {}) => ({
  provider: 'galileu', enabled: false, configured: false, key_source: null, key_last4: null,
  last_check_at: null, last_check_ok: null, last_error: null, ...over,
});
const inst = (over: Partial<Installment>): Installment => ({
  id: '1', kind: 'mensalidade', description: '(1/10) CONTRATO', due_date: '2026-12-10', paid_date: null, amount: 240,
  total: 250, paid_amount: null, fine: 5, status: 'aberta', status_label: 'Ativa', link: null, ...over,
});

describe('Galileu — gestor', () => {
  it('CT-G01 cola a chave, o servidor testa; liga; vincula pelo e-mail e à mão', async () => {
    let st = status();
    const links = { linked: 1, total: 2, students: [
      { user_id: 'u2', name: 'Bia', email: 'bia@x.com', link: null },
      { user_id: 'u1', name: 'Ana', email: 'ana@x.com', link: { external_student_id: '111', matched_by: 'email', galileu: { id_aluno: '111', nome: 'Ana Souza', email: null, rm: null, cpf: null } } },
    ] };
    fetchMock.mockImplementation((_s: string, path: string, init?: RequestInit) => {
      const m = init?.method ?? 'GET';
      if (path === '/integrations/galileu' && m === 'GET') return Promise.resolve(st);
      if (path === '/integrations/galileu/key' && m === 'PUT') {
        st = status({ configured: true, key_source: 'org', key_last4: 'ABCD', last_check_ok: true, last_check_at: '2026-11-25T12:00:00Z' });
        return Promise.resolve(st);
      }
      if (path === '/integrations/galileu/enabled') { st = { ...st, enabled: JSON.parse(String(init?.body)).enabled }; return Promise.resolve(st); }
      if (path === '/integrations/galileu/links') return Promise.resolve(links);
      if (path === '/integrations/galileu/links/auto') return Promise.resolve({ linked_now: 1, without_match: 1, already_linked: 0 });
      if (path.startsWith('/integrations/galileu/search')) return Promise.resolve({ results: [{ id_aluno: '222', nome: 'Beatriz Lima', email: null, rm: 'R2', cpf: '***.654.321-**' }] });
      if (path === '/integrations/galileu/links/u2' && m === 'PUT') return Promise.resolve({ ok: true });
      return Promise.reject(new Error(`${m} ${path}`));
    });
    render(<GalileuSettings />);
    const sw = await screen.findByRole('switch', { name: 'Ligar financeiro para os alunos' });
    expect(sw).toBeDisabled(); // sem chave não liga
    fireEvent.change(screen.getByLabelText('Chave da API do Galileu'), { target: { value: 'chave-1234567890ABCD' } });
    fireEvent.click(screen.getByRole('button', { name: /Testar e salvar/ }));
    expect(await screen.findByText(/Chave testada e salva/)).toBeInTheDocument();
    expect(screen.getByText('ABCD')).toBeInTheDocument();
    expect(screen.getByLabelText('Chave da API do Galileu')).toHaveValue(''); // a chave sai da tela
    expect(fetchMock).toHaveBeenCalledWith('cenas', '/integrations/galileu/key', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ key: 'chave-1234567890ABCD' }) }));

    fireEvent.click(screen.getByRole('switch', { name: 'Ligar financeiro para os alunos' }));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Ligar financeiro para os alunos' })).toBeChecked());

    expect(await screen.findByText('1 de 2 alunos ligados ao cadastro do Galileu.')).toBeInTheDocument();
    expect(screen.getByText(/Galileu: Ana Souza · pelo e-mail/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Vincular pelo e-mail/ }));
    expect(await screen.findByText(/1 aluno\(s\) vinculado\(s\) pelo e-mail\. 1 sem correspondência/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Vincular' }));
    const dlg = screen.getByRole('dialog', { name: 'Vincular ao Galileu' });
    fireEvent.change(within(dlg).getByLabelText('Buscar no Galileu'), { target: { value: 'beatriz' } });
    fireEvent.click(within(dlg).getByRole('button', { name: /Buscar/ }));
    fireEvent.click(await within(dlg).findByRole('button', { name: /Beatriz Lima/ }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(fetchMock).toHaveBeenCalledWith('cenas', '/integrations/galileu/links/u2', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ external_student_id: '222' }) }));
  });

  it('CT-G02 chave do servidor (env) e chave ilegível aparecem como tal', async () => {
    fetchMock.mockResolvedValueOnce(status({ configured: false, key_source: 'invalid' }));
    const { unmount } = render(<GalileuSettings />);
    expect(await screen.findByText(/não pode mais ser lida/)).toBeInTheDocument();
    unmount();
    fetchMock.mockReset();
    fetchMock.mockImplementation((_s: string, path: string) =>
      Promise.resolve(path === '/integrations/galileu' ? status({ configured: true, key_source: 'env' }) : { linked: 0, total: 0, students: [] }));
    render(<GalileuSettings />);
    expect(await screen.findByText(/chave configurada no servidor/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Apagar chave/ })).toBeNull();
  });
});

describe('Galileu — aluno', () => {
  it('CT-G03 vê vencidas, em aberto e pagas com boleto e WhatsApp do financeiro', async () => {
    fetchMock.mockResolvedValue({
      whatsapp_finance: '5534999990000', linked: true,
      installments: [
        inst({ id: 'a', status: 'vencida', due_date: '2026-11-10', link: 'https://www.appgalileu.com.br/fatura/a' }),
        inst({ id: 'b', status: 'aberta', due_date: '2026-12-10', description: '(2/10) CONTRATO' }),
        inst({ id: 'c', status: 'paga', paid_date: '2026-10-10', paid_amount: 240, description: '(1/10) PAGA', link: 'https://www.appgalileu.com.br/x' }),
      ],
      summary: { overdue_count: 1, overdue_total: 240, open_count: 1, open_total: 240, paid_count: 1, next_due: '2026-12-10' },
    });
    render(<StudentFinance />);
    const venc = await screen.findByRole('region', { name: 'Vencidas' });
    expect(within(venc).getByText('Vence em 10/11/2026')).toBeInTheDocument();
    expect(within(venc).getByRole('link', { name: /Boleto/ })).toHaveAttribute('href', 'https://www.appgalileu.com.br/fatura/a');
    const pagas = screen.getByRole('region', { name: 'Pagas' });
    expect(within(pagas).getByText('Paga em 10/10/2026')).toBeInTheDocument();
    expect(within(pagas).queryByRole('link', { name: /Boleto/ })).toBeNull(); // paga não mostra boleto
    expect(screen.getByText('próxima em 10/12/2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Falar com o financeiro/ }).getAttribute('href')).toContain('5534999990000');
    expect(fetchMock).toHaveBeenCalledWith('cenas', '/my-finance');
  });

  it('CT-G04 sem vínculo avisa; erro do servidor aparece', async () => {
    fetchMock.mockResolvedValueOnce({ whatsapp_finance: null, linked: false, installments: [], summary: null });
    const { unmount } = render(<StudentFinance />);
    expect(await screen.findByText(/ainda não foi ligado ao financeiro/)).toBeInTheDocument();
    unmount();
    fetchMock.mockRejectedValueOnce(new Error('O financeiro não está ligado nesta escola.'));
    render(<StudentFinance />);
    expect(await screen.findByText('O financeiro não está ligado nesta escola.')).toBeInTheDocument();
  });

  it('CT-G05 agrupa e ordena; canceladas ficam de fora; data sem fuso', () => {
    const g = groupInstallments([
      inst({ id: '1', status: 'aberta', due_date: '2027-01-10' }), inst({ id: '2', status: 'aberta', due_date: '2026-12-10' }),
      inst({ id: '3', status: 'cancelada' }), inst({ id: '4', status: 'paga', due_date: '2026-09-10' }), inst({ id: '5', status: 'paga', due_date: '2026-10-10' }),
    ]);
    expect(g.abertas.map((i) => i.id)).toEqual(['2', '1']);
    expect(g.pagas.map((i) => i.id)).toEqual(['5', '4']);
    expect([...g.vencidas, ...g.abertas, ...g.pagas].some((i) => i.id === '3')).toBe(false);
    expect(formatDateBR('2026-01-01')).toBe('01/01/2026');
  });
});
