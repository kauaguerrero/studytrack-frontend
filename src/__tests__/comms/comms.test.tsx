// Fase 9: avisos da escola (gestor), pop-up "Entendi", calendário e links.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const fetchMock = vi.fn();
vi.mock('@/lib/org-classes', () => ({
  classesFetch: (...a: unknown[]) => fetchMock(...a),
  useOrgClasses: () => ({ classes: [{ id: 't1', name: 'Turma A' }, { id: 't2', name: 'Turma B' }] }),
}));
vi.mock('@/contexts/OrgContext', () => ({
  useOrg: () => ({ org: { id: 'org1', slug: 'cenas', name: 'Cenas', permissions: {} } }),
}));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ storage: { from: () => ({}) } }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { SchoolAnnouncements, toLocalInput } from '@/components/comms/SchoolAnnouncements';
import { ImportantAnnouncementPopup } from '@/components/comms/ImportantAnnouncementPopup';
import { SchoolCalendar, monthGrid } from '@/components/comms/SchoolCalendar';
import { StudentLinkViewer } from '@/components/comms/SchoolLinks';
import { whatsappHref } from '@/lib/org-comms';

beforeEach(() => { fetchMock.mockReset(); });

describe('avisos', () => {
  it('CT-A01 gestor publica aviso importante só para a Turma A', async () => {
    fetchMock.mockImplementation((_s: string, path: string, init?: RequestInit) => {
      if (path === '/announcements' && !init?.method) return Promise.resolve({ announcements: [] });
      if (path === '/announcements' && init?.method === 'POST') return Promise.resolve({ announcement: { id: 'n1' } });
      return Promise.reject(new Error(path));
    });
    render(<SchoolAnnouncements />);
    fireEvent.click(await screen.findByRole('button', { name: /Novo aviso/ }));
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Prova sábado' } });
    fireEvent.change(screen.getByLabelText('Texto'), { target: { value: 'Chegue 7h.' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Importante/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Turma A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));
    await waitFor(() => expect(fetchMock.mock.calls.some((c) => c[2]?.method === 'POST')).toBe(true));
    const body = JSON.parse(fetchMock.mock.calls.find((c) => c[2]?.method === 'POST')![2].body);
    expect(body).toMatchObject({ title: 'Prova sábado', body: 'Chegue 7h.', is_important: true, visible_class_ids: ['t1'], link_url: null });
  });

  it('CT-A02 lista mostra lidos/público e abre quem leu', async () => {
    fetchMock.mockImplementation((_s: string, path: string) => {
      if (path === '/announcements') return Promise.resolve({ announcements: [
        { id: 'a1', title: 'Prova', body: 'x', image_url: null, link_url: null, is_important: true, visible_class_ids: ['t2'],
          expires_at: null, created_at: '2026-11-25T12:00:00Z', audience: 3, read_count: 2, ack_count: 1 }] });
      if (path === '/announcements/a1/reads') return Promise.resolve({ audience: 3, read_count: 2, ack_count: 1, people: [
        { user_id: 'u3', name: 'Caio', read_at: null, acknowledged_at: null },
        { user_id: 'u1', name: 'Ana', read_at: '2026-11-25T13:00:00Z', acknowledged_at: '2026-11-25T13:01:00Z' }] });
      return Promise.reject(new Error(path));
    });
    render(<SchoolAnnouncements />);
    expect(await screen.findByText(/Turma B/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reads-a1'));
    const dlg = await screen.findByRole('dialog', { name: 'Quem leu' });
    expect(await within(dlg).findByText('Não leu')).toBeInTheDocument();
    expect(within(dlg).getByText(/2 de 3 leram · 1 deram "Entendi"/)).toBeInTheDocument();
  });

  it('CT-A03 pop-up importante confirma com Entendi', () => {
    const onAck = vi.fn();
    render(<ImportantAnnouncementPopup organizationName="Cenas" onAcknowledge={onAck}
      announcement={{ id: 'a1', title: 'Prova sábado', body: 'Chegue 7h.', image_url: null, link_url: 'https://cenas.com.br', source: 'school' }} />);
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Aviso importante · Cenas');
    expect(screen.getByRole('link', { name: /Saiba mais/ })).toHaveAttribute('href', 'https://cenas.com.br');
    fireEvent.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(onAck).toHaveBeenCalledOnce();
  });

  it('CT-A04 helpers', () => {
    expect(whatsappHref('5534999998888')).toBe('https://wa.me/5534999998888');
    expect(whatsappHref(null)).toBeNull();
    expect(toLocalInput('2026-12-01T13:00:00Z')).toBe('2026-12-01T10:00'); // TZ dos testes: São Paulo
  });
});

describe('calendário e links', () => {
  it('CT-C01 grade do mês começa no domingo e tem 6 semanas', () => {
    const g = monthGrid(2026, 11); // dezembro/2026 começa numa terça
    expect(g).toHaveLength(42);
    expect(g[0].getDay()).toBe(0);
    expect(g[2].getDate()).toBe(1);
  });

  it('CT-C02 dia selecionado lista eventos e simulados', async () => {
    const today = new Date();
    const at = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 19, 0).toISOString();
    fetchMock.mockResolvedValue({ items: [
      { id: 'e1', source: 'event', kind: 'evento', title: 'Aulão', description: null, starts_at: at, ends_at: null, all_day: false,
        location: 'Auditório', link_url: null, visible_class_ids: null },
      { id: 's1', source: 'simulado', kind: 'prova', title: 'Simulado ENEM', description: null, starts_at: at, ends_at: null, all_day: false,
        location: null, link_url: null, visible_class_ids: null }] });
    render(<SchoolCalendar />);
    const day = await screen.findByRole('region', { name: 'Eventos do dia' });
    expect(await within(day).findByText('Aulão')).toBeInTheDocument();
    expect(within(day).getByText('Simulado ENEM')).toBeInTheDocument();
    expect(within(day).getByText('Auditório')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Novo evento/ })).toBeNull(); // aluno não edita
    expect(fetchMock.mock.calls[0][1]).toMatch(/^\/calendar\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}$/);
  });

  it('CT-L01 link que aceita iframe abre dentro; o que não aceita só em nova aba', async () => {
    fetchMock.mockResolvedValue({ links: [
      { id: 'l1', title: 'Drive', url: 'https://drive.example.com', icon: 'link', embeddable: true, embed_reason: null },
      { id: 'l2', title: 'Plurall', url: 'https://plurall.net', icon: 'link', embeddable: false, embed_reason: 'Bloqueia iframe.' }] });
    const { unmount } = render(<StudentLinkViewer linkId="l1" />);
    expect(await screen.findByTitle('Drive')).toHaveAttribute('src', 'https://drive.example.com');
    expect(screen.getByRole('link', { name: /Abrir em nova aba/ })).toHaveAttribute('target', '_blank');
    unmount();
    render(<StudentLinkViewer linkId="l2" />);
    expect(await screen.findByText('Bloqueia iframe.')).toBeInTheDocument();
    expect(screen.queryByTitle('Plurall')).toBeNull();
  });
});
