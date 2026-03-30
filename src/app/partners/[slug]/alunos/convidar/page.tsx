'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Upload, Copy, Check, AlertCircle, FileSpreadsheet, RefreshCw } from 'lucide-react';
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
    setImporting(true);
    setResult(null);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const formData = new FormData();
    formData.append('file', fileInputRef.current.files[0]);

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
      <div className="space-y-6 max-w-2xl">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2">
          <Link href={`/partners/${org.slug}/alunos`}>
            <ArrowLeft className="h-4 w-4" /> Voltar para Alunos
          </Link>
        </Button>

        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Adicionar Alunos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Importe via CSV ou compartilhe o link de convite</p>
        </div>

        {/* Link de convite */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Link de Convite</CardTitle>
            <CardDescription>Compartilhe com os alunos para cadastro direto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
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
          </CardContent>
        </Card>

        {/* Import CSV */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Importação em Massa (CSV / Excel)
            </CardTitle>
            <CardDescription>
              Faça upload de uma planilha com as colunas <code className="bg-slate-100 px-1 rounded text-xs">nome</code> e{' '}
              <code className="bg-slate-100 px-1 rounded text-xs">email</code>. Alunos que já têm conta serão vinculados automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop zone */}
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-[var(--brand-primary)] transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
              {fileName ? (
                <p className="text-sm font-medium text-slate-700">{fileName}</p>
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
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{validRows.length} válido{validRows.length !== 1 ? 's' : ''}</span>
                  {invalidRows.length > 0 && (
                    <span className="text-rose-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {invalidRows.length} linha{invalidRows.length !== 1 ? 's' : ''} com email inválido serão ignoradas
                    </span>
                  )}
                </div>
                <div className="rounded-lg border overflow-hidden max-h-52 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">Nome</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">Email</th>
                        <th className="px-3 py-2 text-center font-medium text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {csvRows.slice(0, 50).map((row, i) => (
                        <tr key={i} className={row.valid ? '' : 'bg-rose-50 dark:bg-rose-950/20'}>
                          <td className="px-3 py-1.5">{row.name || '—'}</td>
                          <td className="px-3 py-1.5 font-mono">{row.email}</td>
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

            <Button
              className="w-full gap-2 text-white"
              style={{ backgroundColor: 'var(--brand-primary)' }}
              disabled={validRows.length === 0 || importing}
              onClick={handleImport}
            >
              <Upload className="h-4 w-4" />
              {importing
                ? 'Importando...'
                : `Importar ${validRows.length} aluno${validRows.length !== 1 ? 's' : ''}`}
            </Button>

            {/* Resultado da importação */}
            {result && (
              <div className="rounded-lg border p-4 space-y-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-white">Resultado da importação</p>
                <div className="flex gap-4 text-sm">
                  <span className="text-emerald-600 font-medium">✓ {result.imported} novos convites enviados</span>
                  <span className="text-blue-600 font-medium">⟳ {result.linked} contas vinculadas</span>
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
          </CardContent>
        </Card>
      </div>
    </PartnerLayout>
  );
}
