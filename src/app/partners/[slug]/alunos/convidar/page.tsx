'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import {
  RevealGroup, RevealItem, ElevatedCard, SectionTitle, BrandButton, BrandHero, HERO_ACCENT_COLOR,
} from '@/components/partners/founder-ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft, Upload, Copy, Check, AlertCircle, FileSpreadsheet,
  RefreshCw, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';

interface ImportResult {
  imported: number;
  linked: number;
  errors: { row: number; email: string; reason: string }[];
}

interface CsvRow {
  name: string;
  email: string;
  valid: boolean;
}

export default function ConvidarAlunosPage() {
  const { org } = useOrg();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [refreshingCode, setRefreshingCode] = useState(false);
  const [inviteCode, setInviteCode] = useState(org.invite_code ?? '');
  const [defaultPassword, setDefaultPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/partners/${org.slug}/register?code=${inviteCode}`;

  function parseCsv(text: string): CsvRow[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];

    // Detecta separador
    const sep = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));

    const nameIdx = headers.findIndex((h) => ['nome', 'full_name', 'name'].includes(h));
    const emailIdx = headers.findIndex((h) => ['email', 'e-mail', 'e_mail'].includes(h));

    if (emailIdx === -1) return [];

    return lines.slice(1).map((line) => {
      const cols = line.split(sep).map((c) => c.trim().replace(/^["']|["']$/g, ''));
      const email = cols[emailIdx] ?? '';
      const name = nameIdx !== -1 ? (cols[nameIdx] ?? '') : '';
      return {
        name,
        email,
        valid: Boolean(email && email.includes('@')),
      };
    }).filter((r) => r.email);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvRows(parseCsv(text));
    };
    reader.readAsText(file, 'utf-8');
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.name.endsWith('.csv')) {
      toast.error('Apenas arquivos .csv são aceitos.');
      return;
    }
    const dt = new DataTransfer();
    dt.items.add(file);
    if (fileInputRef.current) fileInputRef.current.files = dt.files;
    setFileName(file.name);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => setCsvRows(parseCsv(ev.target?.result as string));
    reader.readAsText(file, 'utf-8');
  }

  async function handleImport() {
    if (!fileInputRef.current?.files?.[0]) return;

    if (!defaultPassword || defaultPassword.length < 8) {
      toast.error('Defina uma senha padrão de pelo menos 8 caracteres.');
      return;
    }

    setImporting(true);
    setResult(null);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const formData = new FormData();
    formData.append('file', fileInputRef.current.files[0]);
    formData.append('default_password', defaultPassword);

    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    try {
      const res = await fetch(`${api}/api/partners/${org.slug}/students/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        // Limpa apenas o arquivo — mantém defaultPassword para exibir credenciais
        setCsvRows([]);
        setFileName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        const total = data.imported + data.linked;
        if (total > 0) {
          toast.success(`${total} aluno${total !== 1 ? 's' : ''} importado${total !== 1 ? 's' : ''} com sucesso!`);
        }
      } else {
        toast.error(data.error ?? 'Erro ao importar.');
      }
    } catch {
      toast.error('Erro de conexão ao importar.');
    } finally {
      setImporting(false);
    }
  }

  async function handleCopyInvite() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
    toast.success('Link copiado!');
  }

  async function handleRefreshCode() {
    setRefreshingCode(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    try {
      const res = await fetch(`${api}/api/partners/${org.slug}/invite/refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setInviteCode(data.invite_code);
        toast.success('Novo código gerado!');
      } else {
        toast.error('Erro ao gerar novo código.');
      }
    } catch {
      toast.error('Erro de conexão.');
    } finally {
      setRefreshingCode(false);
    }
  }

  const validRows = csvRows.filter((r) => r.valid);
  const invalidRows = csvRows.filter((r) => !r.valid);

  return (
    <PartnerLayout>
      <div className="edificar-page-canvas min-h-full -mx-4 -mt-4 px-4 pt-4 pb-8 md:-mx-8 md:-mt-8 md:px-8 md:pt-8 [--partner-surface-base:#ffffff] dark:[--partner-surface-base:#0f172a]">
        <RevealGroup className="edificar-page-frame mx-auto w-full max-w-4xl p-3 md:p-4">

        <RevealItem className="mb-3">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2">
            <Link href={`/partners/${org.slug}/alunos`}>
              <ArrowLeft className="h-4 w-4" /> Voltar para Alunos
            </Link>
          </Button>
        </RevealItem>

        <RevealItem className="mb-5">
          <BrandHero>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/50">
              <FileSpreadsheet className="mr-1.5 inline h-3.5 w-3.5" style={{ color: HERO_ACCENT_COLOR }} />
              Entrada de alunos
            </p>
            <h1 className="font-display text-[28px] font-black text-white lg:text-[34px]">Adicionar Alunos</h1>
            <p className="mt-1 max-w-xl text-[13px] text-white/60">
              Importe via CSV ou compartilhe o link de convite em um fluxo mais leve e centralizado.
            </p>
          </BrandHero>
        </RevealItem>

        <div className="flex flex-col gap-5">

        {/* Link de convite */}
        <RevealItem>
        <ElevatedCard accentColor="var(--brand-primary)" className="edificar-major-surface">
          <div className="p-5">
            <SectionTitle kicker="Convite" title="Link de Convite" hex={org.brand_primary} />
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input readOnly value={inviteUrl} className="text-xs text-slate-500 font-mono flex-1" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyInvite}
                  className="shrink-0"
                  title="Copiar link"
                >
                  {copiedInvite ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefreshCode}
                  disabled={refreshingCode}
                  className="shrink-0"
                  title="Gerar novo código (invalida o anterior)"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshingCode ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <p className="text-xs text-slate-400">
                Ao clicar no link, o aluno é direcionado para criar uma conta vinculada a {org.name}.
                Gere um novo código para invalidar o link atual.
              </p>
            </div>
          </div>
        </ElevatedCard>
        </RevealItem>

        {/* Import CSV */}
        <RevealItem>
        <ElevatedCard accentColor="var(--brand-secondary)" className="edificar-major-surface">
          <div className="p-5">
            <SectionTitle
              kicker="Importação"
              title="Importação em Massa (CSV / Excel)"
              hex={org.brand_secondary}
              action={
                <p className="max-w-[240px] text-right text-[11px] text-slate-400 dark:text-white/40">
                  Colunas <code className="rounded bg-slate-100 px-1 text-[10px] dark:bg-slate-800">nome</code> e{' '}
                  <code className="rounded bg-slate-100 px-1 text-[10px] dark:bg-slate-800">email</code>. Alunos com conta são vinculados automaticamente.
                </p>
              }
            />
            <div className="space-y-4">
            {/* Drop zone */}
            <div
              className="cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-8 text-center transition-colors hover:border-[var(--brand-primary)] dark:border-slate-700 dark:bg-white/5"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
              {fileName ? (
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{fileName}</p>
              ) : (
                <p className="text-sm text-slate-400">
                  Arraste um arquivo .csv aqui ou <span className="underline" style={{ color: 'var(--brand-primary)' }}>clique para selecionar</span>
                </p>
              )}
              <p className="text-xs text-slate-400 mt-1">Separador vírgula (,) ou ponto-e-vírgula (;) — exportado do Excel</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Preview das linhas */}
            {csvRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{validRows.length} válido{validRows.length !== 1 ? 's' : ''}</span>
                  {invalidRows.length > 0 && (
                    <span className="text-rose-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {invalidRows.length} linha{invalidRows.length !== 1 ? 's' : ''} com email inválido {invalidRows.length !== 1 ? 'serão ignoradas' : 'será ignorada'}
                    </span>
                  )}
                </div>
                <div className="max-h-52 overflow-y-auto overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-white/5 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-500 dark:text-slate-300">Nome</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500 dark:text-slate-300">Email</th>
                        <th className="px-3 py-2 text-center font-medium text-slate-500 dark:text-slate-300">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-700">
                      {csvRows.slice(0, 50).map((row, i) => (
                        <tr key={i} className={row.valid ? '' : 'bg-rose-50 dark:bg-rose-950/20'}>
                          <td className="px-3 py-1.5 text-slate-700 dark:text-slate-200">{row.name || '—'}</td>
                          <td className="px-3 py-1.5 font-mono text-slate-700 dark:text-slate-200">{row.email}</td>
                          <td className="px-3 py-1.5 text-center">
                            {row.valid ? (
                              <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-600">OK</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs border-rose-300 text-rose-500">Inválido</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                      {csvRows.length > 50 && (
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-center text-slate-400">
                            + {csvRows.length - 50} linhas adicionais
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Senha padrão */}
            <div className="space-y-1.5 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Senha padrão para os alunos
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  value={defaultPassword}
                  onChange={e => setDefaultPassword(e.target.value)}
                  className="pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                             text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Todos os alunos importados receberão essa senha.
                Eles serão solicitados a trocar no primeiro acesso.
              </p>
            </div>

            <BrandButton
              className="w-full justify-center"
              hex={org.brand_primary}
              onClick={handleImport}
              disabled={validRows.length === 0 || importing}
            >
              <Upload className="h-4 w-4" />
              {importing
                ? 'Importando...'
                : `Importar ${validRows.length} aluno${validRows.length !== 1 ? 's' : ''}`}
            </BrandButton>

            {/* Credenciais após importação bem-sucedida */}
            {result && result.imported > 0 && (
              <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/40 dark:bg-emerald-900/20">
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  ✅ {result.imported} alunos importados com sucesso
                </p>
                <div className="space-y-2 rounded-lg border border-emerald-100 bg-white p-3 dark:border-emerald-500/30 dark:bg-slate-950/70">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide dark:text-slate-300">
                    Credenciais para repassar aos alunos:
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                      <p>🌐 <span className="font-mono">{inviteUrl}</span></p>
                      <p>🔑 Senha: <span className="font-mono font-bold">{defaultPassword}</span></p>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `Link: ${inviteUrl}\nSenha: ${defaultPassword}`
                        );
                        toast.success('Copiado!');
                      }}
                      className="shrink-0 p-2 rounded-lg bg-emerald-100
                                 hover:bg-emerald-200 transition-colors dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30"
                    >
                      <Copy size={14} className="text-emerald-700 dark:text-emerald-300" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Os alunos serão solicitados a trocar a senha no primeiro acesso.
                  </p>
                </div>
              </div>
            )}

            {/* Resultado completo (erros e vinculados) */}
            {result && (result.linked > 0 || result.errors.length > 0) && (
              <div className="space-y-2 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-700 dark:text-white">Detalhes da importação</p>
                <div className="flex gap-4 text-sm">
                  {result.linked > 0 && (
                    <span className="text-blue-600 dark:text-blue-400 font-medium">⟳ {result.linked} contas vinculadas</span>
                  )}
                </div>
                {result.errors.length > 0 && (
                  <div>
                    <p className="text-xs text-rose-500 font-medium mt-2 mb-1">
                      {result.errors.length} erro{result.errors.length !== 1 ? 's' : ''}:
                    </p>
                    <ul className="text-xs text-rose-500 space-y-0.5">
                      {result.errors.map((e, i) => (
                        <li key={i}>Linha {e.row}: {e.email} — {e.reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </ElevatedCard>
        </RevealItem>

        </div>
        </RevealGroup>
      </div>
    </PartnerLayout>
  );
}
