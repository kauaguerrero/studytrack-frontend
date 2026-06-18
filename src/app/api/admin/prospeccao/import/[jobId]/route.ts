import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ jobId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { jobId } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = auth.supabaseAdmin as any;

  const { data: job, error } = await db
    .from('prospeccao_import_jobs')
    .select(
      'id, status, current_keyword, keywords_total, keywords_done, leads_found, leads_imported, leads_skipped, progress_pct, error'
    )
    .eq('id', jobId)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 });
  }

  return NextResponse.json({
    job_id:          job.id,
    status:          job.status,
    current_keyword: job.current_keyword,
    keywords_total:  job.keywords_total,
    keywords_done:   job.keywords_done,
    leads_found:     job.leads_found,
    leads_imported:  job.leads_imported,
    leads_skipped:   job.leads_skipped,
    progress_pct:    job.progress_pct,
    error:           job.error,
  });
}
