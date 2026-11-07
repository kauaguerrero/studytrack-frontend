/**
 * Esqueleto da primeira carga do cronograma.
 *
 * A página depende de 3 respostas em sequência (status → hoje → semana) e mais os insights.
 * Antes, cada bloco surgia quando a sua resposta chegava e empurrava o resto da tela. Aqui
 * todos os blocos têm a mesma posição e altura dos de verdade e aparecem de uma vez.
 */
const pulse = 'animate-pulse rounded-full bg-slate-200/80 dark:bg-white/[0.07]';
const card =
  'rounded-[22px] border border-slate-200/70 bg-white shadow-[0_2px_4px_-2px_rgba(15,23,42,0.06),0_22px_40px_-20px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-slate-900';

function DayColumn({ i }: { i: number }) {
  // Quantidade de cards varia por coluna para não parecer uma grade "carimbada".
  const cards = [2, 3, 1, 2, 3, 2, 0][i];
  return (
    <div className="w-[78vw] max-w-[280px] shrink-0 snap-start rounded-[20px] bg-white p-3 dark:bg-slate-900 lg:w-auto lg:max-w-none lg:rounded-none lg:bg-transparent lg:dark:bg-transparent">
      <div className="mb-2.5 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className={`h-3 w-10 ${pulse}`} />
          <div className={`h-4 w-12 ${pulse}`} />
        </div>
        <div className={`h-5 w-16 ${pulse}`} />
        <div className={`h-1.5 w-full ${pulse}`} />
      </div>
      <div className="space-y-2">
        {Array.from({ length: cards }, (_, k) => (
          <div key={k} className="animate-pulse space-y-2 rounded-2xl border border-slate-100 p-2.5 dark:border-white/[0.06]">
            <div className="h-2.5 w-14 rounded-full bg-slate-200/80 dark:bg-white/[0.07]" />
            <div className="h-3 w-full rounded-full bg-slate-200/80 dark:bg-white/[0.07]" />
            <div className="h-3 w-2/3 rounded-full bg-slate-200/80 dark:bg-white/[0.07]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CronogramaSkeleton() {
  return (
    <div role="status" aria-label="Carregando cronograma"
      className="relative min-h-screen -m-4 bg-slate-50 px-4 py-5 dark:bg-[#080808] md:-m-8 md:px-8 md:py-8">
      <span className="sr-only">Carregando cronograma…</span>
      <div className="space-y-5 pb-8">
        {/* Hero: título + controles à esquerda, roda de semanas + próximo passo à direita. */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between xl:gap-6 xl:pr-14">
          <div className="space-y-3">
            <div className="space-y-2">
              <div className={`h-3 w-20 ${pulse}`} />
              <div className={`h-8 w-44 ${pulse}`} />
              <div className={`h-3.5 w-72 max-w-full ${pulse}`} />
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-40 animate-pulse rounded-xl bg-slate-200/80 dark:bg-white/[0.07]" />
              <div className="h-10 w-20 animate-pulse rounded-xl bg-slate-200/80 dark:bg-white/[0.07]" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[330px_360px] xl:gap-4">
            <div className={`${card} h-[118px] p-3`}>
              <div className="flex h-full flex-col justify-center gap-2">
                <div className={`mx-auto h-2.5 w-24 ${pulse}`} />
                <div className="h-11 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
                <div className={`mx-auto h-2.5 w-24 ${pulse}`} />
              </div>
            </div>
            <div className={`${card} h-[118px] p-3.5`}>
              <div className="flex h-full flex-col justify-center gap-2.5">
                <div className={`h-2.5 w-24 ${pulse}`} />
                <div className={`h-4 w-4/5 ${pulse}`} />
                <div className="h-9 w-full animate-pulse rounded-xl bg-slate-200/80 dark:bg-white/[0.07]" />
              </div>
            </div>
          </div>
        </div>

        {/* Quadro da semana: 7 colunas no desktop, carrossel no celular (igual ao WeekBoard). */}
        <div className="-mx-4 flex gap-2.5 overflow-hidden px-4 md:-mx-8 md:px-8 lg:m-0 lg:grid lg:grid-cols-7 lg:gap-0 lg:divide-x lg:divide-slate-100 lg:rounded-[20px] lg:bg-white lg:px-0 lg:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] dark:lg:divide-white/10 dark:lg:bg-slate-900">
          {Array.from({ length: 7 }, (_, i) => <DayColumn key={i} i={i} />)}
        </div>

        {/* Assistente + "Como você está indo". */}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          {[0, 1].map((k) => (
            <div key={k} className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-200/80 dark:bg-white/[0.07]" />
                <div className="space-y-1.5">
                  <div className={`h-3.5 w-36 ${pulse}`} />
                  <div className={`h-2.5 w-52 ${pulse}`} />
                </div>
              </div>
              <div className={`${card} h-[260px] p-3.5`}>
                <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                  {[0, 1, 2, 3].map((t) => <div key={t} className="h-[76px] animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />)}
                </div>
                <div className="mt-3 h-[92px] animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
