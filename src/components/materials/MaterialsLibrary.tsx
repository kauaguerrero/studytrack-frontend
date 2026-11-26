'use client';

// Biblioteca de material em PDF (fase 10). Aluno vê o da turma, agrupado por
// matéria; gestor (manage) envia PDF, escolhe matéria/turmas, edita e arquiva.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { BookOpen, FileText, Highlighter, Loader2, MessageSquareText, Pencil, Plus, StickyNote, Trash2, Upload, X } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { classesFetch, useOrgClasses } from '@/lib/org-classes';
import { ClassVisibilityPicker } from '@/components/partners/ClassVisibilityPicker';
import { MAX_PDF_BYTES, formatBytes, materialsFetch, uploadMaterial, type Material } from '@/lib/materials';
import { EmptyState, PageShell, pageCard } from '@/components/partners/PageShell';

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
    <PageShell
      variant={manage ? 'founder' : 'student'}
      kicker={manage ? 'Ensino' : 'Estudar'}
      icon={FileText}
      title="Material"
      description={<>{manage ? 'PDFs por turma. O aluno lê e anota no próprio portal; as anotações são só dele.' : 'Abra o PDF para ler, grifar e comentar. Suas anotações ficam salvas só para você.'}</>}
      actions={<>
        {manage && (
          <button type="button" onClick={() => setDraft({ ...EMPTY })}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-extrabold text-white shadow-sm transition-transform hover:scale-[1.02]" style={{ background: 'var(--brand-primary)' }}>
            <Plus className="h-4 w-4" /> Enviar PDF
          </button>
        )}
      </>}
    >

      {usedSubjects.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por matéria">
          {['', ...usedSubjects.filter(Boolean)].map((s) => (
            <button key={s || 'all'} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition ${filter === s ? 'text-white shadow-sm' : 'bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-white/5 dark:text-white/70 dark:ring-white/10'}`}
              style={filter === s ? { background: 'var(--brand-primary)' } : undefined}>
              {s ? label(s) : 'Todas'}
            </button>
          ))}
        </div>
      )}

      {draft && (
        <section className="space-y-3 partner-elevated-card rounded-[20px] bg-white p-5 dark:bg-slate-900" aria-label="Editor de material">
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

      <div className="space-y-6">
        {items === null ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-[20px] bg-white dark:bg-white/5" />)}
          </div>
        ) : items.length === 0 ? (
          manage ? (
            <EmptyState icon={FileText} tone="brand" title="Nenhum PDF enviado ainda"
              description="Envie apostilas, listas e resumos. Você escolhe a turma; o aluno lê, grifa e comenta sem sair do portal."
              action={<button type="button" onClick={() => setDraft({ ...EMPTY })} className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-sm" style={{ background: 'var(--brand-primary)' }}><Plus className="h-4 w-4" /> Enviar o primeiro PDF</button>}
              preview={<MaterialPreview />} />
          ) : (
            <EmptyState icon={BookOpen} tone="brand" title="Seu material chega aqui"
              description="Quando a escola publicar apostilas e listas para a sua turma, elas aparecem nesta tela, separadas por matéria."
              steps={[
                <span key="1" className="inline-flex items-center gap-1.5"><Highlighter className="h-4 w-4 text-amber-500" /> Grife os trechos importantes</span>,
                <span key="2" className="inline-flex items-center gap-1.5"><MessageSquareText className="h-4 w-4 text-sky-500" /> Deixe comentários nas páginas</span>,
                <span key="3" className="inline-flex items-center gap-1.5"><StickyNote className="h-4 w-4 text-violet-500" /> Suas anotações ficam salvas só para você</span>,
              ]}
              preview={<MaterialPreview />} />
          )
        ) : groups.map(([subject, list]) => (
          <section key={subject || 'geral'} aria-label={label(subject || null)}>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="font-display text-[15px] font-black text-slate-900 dark:text-white">{label(subject || null)}</h2>
              <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">{list.length}</span>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((m) => (
                <li key={m.id} className={`${pageCard} group flex items-stretch transition-transform hover:-translate-y-0.5`}>
                  <Link href={`${base}/${m.id}`} className="flex min-w-0 flex-1 items-center gap-4 p-4">
                    {/* "folha" do PDF */}
                    <span aria-hidden className="relative flex h-[68px] w-[54px] shrink-0 flex-col gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-slate-800">
                      <span className="h-1 w-3/4 rounded-full bg-slate-300 dark:bg-white/25" />
                      <span className="h-1 w-full rounded-full bg-slate-200 dark:bg-white/10" />
                      <span className="h-1 w-5/6 rounded-full bg-slate-200 dark:bg-white/10" />
                      <span className="h-1 w-2/3 rounded-full bg-amber-200/90 dark:bg-amber-400/30" />
                      <span className="absolute -bottom-1.5 -right-1.5 rounded-md bg-red-500 px-1 py-px text-[8.5px] font-black text-white">PDF</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block line-clamp-2 text-[14.5px] font-bold leading-snug text-slate-900 dark:text-white">{m.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-white/55">
                        {[m.discipline, formatBytes(m.file_size), manage ? className(m.visible_class_ids) : null].filter(Boolean).join(' · ')}
                      </span>
                      {!!m.annotated_pages && (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                          title="Páginas com anotação suas"><StickyNote className="h-3 w-3" /> {m.annotated_pages} {m.annotated_pages === 1 ? 'página anotada' : 'páginas anotadas'}</span>
                      )}
                    </span>
                  </Link>
                  {manage && (
                    <span className="flex shrink-0 flex-col justify-center gap-1 pr-3">
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
    </PageShell>
  );
}

/** Prévia decorativa do estado vazio: uma página de apostila com grifo e comentário. */
function MaterialPreview() {
  return (
    <div className="relative mx-auto h-[260px] max-w-[400px]">
      <div className="absolute left-0 top-6 h-56 w-[62%] -rotate-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
        {[90, 100, 75, 95, 60].map((w, i) => <div key={i} className="mb-2.5 h-1.5 rounded-full bg-slate-200 dark:bg-white/10" style={{ width: `${w}%` }} />)}
      </div>
      <div className="absolute right-4 top-0 h-60 w-[64%] rotate-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg dark:border-white/10 dark:bg-slate-800">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Biologia · Apostila 3</p>
        <p className="font-display mt-1.5 text-[15px] font-black text-slate-900 dark:text-white">Citologia</p>
        <div className="mt-3 space-y-2">
          <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/10" />
          <div className="h-2.5 w-[85%] rounded bg-amber-200/90 dark:bg-amber-400/30" />
          <div className="h-1.5 w-[92%] rounded-full bg-slate-200 dark:bg-white/10" />
          <div className="h-1.5 w-[70%] rounded-full bg-slate-200 dark:bg-white/10" />
          <div className="h-2.5 w-[60%] rounded bg-sky-200/80 dark:bg-sky-400/25" />
          <div className="h-1.5 w-[88%] rounded-full bg-slate-200 dark:bg-white/10" />
        </div>
      </div>
      <div className="absolute -right-1 top-28 rotate-3 rounded-xl bg-amber-100 px-3 py-2 text-[11.5px] font-semibold text-amber-900 shadow-md dark:bg-amber-500/90">
        Cai no ENEM! revisar
      </div>
    </div>
  );
}
