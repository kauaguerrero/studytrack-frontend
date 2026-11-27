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
import { StudentCpfCard } from '@/components/integrations/StudentCpfCard';
import { formatCpfInput, formatDateBR, groupInstallments, isValidCpf, type Installment } from '@/lib/integrations';

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
      if (path === '/integrations/galileu/links/auto') return Promise.resolve({ linked_now: 1, linked_by_cpf: 0, linked_by_email: 1, without_match: 1, already_linked: 0 });
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
    fireEvent.click(screen.getByRole('button', { name: /Vincular por CPF e e-mail/ }));
    expect(await screen.findByText(/1 aluno\(s\) vinculado\(s\) \(0 pelo CPF, 1 pelo e-mail\)\. 1 sem correspondência/)).toBeInTheDocument();

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

describe('Galileu: CPF e sugestão pelo nome (P24)', () => {
  const linked = (over: Record<string, unknown> = {}) => ({ linked: 0, total: 2, suggestions: 1, cpf_pending: 1, students: [
    { user_id: 'u2', name: 'Beatriz Lima', email: 'bia@x.com', cpf: null, cpf_pending: null, link: null,
      suggestion: { id_aluno: '222', nome: 'BEATRIZ LIMA', email: null, rm: 'R2', cpf: null } },
    { user_id: 'u1', name: 'Ana', email: 'ana@x.com', cpf: null, cpf_pending: '***.456.789-**', link: null, suggestion: null },
  ], ...over });

  it('CT-G06 gestor confirma ou descarta a sugestão e aprova o CPF do aluno', async () => {
    fetchMock.mockImplementation((_s: string, path: string, init?: RequestInit) => {
      if (path === '/integrations/galileu') return Promise.resolve(status({ configured: true, key_source: 'org', key_last4: 'ABCD' }));
      if (path === '/integrations/galileu/links') return Promise.resolve(linked());
      if (path.endsWith('/suggestion/confirm') || path.endsWith('/suggestion/dismiss')) return Promise.resolve({ ok: true });
      if (path.endsWith('/cpf/approve')) return Promise.resolve({ ok: true, linked: true });
      return Promise.reject(new Error(`${init?.method} ${path}`));
    });
    render(<GalileuSettings />);
    expect(await screen.findByText(/1 sugestão\(ões\) pelo nome para confirmar · 1 CPF\(s\) informado\(s\) por alunos para aprovar/)).toBeInTheDocument();
    expect(screen.getByText('BEATRIZ LIMA')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Confirmar vínculo/ }));
    expect(await screen.findByText('Vínculo confirmado.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('cenas', '/integrations/galileu/links/u2/suggestion/confirm',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ external_student_id: '222' }) }));
    fireEvent.click(screen.getByRole('button', { name: /Descartar/ }));
    expect(await screen.findByText(/Sugestão descartada/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Aprovar CPF/ }));
    expect(await screen.findByText('CPF aprovado e aluno vinculado pelo CPF.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('cenas', '/integrations/galileu/links/u1/cpf/approve', expect.objectContaining({ method: 'POST' }));
  });

  it('CT-G07 gestor cadastra o CPF: só envia CPF válido', async () => {
    fetchMock.mockImplementation((_s: string, path: string) => {
      if (path === '/integrations/galileu') return Promise.resolve(status({ configured: true, key_source: 'org' }));
      if (path === '/integrations/galileu/links') return Promise.resolve(linked());
      if (path === '/integrations/galileu/links/u2/cpf') return Promise.resolve({ ok: true, linked: true });
      return Promise.reject(new Error(path));
    });
    render(<GalileuSettings />);
    fireEvent.click(await screen.findByRole('button', { name: 'CPF de Beatriz Lima' }));
    const dlg = screen.getByRole('dialog', { name: 'CPF do aluno' });
    const inp = within(dlg).getByLabelText('CPF do aluno');
    fireEvent.change(inp, { target: { value: '12345678900' } });
    expect(inp).toHaveValue('123.456.789-00');
    expect(within(dlg).getByText('CPF inválido.')).toBeInTheDocument();
    expect(within(dlg).getByRole('button', { name: /Salvar/ })).toBeDisabled();
    fireEvent.change(inp, { target: { value: '52998224725' } });
    fireEvent.click(within(dlg).getByRole('button', { name: /Salvar/ }));
    expect(await screen.findByText('CPF salvo e aluno vinculado pelo CPF.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('cenas', '/integrations/galileu/links/u2/cpf', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ cpf: '529.982.247-25' }) }));
  });

  it('CT-G08 aluno envia o CPF e vê que aguarda a aprovação', async () => {
    fetchMock.mockImplementation((_s: string, path: string, init?: RequestInit) =>
      Promise.resolve(init?.method === 'PUT' ? { cpf: null, pending: '***.982.247-**' } : { cpf: null, pending: null }));
    render(<StudentCpfCard />);
    const inp = await screen.findByLabelText('Seu CPF');
    fireEvent.change(inp, { target: { value: '529.982.247-25' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar CPF/ }));
    expect(await screen.findByText('CPF enviado. A escola precisa aprovar.')).toBeInTheDocument();
    expect(screen.getByText('***.982.247-**')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('cenas', '/my-cpf', expect.objectContaining({ method: 'PUT' }));
  });

  it('CT-G09 máscara e dígitos do CPF', () => {
    expect(formatCpfInput('5299822')).toBe('529.982.2');
    expect(formatCpfInput('52998224725999')).toBe('529.982.247-25');
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('529.982.247-24')).toBe(false);
  });
});
