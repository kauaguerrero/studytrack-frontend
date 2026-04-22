import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const admin = createAdminClient();
  const { data: org } = await (admin as any)
    .from('organizations').select('id').eq('slug', slug).maybeSingle();
  if (!org) return NextResponse.json({ error: 'Org não encontrada' }, { status: 404 });

  const [{ data: prompts }, { data: submissions }] = await Promise.all([
    (admin as any)
      .from('essay_prompts')
      .select('id, title, description, support_items, created_at')
      .eq('org_id', org.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    (admin as any)
      .from('essay_prompt_submissions')
      .select('prompt_id')
      .eq('student_id', user.id)
      .eq('org_id', org.id),
  ]);

  const submittedPromptIds = new Set((submissions ?? []).map((s: any) => s.prompt_id));

  const enriched = (prompts ?? []).map((p: any) => ({
    ...p,
    submitted: submittedPromptIds.has(p.id),
  }));

  const completed = enriched.filter((p: any) => p.submitted).length;
  const total_active = enriched.length;

  return NextResponse.json({
    prompts: enriched,
    total_active,
    completed,
    all_completed: total_active > 0 && completed === total_active,
  });
}
