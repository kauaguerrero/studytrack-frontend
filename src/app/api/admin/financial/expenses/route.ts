import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  const { category, description, amount_brl, reference_month } = body as Record<string, unknown>;

  if (!category || !amount_brl || !reference_month) {
    return NextResponse.json({ error: 'category, amount_brl e reference_month são obrigatórios' }, { status: 400 });
  }

  const validCategories = ['flyio', 'google_cloud', 'mathpix', 'whatsapp', 'other'];
  if (!validCategories.includes(String(category))) {
    return NextResponse.json({ error: 'category inválido' }, { status: 400 });
  }

  // reference_month vem como "YYYY-MM" do <input type="month">, convertemos para primeiro dia do mês
  const refMonth = String(reference_month);
  const referenceDate = refMonth.length === 7 ? `${refMonth}-01` : refMonth;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (auth.supabaseAdmin as any)
    .from('financial_expenses')
    .insert({
      category: String(category),
      description: description ? String(description) : null,
      amount_brl: Number(amount_brl),
      reference_month: referenceDate,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
