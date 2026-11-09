// Modelo de "composição" do Novo Simulado (Personalizado): cada matéria
// selecionada tem sua própria quota explícita — seja uma quota única para a
// matéria inteira (`mode: 'all'`), seja uma quota por assunto escolhido
// (`mode: 'topics'`). Não há mais agrupamento implícito de múltiplas
// matérias/assuntos sob uma única quota: a quantidade de questões de cada
// assunto é sempre definida (por auto-distribuição do total escolhido pelo
// aluno, ou por edição manual), então não existe a ambiguidade de produto
// cartesiano que o modelo antigo (`ComposicaoGroup`) precisava evitar
// agrupando itens sob uma quota compartilhada.

export interface TopicQty {
  topic: string
  qty: number
}

export interface SubjectComposicao {
  subject: string
  mode: 'all' | 'topics'
  qty: number // usado quando mode === 'all'
  topics: TopicQty[] // usado quando mode === 'topics'
}

export type Composicao = SubjectComposicao[]

export interface ApiComposition {
  subject: string
  subjects?: string[]
  topic?: string
  topics?: string[]
  qty: number
  include_answered: boolean
}

function slotId(subject: string, topic?: string | null): string {
  return topic ? `${subject}::${topic}` : subject
}

interface Slot { id: string; subject: string; topic: string | null; qty: number }

function flattenSlots(c: Composicao): Slot[] {
  return c.flatMap((s): Slot[] => (
    s.mode === 'all'
      ? [{ id: slotId(s.subject), subject: s.subject, topic: null, qty: s.qty }]
      : s.topics.map((t) => ({ id: slotId(s.subject, t.topic), subject: s.subject, topic: t.topic, qty: t.qty }))
  ))
}

function rebuildFromSlots(c: Composicao, slots: Slot[]): Composicao {
  const bySlotId = new Map(slots.map((s) => [s.id, s.qty]))
  return c.map((s) => (
    s.mode === 'all'
      ? { ...s, qty: bySlotId.get(slotId(s.subject)) ?? s.qty }
      : { ...s, topics: s.topics.map((t) => ({ ...t, qty: bySlotId.get(slotId(s.subject, t.topic)) ?? t.qty })) }
  ))
}

export function composicaoTotalQty(c: Composicao): number {
  return c.reduce((sum, s) => sum + (s.mode === 'all' ? s.qty : s.topics.reduce((tsum, t) => tsum + t.qty, 0)), 0)
}

export function composicaoSlotCount(c: Composicao): number {
  return c.reduce((count, s) => count + (s.mode === 'all' ? 1 : s.topics.length), 0)
}

export function composicaoDistinctSubjects(c: Composicao): number {
  return c.length
}

export function composicaoDistinctTopics(c: Composicao): number {
  return c.reduce((sum, s) => sum + (s.mode === 'topics' ? s.topics.length : 0), 0)
}

export function remainingBudget(c: Composicao, totalQty: number): number {
  return Math.max(0, totalQty - composicaoTotalQty(c))
}

export function composicaoToApiCompositions(c: Composicao, includeAnswered: boolean): ApiComposition[] {
  return c.flatMap((s) => {
    if (s.mode === 'all') {
      return s.qty > 0 ? [{ subject: s.subject, qty: s.qty, include_answered: includeAnswered }] : []
    }
    return s.topics
      .filter((t) => t.qty > 0)
      .map((t) => ({ subject: s.subject, topic: t.topic, qty: t.qty, include_answered: includeAnswered }))
  })
}

// Teto de disponibilidade real por slot (subject ou subject::topic), vindo
// do banco de questões — quando um slot não aparece no mapa, trata-se como
// "ainda não sabemos" (sem teto), nunca como zero, pra não travar a UI
// antes da contagem carregar.
export type AvailabilityBySlot = Record<string, number>

// Distribui `amount` entre `ids` em partes iguais, nunca passando do teto de
// cada um (`caps`) — típico "water filling": a sobra de um slot que bateu no
// teto é redistribuída entre os demais, em rodadas, até não caber mais em
// nenhum (aí a sobra final fica sem alocar — sinal de indisponibilidade real,
// não um bug de arredondamento).
function distributeWithCaps(ids: string[], amount: number, caps: Map<string, number>): Map<string, number> {
  const result = new Map(ids.map((id) => [id, 0]))
  let pool = new Set(ids)
  let left = amount
  while (left > 0 && pool.size > 0) {
    const share = Math.floor(left / pool.size)
    if (share > 0) {
      let anyMaxedOut = false
      for (const id of pool) {
        const cap = caps.get(id) ?? Infinity
        const current = result.get(id) ?? 0
        const room = cap - current
        const give = Math.min(share, Math.max(0, room))
        if (give > 0) { result.set(id, current + give); left -= give }
        if (room <= share) anyMaxedOut = true
      }
      if (anyMaxedOut) {
        // alguém bateu no teto: tira do pool e faz outra rodada com o resto
        pool = new Set([...pool].filter((id) => (caps.get(id) ?? Infinity) > (result.get(id) ?? 0)))
        continue
      }
      // ninguém bateu no teto nesta rodada — só falta o resto da divisão
      // inteira (< pool.size), distribuído 1 a 1 logo abaixo.
    }
    for (const id of pool) {
      if (left <= 0) break
      const cap = caps.get(id) ?? Infinity
      if ((result.get(id) ?? 0) < cap) { result.set(id, (result.get(id) ?? 0) + 1); left -= 1 }
    }
    break
  }
  return result
}

// Redistribui `totalQty` entre os slots ainda não editados manualmente
// (`touched`) sempre que o conjunto de slots muda (matéria/assunto marcado
// ou desmarcado). Slots tocados mantêm seu valor atual; o restante do
// orçamento é dividido em partes iguais entre os slots não tocados — nunca
// além da disponibilidade real de cada um (`availability`), quando
// conhecida, pra nunca sugerir uma composição que o banco não consegue
// atender (ver bug: auto-distribuição espalhando poucas questões reais por
// assuntos muito específicos e só estourando erro na hora de iniciar).
export function redistributeQty(c: Composicao, totalQty: number, touched: Set<string>, availability: AvailabilityBySlot = {}): Composicao {
  const slots = flattenSlots(c)
  const reserved = slots.filter((s) => touched.has(s.id)).reduce((sum, s) => sum + s.qty, 0)
  const untouched = slots.filter((s) => !touched.has(s.id))
  const remaining = Math.max(0, totalQty - reserved)
  if (untouched.length === 0) return c
  const caps = new Map(untouched.map((s) => [s.id, availability[s.id] ?? Infinity]))
  const distributed = distributeWithCaps(untouched.map((s) => s.id), remaining, caps)
  const nextSlots = slots.map((s) => (touched.has(s.id) ? s : { ...s, qty: distributed.get(s.id) ?? 0 }))
  return rebuildFromSlots(c, nextSlots)
}

// Clampa o novo valor de um slot ao orçamento restante (nunca deixa a soma
// total passar de `totalQty`) e à disponibilidade real do slot, quando
// conhecida; decrementar nunca redistribui a diferença para outros slots —
// o aluno reatribui manualmente o que for liberado.
export function clampSlotQty(c: Composicao, id: string, newQty: number, totalQty: number, availability: AvailabilityBySlot = {}): Composicao {
  const slots = flattenSlots(c)
  const others = slots.filter((s) => s.id !== id).reduce((sum, s) => sum + s.qty, 0)
  const budgetMax = Math.max(0, totalQty - others)
  const availableMax = availability[id] ?? Infinity
  const max = Math.min(budgetMax, availableMax)
  const clamped = Math.min(Math.max(0, newQty), max)
  const nextSlots = slots.map((s) => (s.id === id ? { ...s, qty: clamped } : s))
  return rebuildFromSlots(c, nextSlots)
}

export { slotId as composicaoSlotId }
