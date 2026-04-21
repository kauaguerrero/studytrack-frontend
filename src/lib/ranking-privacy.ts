type RankingIdentity = {
  full_name: string;
  is_anonymous?: boolean | null;
};

export function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

export function isAnonymousRankingEntry(
  entry: RankingIdentity,
  isSelf = false,
): boolean {
  return !isSelf && entry.is_anonymous === true;
}

export function getRankingDisplayName(
  entry: RankingIdentity,
  opts?: {
    isSelf?: boolean;
    short?: boolean;
    withYouSuffix?: boolean;
  },
): string {
  const isSelf = opts?.isSelf === true;
  const short = opts?.short === true;
  const withYouSuffix = opts?.withYouSuffix === true;

  if (isSelf) {
    return withYouSuffix ? `${entry.full_name} (você)` : 'Você';
  }

  if (entry.is_anonymous) {
    return short ? 'Secreto' : 'Aluno secreto';
  }

  if (short) {
    return entry.full_name.split(' ')[0] || entry.full_name;
  }

  return entry.full_name;
}
