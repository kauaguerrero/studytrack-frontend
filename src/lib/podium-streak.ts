export interface PodiumStreak {
  position: number;
  count: number;
  latestMonth: string;
}

function monthIndex(monthRef: string): number {
  const d = new Date(`${monthRef}T12:00:00`);
  return d.getFullYear() * 12 + d.getMonth();
}

/** Agrupa meses consecutivos com a mesma posição no pódio em uma única
 * conquista ("Top 1 • 3 meses seguidos!") em vez de repetir um badge por mês. */
export function summarizePodiumStreaks(history: { position: number; month_reference: string }[]): PodiumStreak[] {
  const sorted = [...history].sort((a, b) => monthIndex(b.month_reference) - monthIndex(a.month_reference));
  const streaks: (PodiumStreak & { _cursorMonth: string })[] = [];
  for (const item of sorted) {
    const last = streaks[streaks.length - 1];
    if (last && last.position === item.position && monthIndex(last._cursorMonth) - monthIndex(item.month_reference) === 1) {
      last.count += 1;
      last._cursorMonth = item.month_reference;
    } else {
      streaks.push({ position: item.position, count: 1, latestMonth: item.month_reference, _cursorMonth: item.month_reference });
    }
  }
  return streaks.map(({ position, count, latestMonth }) => ({ position, count, latestMonth }));
}
