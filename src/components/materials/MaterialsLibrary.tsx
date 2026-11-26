'use client';

// Biblioteca de material em PDF (fase 10). Aluno vê o da turma, agrupado por
// matéria; gestor (manage) envia PDF, escolhe matéria/turmas, edita e arquiva.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { FileText, Loader2, Pencil, Plus, StickyNote, Trash2, Upload, X } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { classesFetch, useOrgClasses } from '@/lib/org-classes';
import { ClassVisibilityPicker } from '@/components/partners/ClassVisibilityPicker';
import { MAX_PDF_BYTES, formatBytes, materialsFetch, uploadMaterial, type Material } from '@/lib/materials';

const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white';

interface Draft {
  id?: string;
  title: string;
  subject: string;
  discipline: string;
  description: string;
  visible_class_ids: string[];
  file: File | null;
}
const EMPTY: Draft = { title: '', subject: '', discipline: '', description: '', visible_class_ids: [], file: null };

export function MaterialsLibrary({ manage = false }: { manage?: boolean }) {
  const { org } = useOrg();
  const slug = org.slug;
  const base = manage ? `/partners/${slug}/materiais` : `/partners/${slug}/student/materiais`;
  const { classes } = useOrgClasses(slug, { enabled: manage });
  const [items, setItems] = useState<Material[] | null>(null);
  const [subjects, setSubjects] = useState<{ subject: string; display_name: string | null }[]>([]);
  const [filter, setFilter] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await materialsFetch<{ materials: Material[] }>(slug, '/materials');
      setItems(r.materials);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao carregar.'); setItems([]); }
  }, [slug]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    classesFetch<{ subjects: { subject: string; display_name: string | null }[] }>(slug, '/subjects')
      .then((r) => setSubjects(r.subjects ?? [])).catch(() => setSubjects([]));
  }, [slug]);

  const label = (s: string | null) => (s ? subjects.find((x) => x.subject === s)?.display_name || s : 'Geral');
  const groups = useMemo(() => {
    const m = new Map<string, Material[]>();
    for (const it of items ?? []) {
      if (filter && (it.subject ?? '') !== filter) continue;
      const k = it.subject ?? '';
      m.set(k, [...(m.get(k) ?? []), it]);
    }
    return [...m.entries()].sort(([a], [b]) => (a ? label(a) : '~').localeCompare(b ? label(b) : '~', 'pt-BR'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, filter, subjects]);
  const className = (ids: string[] | null) =>
    !ids ? 'Todas as turmas' : ids.map((id) => classes.find((c) => c.id === id)?.name ?? 'Turma').join(', ');

  function pick(f: File | undefined) {
    if (!f || !draft) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) { toast.error('Envie um arquivo PDF.'); return; }
    if (f.size > MAX_PDF_BYTES) { toast.error('O PDF deve ter no máximo 50MB.'); return; }
    setDraft({ ...draft, file: f, title: draft.title || f.name.replace(/\.pdf$/i, '').slice(0, 160) });
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    const fields = {
      title: draft.title.trim(), subject: draft.subject || null, discipline: draft.discipline.trim() || null,
      description: draft.description.trim() || null, visible_class_ids: draft.visible_class_ids.length ? draft.visible_class_ids : null,
    };
    try {
      if (draft.id) await materialsFetch(slug, `/materials/${draft.id}`, { method: 'PATCH', body: JSON.stringify(fields) });
      else if (draft.file) await uploadMaterial(slug, draft.file, fields);
      toast.success(draft.id ? 'Material atualizado.' : 'Material publicado.');
      setDraft(null);
      void load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar.'); } finally { setBusy(false); }
  }

  async function archive(m: Material) {
    if (!window.confirm(`Tirar "${m.title}" do ar? Os alunos deixam de ver (as anotações ficam guardadas).`)) return;
    try { await materialsFetch(slug, `/materials/${m.id}`, { method: 'DELETE' }); toast.success('Material arquivado.'); void load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Erro.'); }
  }

  const usedSubjects = [...new Set((items ?? []).map((i) => i.subject ?? ''))];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900 dark:text-white"><FileText className="h-6 w-6" /> Material</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-white/55">
            {manage ? 'PDFs por turma. O aluno lê e anota no próprio portal; as anotações são só dele.' : 'Abra o PDF para ler, grifar e comentar. Suas anotações ficam salvas só para você.'}
          </p>
        </div>
        {manage && (
          <button type="button" onClick={() => setDraft({ ...EMPTY })}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white" style={{ background: 'var(--brand-primary)' }}>
            <Plus className="h-4 w-4" /> Enviar PDF
          </button>
        )}
      </div>

      {usedSubjects.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por matéria">
          {['', ...usedSubjects.filter(Boolean)].map((s) => (
            <button key={s || 'all'} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === s ? 'text-white' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/70'}`}
              style={filter === s ? { background: 'var(--brand-primary)' } : undefined}>
              {s ? label(s) : 'Todas'}
            </button>
          ))}
        </div>
      )}

      {draft && (
        <section className="mt-5 space-y-3 rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5" aria-label="Editor de material">
          {!draft.id && (
            <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-600 dark:border-white/20 dark:text-white/70">
              <Upload className="h-5 w-5" />
              {draft.file ? `${draft.file.name} · ${formatBytes(draft.file.size)}` : 'Escolher PDF (até 50MB)'}
              <input type="file" accept="application/pdf,.pdf" className="hidden" aria-label="Arquivo PDF"
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; pick(f); }} />
            </label>
          )}
          <input aria-label="Título" className={input} placeholder="Título" maxLength={160} value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <select aria-label="Matéria" className={input} value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })}>
              <option value="">Geral (sem matéria)</option>
              {subjects.map((s) => <option key={s.subject} value={s.subject}>{s.display_name || s.subject}</option>)}
            </select>
            <input aria-label="Disciplina" className={input} placeholder="Disciplina (opcional)" maxLength={80} value={draft.discipline}
              onChange={(e) => setDraft({ ...draft, discipline: e.target.value })} />
          </div>
          <textarea aria-label="Descrição" className={`${input} min-h-[70px]`} placeholder="Descrição (opcional)" maxLength={2000} value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <ClassVisibilityPicker classes={classes} value={draft.visible_class_ids} onChange={(ids) => setDraft({ ...draft, visible_class_ids: ids })} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDraft(null)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500">Cancelar</button>
            <button type="button" disabled={busy || !draft.title.trim() || (!draft.id && !draft.file)} onClick={() => void save()}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50" style={{ background: 'var(--brand-primary)' }}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}{draft.id ? 'Salvar' : 'Publicar'}
            </button>
          </div>
        </section>
      )}

      <div className="mt-5 space-y-5">
        {items === null ? (
          <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
        ) : items.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-white/5 dark:text-white/70">
            {manage ? 'Nenhum PDF enviado ainda.' : 'A escola ainda não publicou material para a sua turma.'}
          </p>
        ) : groups.map(([subject, list]) => (
          <section key={subject || 'geral'} aria-label={label(subject || null)}>
            <h2 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-white/50">{label(subject || null)}</h2>
            <ul className="space-y-2">
              {list.map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
                  <Link href={`${base}/${m.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10"><FileText className="h-5 w-5" /></span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{m.title}</span>
                      <span className="block truncate text-xs text-slate-500 dark:text-white/55">
                        {[m.discipline, formatBytes(m.file_size), manage ? className(m.visible_class_ids) : null].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </Link>
                  {!!m.annotated_pages && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                      title="Páginas com anotação suas"><StickyNote className="h-3 w-3" /> {m.annotated_pages}</span>
                  )}
                  {manage && (
                    <span className="flex shrink-0 gap-1">
                      <button type="button" aria-label="Editar" className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
                        onClick={() => setDraft({ id: m.id, title: m.title, subject: m.subject ?? '', discipline: m.discipline ?? '',
                          description: m.description ?? '', visible_class_ids: m.visible_class_ids ?? [], file: null })}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" aria-label="Arquivar" onClick={() => void archive(m)} className="rounded-full p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {draft && <button type="button" className="sr-only" onClick={() => setDraft(null)} aria-label="Fechar editor"><X /></button>}
    </div>
  );
}
