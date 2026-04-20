import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const db = admin as any;

  const { data: orgs, error } = await db
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Para cada org: busca founder e contagem de alunos em paralelo
  const enriched = await Promise.all(
    (orgs ?? []).map(async (org: any) => {
      const [founderRes, countRes] = await Promise.all([
        db
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .eq('organization_id', org.id)
          .eq('role', 'founder')
          .maybeSingle(),
        db
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', org.id)
          .eq('role', 'student'),
      ]);
      return {
        ...org,
        founder: founderRes.data ?? null,
        student_count: countRes.count ?? 0,
      };
    })
  );

  return NextResponse.json({ organizations: enriched });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const {
    name, slug, plan_tier = 'b2b_basic', max_students = 200,
    contact_email, brand_primary = '#6366f1',
    brand_secondary = '#8b5cf6', brand_accent = '#f59e0b',
    permissions = {},
  } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: 'name e slug obrigatórios' }, { status: 400 });
  }

  const admin = createAdminClient();
  const db = admin as any;

  const { data: org, error } = await db
    .from('organizations')
    .insert({
      name,
      slug: slug.toLowerCase().trim(),
      plan_tier,
      max_students,
      contact_email: contact_email || null,
      brand_primary,
      brand_secondary,
      brand_accent,
      permissions,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ organization: org }, { status: 201 });
}
