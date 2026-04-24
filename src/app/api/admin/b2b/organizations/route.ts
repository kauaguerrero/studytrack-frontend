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

  const orgList: any[] = orgs ?? [];
  const orgIds = orgList.map((org: any) => org.id);

  let foundersByOrg = new Map<string, any>();
  let studentCountByOrg = new Map<string, number>();

  if (orgIds.length > 0) {
    const [foundersRes, studentsRes] = await Promise.all([
      db
        .from('profiles')
        .select('id, full_name, email, avatar_url, organization_id')
        .in('organization_id', orgIds)
        .eq('role', 'founder'),
      db
        .from('profiles')
        .select('organization_id')
        .in('organization_id', orgIds)
        .eq('role', 'student'),
    ]);

    for (const founder of foundersRes.data ?? []) {
      const orgId = founder.organization_id as string | null;
      if (!orgId || foundersByOrg.has(orgId)) continue;
      foundersByOrg.set(orgId, {
        id: founder.id,
        full_name: founder.full_name,
        email: founder.email,
        avatar_url: founder.avatar_url,
      });
    }

    for (const student of studentsRes.data ?? []) {
      const orgId = student.organization_id as string | null;
      if (!orgId) continue;
      studentCountByOrg.set(orgId, (studentCountByOrg.get(orgId) ?? 0) + 1);
    }
  }

  const enriched = orgList.map((org: any) => ({
    ...org,
    founder: foundersByOrg.get(org.id) ?? null,
    student_count: studentCountByOrg.get(org.id) ?? 0,
  }));

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
