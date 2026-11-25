'use client';

// Gestor: avisos da escola por turma (fase 9). Criar/editar (texto, imagem,
// link, importante = pop-up "Entendi", expiração), arquivar e ver quem leu.

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCheck, Eye, ImagePlus, Loader2, Megaphone, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { createClient } from '@/lib/supabase/client';
import { useOrgClasses } from '@/lib/org-classes';
import { ClassVisibilityPicker } from '@/components/partners/ClassVisibilityPicker';
import { commsFetch, type AnnouncementReads, type SchoolAnnouncement } from '@/lib/org-comms';

const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white';

interface Draft {
  id?: string;
  title: string;
  body: string;
  link_url: string;
  image_url: string;
  is_important: boolean;
  expires_at: string;
  visible_class_ids: string[];
}

const EMPTY: Draft = { title: '', body: '', link_url: '', image_url: '', is_important: false, expires_at: '', visible_class_ids: [] };

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/** ISO (UTC) → valor de <input type=datetime-local> no fuso do navegador. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function SchoolAnnouncements() {
  const { org } = useOrg();
  const slug = org.slug;
  const { classes } = useOrgClasses(slug);
  const [items, setItems] = useState<SchoolAnnouncement[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [readsOf, setReadsOf] = useState<{ ann: SchoolAnnouncement; data: AnnouncementReads | null } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await commsFetch<{ announcements: SchoolAnnouncement[] }>(slug, '/announcements');
      setItems(r.announcements);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao carregar.'); setItems([]); }
  }, [slug]);
  useEffect(() => { void load(); }, [load]);

  const className = (ids: string[] | null) =>
    !ids ? 'Todas as turmas' : ids.map((id) => classes.find((c) => c.id === id)?.name ?? 'Turma').join(', ');

  async function upload(file: File) {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { toast.error('Use PNG, JPG ou WEBP.'); return; }
    if (file.size > 3 * 1024 * 1024) { toast.error('A imagem deve ter no máximo 3MB.'); return; }
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `announcements/${org.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('org-logos').upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from('org-logos').getPublicUrl(path);
      setDraft((d) => (d ? { ...d, image_url: data.publicUrl } : d));
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro no upload.'); } finally { setUploading(false); }
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    const body = {
      title: draft.title, body: draft.body, link_url: draft.link_url.trim() || null, image_url: draft.image_url || null,
      is_important: draft.is_important, expires_at: draft.expires_at || null,
      visible_class_ids: draft.visible_class_ids.length ? draft.visible_class_ids : null,
    };
    try {
      if (draft.id) await commsFetch(slug, `/announcements/${draft.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      else await commsFetch(slug, '/announcements', { method: 'POST', body: JSON.stringify(body) });
      toast.success(draft.id ? 'Aviso atualizado.' : 'Aviso publicado.');
      setDraft(null);
      void load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar.'); } finally { setBusy(false); }
  }

  async function archive(a: SchoolAnnouncement) {
    if (!window.confirm(`Tirar "${a.title}" do ar? Os alunos deixam de ver.`)) return;
    try { await commsFetch(slug, `/announcements/${a.id}`, { method: 'DELETE' }); toast.success('Aviso arquivado.'); void load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Erro.'); }
  }

  async function openReads(a: SchoolAnnouncement) {
    setReadsOf({ ann: a, data: null });
    try { setReadsOf({ ann: a, data: await commsFetch<AnnouncementReads>(slug, `/announcements/${a.id}/reads`) }); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Erro.'); setReadsOf(null); }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900 dark:text-white"><Megaphone className="h-6 w-6" /> Avisos</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-white/55">Aparecem no sino dos alunos. Importantes abrem um pop-up com &quot;Entendi&quot;.</p>
        </div>
        <button type="button" onClick={() => setDraft({ ...EMPTY })}
          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white" style={{ background: 'var(--brand-primary)' }}>
          <Plus className="h-4 w-4" /> Novo aviso
        </button>
      </div>

      {draft && (
        <section className="mt-5 space-y-3 rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5" aria-label="Editor de aviso">
          <input aria-label="Título" className={input} placeholder="Título" maxLength={120} value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <textarea aria-label="Texto" className={`${input} min-h-[110px]`} placeholder="Texto do aviso" maxLength={4000} value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <input aria-label="Link" className={input} placeholder="Link (opcional, https://...)" value={draft.link_url}
              onChange={(e) => setDraft({ ...draft, link_url: e.target.value })} />
            <label className="text-xs font-semibold text-slate-600 dark:text-white/70">Sai do ar em (opcional)
              <input aria-label="Expira em" type="datetime-local" className={`${input} mt-1`} value={draft.expires_at}
                onChange={(e) => setDraft({ ...draft, expires_at: e.target.value })} />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {draft.image_url ? (
              <span className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={draft.image_url} alt="" className="h-20 rounded-xl object-cover" />
                <button type="button" aria-label="Remover imagem" onClick={() => setDraft({ ...draft, image_url: '' })}
                  className="absolute -right-2 -top-2 rounded-full bg-slate-900 p-1 text-white"><X className="h-3 w-3" /></button>
              </span>
            ) : (
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-white/20 dark:text-white/70">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} Imagem (opcional)
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" aria-label="Imagem"
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void upload(f); }} />
              </label>
            )}
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-white/80">
              <input type="checkbox" checked={draft.is_important} onChange={(e) => setDraft({ ...draft, is_important: e.target.checked })} />
              Importante (pop-up com &quot;Entendi&quot;)
            </label>
          </div>
          <ClassVisibilityPicker classes={classes} value={draft.visible_class_ids} onChange={(ids) => setDraft({ ...draft, visible_class_ids: ids })} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDraft(null)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500">Cancelar</button>
            <button type="button" disabled={busy || uploading || !draft.title.trim() || !draft.body.trim()} onClick={() => void save()}
              className="rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50" style={{ background: 'var(--brand-primary)' }}>
              {draft.id ? 'Salvar' : 'Publicar'}
            </button>
          </div>
        </section>
      )}

      <div className="mt-5 space-y-3">
        {items === null ? (
          <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
        ) : items.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-white/5 dark:text-white/70">Nenhum aviso publicado.</p>
        ) : items.map((a) => (
          <article key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  {a.is_important && <AlertTriangle className="h-4 w-4 text-amber-500" aria-label="Importante" />}{a.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-white/50">{fmt(a.created_at)} · {className(a.visible_class_ids)}{a.expires_at ? ` · sai do ar ${fmt(a.expires_at)}` : ''}</p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => void openReads(a)} data-testid={`reads-${a.id}`}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-white/80">
                  <Eye className="h-3.5 w-3.5" /> {a.read_count ?? 0}/{a.audience ?? 0}
                  {a.is_important && <><CheckCheck className="ml-1 h-3.5 w-3.5" /> {a.ack_count ?? 0}</>}
                </button>
                <button type="button" aria-label="Editar" className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
                  onClick={() => setDraft({ id: a.id, title: a.title, body: a.body, link_url: a.link_url ?? '', image_url: a.image_url ?? '',
                    is_important: a.is_important, expires_at: toLocalInput(a.expires_at), visible_class_ids: a.visible_class_ids ?? [] })}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" aria-label="Arquivar" onClick={() => void archive(a)} className="rounded-full p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-slate-600 dark:text-white/70">{a.body}</p>
          </article>
        ))}
      </div>

      {readsOf && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setReadsOf(null)}>
          <div role="dialog" aria-label="Quem leu" onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-slate-900 dark:text-white">Quem leu: {readsOf.ann.title}</h2>
              <button type="button" aria-label="Fechar" onClick={() => setReadsOf(null)}><X className="h-4 w-4" /></button>
            </div>
            {!readsOf.data ? <Loader2 className="mt-4 h-5 w-5 animate-spin" /> : (
              <>
                <p className="mt-1 text-xs text-slate-500">
                  {readsOf.data.read_count} de {readsOf.data.audience} leram{readsOf.ann.is_important ? ` · ${readsOf.data.ack_count} deram "Entendi"` : ''}
                </p>
                <ul className="mt-3 divide-y divide-slate-100 dark:divide-white/10">
                  {readsOf.data.people.map((p) => (
                    <li key={p.user_id} className="flex items-center justify-between py-2 text-sm">
                      <span className={p.read_at ? 'text-slate-800 dark:text-white' : 'text-slate-400'}>{p.name ?? 'Aluno'}</span>
                      <span className="text-xs text-slate-500">
                        {p.acknowledged_at ? `Entendi ${fmt(p.acknowledged_at)}` : p.read_at ? `Leu ${fmt(p.read_at)}` : 'Não leu'}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
