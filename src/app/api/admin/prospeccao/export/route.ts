import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

export const dynamic = 'force-dynamic';

function escapeCsv(value: string | null | undefined): string {
  const str = value ?? '';
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const uf          = searchParams.get('uf');
  const statusList  = searchParams.getAll('status');
  const has_email   = searchParams.get('has_email') === '1';
  const has_phone   = searchParams.get('has_phone') === '1';
  const search      = searchParams.get('search');
  const temperature = searchParams.get('temperature');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = auth.supabaseAdmin as any;

  let query = db
    .from('leads')
    .select('cnpj, razao_social, nome_fantasia, uf, municipio, telefone1, telefone2, email, nome_socio, data_abertura, status_crm, temperature, source_channel, observacoes, created_at')
    .order('created_at', { ascending: false });

  if (uf)               query = query.eq('uf', uf);
  if (statusList.length) query = query.in('status_crm', statusList);
  if (temperature)      query = query.eq('temperature', temperature);
  if (has_email)   query = query.not('email', 'is', null);
  if (has_phone)   query = query.or('telefone1.not.is.null,telefone2.not.is.null');
  if (search) {
    const q = search.replace(/'/g, "''");
    query = query.or(`nome_fantasia.ilike.%${q}%,razao_social.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const HEADERS = [
    'CNPJ',
    'Razão Social',
    'Nome Fantasia',
    'UF',
    'Município',
    'Telefone 1',
    'Telefone 2',
    'Email',
    'Responsável',
    'Data Abertura',
    'Status CRM',
    'Temperatura',
    'Canal de Origem',
    'Observações',
    'Criado em',
  ];

  const rows = (data ?? []).map((l: Record<string, unknown>) => [
    escapeCsv(l.cnpj as string),
    escapeCsv(l.razao_social as string),
    escapeCsv(l.nome_fantasia as string),
    escapeCsv(l.uf as string),
    escapeCsv(l.municipio as string),
    escapeCsv(l.telefone1 as string),
    escapeCsv(l.telefone2 as string),
    escapeCsv(l.email as string),
    escapeCsv(l.nome_socio as string),
    escapeCsv(l.data_abertura as string),
    escapeCsv(l.status_crm as string),
    escapeCsv(l.temperature as string),
    escapeCsv(l.source_channel as string),
    escapeCsv(l.observacoes as string),
    escapeCsv(l.created_at as string),
  ]);

  const csv = [HEADERS.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
  const date = new Date().toISOString().split('T')[0];

  return new Response('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leads_${date}.csv"`,
    },
  });
}
