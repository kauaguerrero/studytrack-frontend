export interface PodiumStreak {
  position: number;
  /** Meses consecutivos da sequência mais recente nessa posição. */
  count: number;
  /** Total de meses nessa posição, somando sequências não consecutivas. */
  totalMonths: number;
  latestMonth: string;
}

function monthIndex(monthRef: string): number {
  const d = new Date(`${monthRef}T12:00:00`);
  return d.getFullYear() * 12 + d.getMonth();
}

/** Agrupa meses consecutivos com a mesma posição no pódio em uma única
 * conquista ("Top 1 • 3 meses seguidos!") em vez de repetir um badge por mês.
 *
 * Retorna no máximo uma conquista por posição: quando o aluno tem sequências
 * separadas na mesma colocação (ex.: líder em abr–mai e de novo em jul–ago),
 * elas viram um badge só — `count` é a sequência mais recente e `totalMonths`
 * o acumulado. Antes cada sequência virava um badge próprio, e duas de mesmo
 * tamanho saíam com texto idêntico, parecendo badge duplicada na tela. */
export function summarizePodiumStreaks(history: { position: number; month_reference: string }[]): PodiumStreak[] {
  // Dedupe defensivo: uma linha repetida de (posição, mês) inflaria o total.
  const seen = new Set<string>();
  const unique = history.filter((item) => {
    const key = `${item.position}-${item.month_reference}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const sorted = [...unique].sort((a, b) => monthIndex(b.month_reference) - monthIndex(a.month_reference));
  const streaks: (PodiumStreak & { _cursorMonth: string })[] = [];
  for (const item of sorted) {
    const last = streaks[streaks.length - 1];
    if (last && last.position === item.position && monthIndex(last._cursorMonth) - monthIndex(item.month_reference) === 1) {
      last.count += 1;
      last.totalMonths += 1;
      last._cursorMonth = item.month_reference;
    } else {
      streaks.push({ position: item.position, count: 1, totalMonths: 1, latestMonth: item.month_reference, _cursorMonth: item.month_reference });
    }
  }

  // `streaks` já vem do mês mais recente para o mais antigo, então a primeira
  // ocorrência de cada posição é a sequência atual — as seguintes só somam.
  const byPosition = new Map<number, PodiumStreak>();
  for (const { position, count, totalMonths, latestMonth } of streaks) {
    const current = byPosition.get(position);
    if (current) {
      current.totalMonths += totalMonths;
    } else {
      byPosition.set(position, { position, count, totalMonths, latestMonth });
    }
  }
  return [...byPosition.values()];
}

/** Texto do badge. Recebe os rótulos já formatados porque posição e mês são
 * escritos de formas diferentes em cada tela. */
export function describePodiumStreak(
  streak: PodiumStreak,
  { positionLabel, monthLabel }: { positionLabel: string; monthLabel: string },
): string {
  const { count, totalMonths } = streak;
  if (totalMonths <= 1) return `${positionLabel} • ${monthLabel}`;
  if (totalMonths === count) return `${positionLabel} • ${count} meses seguidos!`;
  if (count >= 2) return `${positionLabel} • ${totalMonths} meses • ${count} seguidos`;
  return `${positionLabel} • ${totalMonths} meses`;
}
