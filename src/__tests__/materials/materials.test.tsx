// Fase 10: material em PDF por turma + anotações do aluno.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEffect } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const fetchMock = vi.fn();
vi.mock('@/lib/org-classes', () => ({
  classesFetch: (...a: unknown[]) => fetchMock(...a),
  useOrgClasses: () => ({ classes: [{ id: 't1', name: 'Turma A' }] }),
}));
vi.mock('@/contexts/OrgContext', () => ({
  useOrg: () => ({ org: { id: 'org1', slug: 'cenas', name: 'Cenas', permissions: { materiais_enabled: true } } }),
}));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('react-pdf', () => ({
  pdfjs: { GlobalWorkerOptions: {} },
  Document: ({ children, onLoadSuccess }: { children: React.ReactNode; onLoadSuccess: (d: { numPages: number }) => void }) => {
    useEffect(() => { onLoadSuccess({ numPages: 3 }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return <div data-testid="pdf-doc">{children}</div>;
  },
  Page: ({ pageNumber, onRenderSuccess }: { pageNumber: number; onRenderSuccess: (p: { width: number; height: number }) => void }) => {
    useEffect(() => { onRenderSuccess({ width: 600, height: 800 }); }, [pageNumber]); // eslint-disable-line react-hooks/exhaustive-deps
    return <div data-testid={`pdf-page-${pageNumber}`} />;
  },
}));

import { MaterialsLibrary } from '@/components/materials/MaterialsLibrary';
import PdfAnnotator from '@/components/materials/PdfAnnotator';
import { simplify, strokeHit } from '@/lib/materials';

// jsdom não tem PointerEvent: sem isso clientX/clientY chegam vazios.
if (typeof window !== 'undefined' && !('PointerEvent' in window)) {
  class PE extends MouseEvent { pointerId: number; constructor(t: string, init: PointerEventInit = {}) { super(t, init); this.pointerId = init.pointerId ?? 1; } }
  // @ts-expect-error polyfill de teste
  window.PointerEvent = PE;
}

beforeEach(() => { fetchMock.mockReset(); });

const mat = (over: Record<string, unknown>) => ({
  id: 'm1', title: 'Apostila', description: null, subject: 'mat', discipline: 'Funções', visible_class_ids: null,
  file_name: 'a.pdf', file_size: 2 * 1024 * 1024, page_count: null, position: 0, created_at: '2026-11-25T10:00:00Z', annotated_pages: 0, ...over,
});

describe('biblioteca de material', () => {
  it('CT-M01 aluno vê material agrupado por matéria, com páginas anotadas, sem editar', async () => {
    fetchMock.mockImplementation((_s: string, path: string) => {
      if (path === '/materials') return Promise.resolve({ materials: [mat({}), mat({ id: 'm2', title: 'Redação nota mil', subject: null, annotated_pages: 4 })] });
      if (path === '/subjects') return Promise.resolve({ subjects: [{ subject: 'mat', display_name: 'Matemática' }] });
      return Promise.reject(new Error(path));
    });
    render(<MaterialsLibrary />);
    const matSec = await screen.findByRole('region', { name: 'Matemática' });
    expect(within(matSec).getByRole('link', { name: /Apostila/ })).toHaveAttribute('href', '/partners/cenas/student/materiais/m1');
    expect(within(matSec).getByText(/Funções · 2,0 MB/)).toBeInTheDocument();
    const geral = screen.getByRole('region', { name: 'Geral' });
    expect(within(geral).getByTitle('Páginas com anotação suas')).toHaveTextContent('4');
    expect(screen.queryByRole('button', { name: /Enviar PDF/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Arquivar' })).toBeNull();
  });

  it('CT-M02 gestor envia PDF para uma turma (multipart) e recusa arquivo que não é PDF', async () => {
    fetchMock.mockImplementation((_s: string, path: string) => {
      if (path === '/materials') return Promise.resolve({ materials: [] });
      if (path === '/subjects') return Promise.resolve({ subjects: [{ subject: 'mat', display_name: 'Matemática' }] });
      return Promise.reject(new Error(path));
    });
    const netFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ material: mat({}) }) });
    vi.stubGlobal('fetch', netFetch);
    render(<MaterialsLibrary manage />);
    fireEvent.click(await screen.findByRole('button', { name: /Enviar PDF/ }));
    const fileInput = screen.getByLabelText('Arquivo PDF');
    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'foto.png', { type: 'image/png' })] } });
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeDisabled();
    fireEvent.change(fileInput, { target: { files: [new File(['%PDF-1.7'], 'Lista 3.pdf', { type: 'application/pdf' })] } });
    expect(screen.getByLabelText('Título')).toHaveValue('Lista 3');
    fireEvent.change(screen.getByLabelText('Matéria'), { target: { value: 'mat' } });
    fireEvent.click(screen.getByRole('button', { name: 'Turma A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));
    await waitFor(() => expect(netFetch).toHaveBeenCalled());
    const [url, init] = netFetch.mock.calls[0];
    expect(url).toMatch(/\/api\/partners\/cenas\/materials$/);
    const fd = init.body as FormData;
    expect(fd.get('title')).toBe('Lista 3');
    expect(fd.get('subject')).toBe('mat');
    expect(fd.get('visible_class_ids')).toBe('["t1"]');
    expect((fd.get('file') as File).name).toBe('Lista 3.pdf');
    expect(init.headers.Authorization).toBe('Bearer tok');
    vi.unstubAllGlobals();
  });
});

describe('leitor com anotações', () => {
  function setup(pages: Record<string, unknown> = {}) {
    fetchMock.mockImplementation((_s: string, path: string, init?: RequestInit) => {
      if (path === '/materials/m1/annotations') return Promise.resolve({ pages });
      if (path.startsWith('/materials/m1/annotations/') && init?.method === 'PUT') return Promise.resolve({ ok: true });
      return Promise.reject(new Error(path));
    });
    const r = render(<PdfAnnotator slug="cenas" materialId="m1" url="https://r2/x.pdf?sig" title="Apostila" />);
    return r;
  }
  const canvas = async () => {
    const c = await screen.findByTestId('annotation-canvas');
    c.getBoundingClientRect = () => ({ left: 0, top: 0, width: 600, height: 800, right: 600, bottom: 800, x: 0, y: 0, toJSON: () => ({}) });
    return c;
  };

  it('CT-M03 marca-texto vira traço normalizado e salva sozinho na página', async () => {
    setup();
    const c = await canvas();
    fireEvent.click(screen.getByRole('button', { name: 'Marca-texto' }));
    fireEvent.pointerDown(c, { clientX: 60, clientY: 80, pointerId: 1 });
    fireEvent.pointerMove(c, { clientX: 300, clientY: 80, pointerId: 1 });
    fireEvent.pointerMove(c, { clientX: 540, clientY: 80, pointerId: 1 });
    fireEvent.pointerUp(c, { pointerId: 1 });
    await waitFor(() => expect(fetchMock.mock.calls.some((x) => x[1] === '/materials/m1/annotations/1')).toBe(true), { timeout: 3000 });
    const body = JSON.parse(fetchMock.mock.calls.find((x) => x[1] === '/materials/m1/annotations/1')![2].body);
    expect(body.data.strokes).toHaveLength(1);
    expect(body.data.strokes[0]).toMatchObject({ t: 'hl', c: '#facc15', w: 16 });
    expect(body.data.strokes[0].p[0]).toEqual([0.1, 0.1]);
    expect(body.data.strokes[0].p.at(-1)).toEqual([0.9, 0.1]);
  });

  it('CT-M04 comentário, desfazer e anotações por página', async () => {
    setup({ '2': { strokes: [{ t: 'pen', c: '#111827', w: 2.5, p: [[0.5, 0.5], [0.6, 0.6]] }], notes: [] } });
    const c = await canvas();
    fireEvent.click(screen.getByRole('button', { name: 'Comentário' }));
    fireEvent.pointerDown(c, { clientX: 300, clientY: 400, pointerId: 1 });
    fireEvent.change(await screen.findByLabelText('Texto do comentário'), { target: { value: 'cai na prova' } });
    fireEvent.click(screen.getByRole('button', { name: 'Fechar comentário' }));
    expect(screen.getByRole('button', { name: 'Comentário: cai na prova' })).toBeInTheDocument();
    // desfazer remove a última mudança (o texto), de novo remove o alfinete
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(screen.queryByRole('button', { name: /^Comentário:/ })).toBeNull();
    // página 2 já tinha traço salvo; trocar de página salva a 1 na hora
    fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(screen.getByTestId('page-label')).toHaveTextContent('Página 2 de 3');
    await waitFor(() => expect(fetchMock.mock.calls.some((x) => x[1] === '/materials/m1/annotations/1')).toBe(true));
    expect(screen.getByRole('button', { name: 'Limpar página' })).not.toBeDisabled();
  });

  it('CT-M05 borracha acha o traço tocado e simplify enxuga pontos', () => {
    const strokes = [
      { t: 'pen' as const, c: '#000000', w: 2, p: [[0.1, 0.1], [0.3, 0.1]] as [number, number][] },
      { t: 'hl' as const, c: '#facc15', w: 16, p: [[0.1, 0.5], [0.9, 0.5]] as [number, number][] },
    ];
    expect(strokeHit(strokes, 0.2, 0.105)).toBe(0);
    expect(strokeHit(strokes, 0.5, 0.505)).toBe(1);
    expect(strokeHit(strokes, 0.5, 0.3)).toBe(-1);
    const pts: [number, number][] = Array.from({ length: 100 }, (_, i) => [0.1 + i * 0.0001, 0.2]);
    const s = simplify(pts);
    expect(s.length).toBeLessThan(10);
    expect(s[0]).toEqual([0.1, 0.2]);
  });
});
