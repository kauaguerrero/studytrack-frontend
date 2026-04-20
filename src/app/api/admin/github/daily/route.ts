import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrDev } from '@/app/api/admin/_utils';
import { createAdminClient } from '@/lib/supabase/admin';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const OWNER = process.env.GITHUB_REPO_OWNER!;
const REPOS = (process.env.GITHUB_REPOS ?? '').split(',').map(r => r.trim()).filter(Boolean);
const MAX_COMMIT_PAGES = 10;

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

function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59));
  return {
    since: start.toISOString().slice(0, 10),
    until: end.toISOString().slice(0, 10),
  };
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

async function fetchCommitDates(repoPath: string, username: string, since: string, until: string): Promise<Array<{ date?: string }>> {
  const byAuthor = await ghFetch(
    `https://api.github.com/repos/${repoPath}/commits?author=${encodeURIComponent(username)}&since=${since}T00:00:00Z&until=${until}T23:59:59Z&per_page=100`
  );
  if (Array.isArray(byAuthor) && byAuthor.length > 0) {
    return byAuthor.map((c: any) => ({
      date: c.commit?.author?.date ?? c.commit?.committer?.date,
    }));
  }

  const matches: Array<{ date?: string }> = [];
  for (let page = 1; page <= MAX_COMMIT_PAGES; page++) {
    const batch = await ghFetch(
      `https://api.github.com/repos/${repoPath}/commits?since=${since}T00:00:00Z&until=${until}T23:59:59Z&per_page=100&page=${page}`
    );
    if (!Array.isArray(batch) || batch.length === 0) break;

    for (const c of batch) {
      if (!commitMatchesUser(c, username)) continue;
      matches.push({ date: c.commit?.author?.date ?? c.commit?.committer?.date });
    }

    if (batch.length < 100) break;
  }

  return matches;
}

async function fetchDevRepoDaily(username: string, repo: string, since: string, until: string) {
  const repoPath = `${OWNER}/${repo}`;
  const errors: string[] = [];

  const [commitsResult, prsOpenedResult, prsMergedResult] = await Promise.allSettled([
    fetchCommitDates(repoPath, username, since, until),
    ghFetch(
      `https://api.github.com/search/issues?q=is:pr+author:${username}+repo:${repoPath}+created:${since}..${until}&per_page=100`
    ).then((data: any) => (data.items || []).map((pr: any) => ({ date: pr.created_at }))),
    ghFetch(
      `https://api.github.com/search/issues?q=is:pr+is:merged+author:${username}+repo:${repoPath}+merged:${since}..${until}&per_page=100`
    ).then((data: any) =>
      (data.items || []).map((pr: any) => ({ date: pr.pull_request?.merged_at ?? pr.closed_at }))
    ),
  ]);

  const commits = commitsResult.status === 'fulfilled' ? commitsResult.value : (errors.push(String(commitsResult.reason)), []);
  const prsOpened = prsOpenedResult.status === 'fulfilled' ? prsOpenedResult.value : (errors.push(String(prsOpenedResult.reason)), []);
  const prsMerged = prsMergedResult.status === 'fulfilled' ? prsMergedResult.value : (errors.push(String(prsMergedResult.reason)), []);

  const days: Record<string, { commits: number; prs_opened: number; prs_merged: number }> = {};

  const ensure = (day: string) => {
    if (!days[day]) days[day] = { commits: 0, prs_opened: 0, prs_merged: 0 };
  };

  for (const c of commits) {
    if (!c.date) continue;
    const day = new Date(c.date).toISOString().slice(0, 10);
    ensure(day);
    days[day].commits++;
  }
  for (const pr of prsOpened) {
    if (!pr.date) continue;
    const day = new Date(pr.date).toISOString().slice(0, 10);
    ensure(day);
    days[day].prs_opened++;
  }
  for (const pr of prsMerged) {
    if (!pr.date) continue;
    const day = new Date(pr.date).toISOString().slice(0, 10);
    ensure(day);
    days[day].prs_merged++;
  }

  return { days, errors };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminOrDev();
  if (!auth.ok) return auth.response;

  if (!GITHUB_TOKEN || !OWNER || REPOS.length === 0) {
    return NextResponse.json(
      { error: 'GITHUB_TOKEN, GITHUB_REPO_OWNER ou GITHUB_REPOS não configurados' },
      { status: 500 }
    );
  }

  const monthParam = request.nextUrl.searchParams.get('month') ?? new Date().toISOString().slice(0, 7);
  const usernameParam = request.nextUrl.searchParams.get('username');
  const repoParam = request.nextUrl.searchParams.get('repo');

  const { since, until } = monthRange(monthParam);
  const admin = createAdminClient();

  let usernames: string[] = [];
  if (usernameParam) {
    usernames = [usernameParam];
  } else {
    const { data: links, error: linksErr } = await (admin as any)
      .from('dev_github_links')
      .select('github_username');

    if (linksErr || !links?.length) {
      return NextResponse.json({ error: 'Nenhum dev vinculado' }, { status: 400 });
    }

    usernames = links.map((link: any) => link.github_username).filter(Boolean);
  }

  const repos = repoParam ? [repoParam] : REPOS;

  const results = await Promise.all(
    usernames.flatMap(username =>
      repos.map(repo =>
        fetchDevRepoDaily(username, repo, since, until).then(({ days, errors }) => ({
          username,
          repo,
          days,
          errors,
        }))
      )
    )
  );

  const byDay: Record<string, { commits: number; prs_opened: number; prs_merged: number }> = {};
  const failed: Array<{ username: string; repo: string; errors: string[] }> = [];

  for (const result of results) {
    if (result.errors.length > 0) {
      failed.push({ username: result.username, repo: result.repo, errors: result.errors });
    }
    for (const [date, metrics] of Object.entries(result.days)) {
      if (!byDay[date]) byDay[date] = { commits: 0, prs_opened: 0, prs_merged: 0 };
      byDay[date].commits += metrics.commits;
      byDay[date].prs_opened += metrics.prs_opened;
      byDay[date].prs_merged += metrics.prs_merged;
    }
  }

  const days = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, metrics]) => ({
      date,
      commits: metrics.commits,
      prs_opened: metrics.prs_opened,
      prs_merged: metrics.prs_merged,
      total: metrics.commits + metrics.prs_opened + metrics.prs_merged,
    }));

  return NextResponse.json({
    month: monthParam,
    since,
    until,
    days,
    scanned_pairs: results.length,
    failed,
  });
}
