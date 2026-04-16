import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { createAdminClient } from '@/lib/supabase/admin';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const OWNER = process.env.GITHUB_REPO_OWNER!;
const REPOS = (process.env.GITHUB_REPOS ?? '').split(',').map(r => r.trim()).filter(Boolean);
const WEEKS_BACK = 8;
const MAX_COMMIT_PAGES = 10;

function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function getSinceDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - WEEKS_BACK * 7);
  return d.toISOString().slice(0, 10);
}

async function ghFetch(url: string) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub API error ${res.status} ${res.statusText}: ${url}${body ? ` | ${body}` : ''}`);
  }
  return res.json();
}

function normalizeGithubIdentity(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/^@/, '').toLowerCase();
}

function commitMatchesUser(commit: any, username: string): boolean {
  const u = normalizeGithubIdentity(username);
  const authorLogin = normalizeGithubIdentity(commit?.author?.login);
  const committerLogin = normalizeGithubIdentity(commit?.committer?.login);
  const authorName = normalizeGithubIdentity(commit?.commit?.author?.name);
  const committerName = normalizeGithubIdentity(commit?.commit?.committer?.name);
  return [authorLogin, committerLogin, authorName, committerName].includes(u);
}

async function fetchCommitDates(repoPath: string, username: string, since: string): Promise<Array<{ date?: string }>> {
  // Fast path: usa filtro de author quando login/email está associado no GitHub.
  const byAuthor = await ghFetch(
    `https://api.github.com/repos/${repoPath}/commits?author=${encodeURIComponent(username)}&since=${since}T00:00:00Z&per_page=100`
  );
  if (Array.isArray(byAuthor) && byAuthor.length > 0) {
    return byAuthor.map((c: any) => ({
      date: c.commit?.author?.date ?? c.commit?.committer?.date,
    }));
  }

  // Fallback: varre commits do repositório (paginado) e filtra por login/nome.
  const matches: Array<{ date?: string }> = [];
  for (let page = 1; page <= MAX_COMMIT_PAGES; page++) {
    const batch = await ghFetch(
      `https://api.github.com/repos/${repoPath}/commits?since=${since}T00:00:00Z&per_page=100&page=${page}`
    );
    if (!Array.isArray(batch) || batch.length === 0) break;

    for (const c of batch) {
      if (!commitMatchesUser(c, username)) continue;
      matches.push({
        date: c.commit?.author?.date ?? c.commit?.committer?.date,
      });
    }

    if (batch.length < 100) break;
  }
  return matches;
}

async function fetchDevActivity(username: string, repo: string, since: string) {
  const repoPath = `${OWNER}/${repo}`;

  const errors: string[] = [];
  const [commitsResult, prsOpenedResult, prsMergedResult] = await Promise.allSettled([
    fetchCommitDates(repoPath, username, since),
    ghFetch(
      `https://api.github.com/search/issues?q=is:pr+author:${username}+repo:${repoPath}+created:>=${since}&per_page=100`
    ).then((data: any) =>
      (data.items || []).map((pr: any) => ({ date: pr.created_at }))
    ),
    ghFetch(
      `https://api.github.com/search/issues?q=is:pr+is:merged+author:${username}+repo:${repoPath}+merged:>=${since}&per_page=100`
    ).then((data: any) =>
      (data.items || []).map((pr: any) => ({ date: pr.pull_request?.merged_at ?? pr.closed_at }))
    ),
  ]);

  const commits = commitsResult.status === 'fulfilled' ? commitsResult.value : (errors.push(String(commitsResult.reason)), []);
  const prsOpened = prsOpenedResult.status === 'fulfilled' ? prsOpenedResult.value : (errors.push(String(prsOpenedResult.reason)), []);
  const prsMerged = prsMergedResult.status === 'fulfilled' ? prsMergedResult.value : (errors.push(String(prsMergedResult.reason)), []);

  const weeks: Record<string, { commits: number; prs_opened: number; prs_merged: number }> = {};

  const ensure = (week: string) => {
    if (!weeks[week]) weeks[week] = { commits: 0, prs_opened: 0, prs_merged: 0 };
  };

  for (const c of commits) {
    if (!c.date) continue;
    const week = getMonday(new Date(c.date));
    ensure(week);
    weeks[week].commits++;
  }
  for (const pr of prsOpened) {
    if (!pr.date) continue;
    const week = getMonday(new Date(pr.date));
    ensure(week);
    weeks[week].prs_opened++;
  }
  for (const pr of prsMerged) {
    if (!pr.date) continue;
    const week = getMonday(new Date(pr.date));
    ensure(week);
    weeks[week].prs_merged++;
  }

  return { weeks, errors };
}

export async function POST(_request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  if (!GITHUB_TOKEN || !OWNER || REPOS.length === 0) {
    return NextResponse.json(
      { error: 'GITHUB_TOKEN, GITHUB_REPO_OWNER ou GITHUB_REPOS não configurados' },
      { status: 500 }
    );
  }

  const admin = createAdminClient();
  const since = getSinceDate();

  const { data: links, error: linksErr } = await (admin as any)
    .from('dev_github_links')
    .select('github_username');

  if (linksErr || !links?.length) {
    return NextResponse.json({ error: 'Nenhum dev vinculado' }, { status: 400 });
  }

  // Paraleliza por dev × repo
  const results = await Promise.all(
    links.flatMap((link: any) =>
      REPOS.map(repo =>
        fetchDevActivity(link.github_username, repo, since).then(({ weeks, errors }) => ({
          username: link.github_username,
          repo,
          weeks,
          errors,
        }))
      )
    )
  );

  const synced_at = new Date().toISOString();
  const rows: any[] = [];

  const failed: Array<{ username: string; repo: string; errors: string[] }> = [];
  for (const result of results) {
    const { username, repo, weeks, errors } = result;
    if (errors.length > 0) {
      failed.push({ username, repo, errors });
    }
    for (const [week_start, metrics] of Object.entries(weeks)) {
      const typedMetrics = metrics as { commits: number; prs_opened: number; prs_merged: number };
      rows.push({
        github_username: username,
        repo,
        week_start,
        commits: typedMetrics.commits,
        prs_opened: typedMetrics.prs_opened,
        prs_merged: typedMetrics.prs_merged,
        synced_at,
      });
    }
  }

  if (rows.length) {
    const { error: upsertErr } = await (admin as any)
      .from('github_activity_cache')
      .upsert(rows, { onConflict: 'github_username,repo,week_start' });

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }
  }

  const successCount = results.length - failed.length;
  const weekSet = new Set(rows.map(r => r.week_start));

  return NextResponse.json({
    ok: true,
    synced_at,
    devs_repos_synced: successCount,
    devs_repos_failed: failed.length,
    weeks_synced: weekSet.size,
    rows_upserted: rows.length,
    failed,
  });
}
