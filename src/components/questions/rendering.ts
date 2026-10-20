export function normalizeMultilineText(text?: string | null): string {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/g, ''))
    .join('\n')
    .trim()
}

// Um grupo de testlet (mesmo `testlet_group_id`) às vezes tem o `context`
// de cada questão-irmã repetido por completo (mesmo texto de apoio salvo em
// cada linha do banco) — sem isso, cada tela que renderiza um testlet
// precisaria reimplementar essa dededuplicação por conta própria, com risco
// de divergir uma da outra (foi exatamente isso que causou o preview do
// founder mostrar algo diferente do que o aluno via). Usada tanto pela tela
// de simulado do aluno quanto pelo preview do founder (SimuladoPreviewModal)
// — mesma função, garante que os dois calculam a mesma coisa.
//
// Acha o maior PREFIXO DE LINHAS comum entre todas as questões do grupo (não
// exige igualdade byte-a-byte do texto inteiro) e devolve (a) esse prefixo,
// pra mostrar uma vez só antes do grupo, e (b) o que sobra de cada questão
// depois desse prefixo, pra mostrar (se houver) junto de cada questão
// individual dentro do grupo.
export function deriveTestletSharedContext(
  groupQuestions: Array<{ id: string; context?: string | null }>
): { sharedContext: string; perQuestionContext: Record<string, string> } {
  const normalizedContexts = groupQuestions
    .map((question) => normalizeMultilineText(question.context))
    .filter(Boolean)

  if (normalizedContexts.length === 0) {
    return { sharedContext: '', perQuestionContext: {} as Record<string, string> }
  }

  const linesPerQuestion = normalizedContexts.map((context) => context.split('\n'))
  const prefixLines: string[] = []
  const shortestLength = Math.min(...linesPerQuestion.map((lines) => lines.length))

  for (let index = 0; index < shortestLength; index += 1) {
    const candidate = linesPerQuestion[0][index]
    if (linesPerQuestion.every((lines) => lines[index] === candidate)) {
      prefixLines.push(candidate)
      continue
    }
    break
  }

  let sharedContext = prefixLines.join('\n').trim()

  if (!sharedContext && normalizedContexts.length === 1) {
    sharedContext = normalizedContexts[0]
  }

  if (!sharedContext) {
    const firstContext = normalizedContexts[0]
    const hasExplicitSharedPrompt = /responder\s+às?\s+quest(ões|ao)|texto\s+\d+|imagem\s+\d+/i.test(firstContext)
    if (hasExplicitSharedPrompt) {
      sharedContext = firstContext
    }
  }

  const perQuestionContext = Object.fromEntries(
    groupQuestions.map((question) => {
      const context = normalizeMultilineText(question.context)
      if (!context || !sharedContext) {
        return [question.id, context]
      }
      if (context === sharedContext) {
        return [question.id, '']
      }
      if (context.startsWith(`${sharedContext}\n\n`)) {
        return [question.id, context.slice(sharedContext.length).trim()]
      }
      if (context.startsWith(sharedContext)) {
        return [question.id, context.slice(sharedContext.length).trim()]
      }
      return [question.id, context]
    })
  )

  return { sharedContext, perQuestionContext }
}

export const questionMarkdownImageRegex = /!\[[^\]]*]\((.*?)\)/g

export function normalizeQuestionImageUrl(raw: string): string | null {
  const cleaned = String(raw || '')
    .trim()
    .replace(/^<|>$/g, '')
    .replace(/^['"]|['"]$/g, '')

  if (!cleaned) return null
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) return cleaned
  if (cleaned.startsWith('/storage/v1/object/public/')) return cleaned
  return null
}

export function extractMarkdownImageUrls(text?: string | null): string[] {
  if (!text) return []
  return Array.from(text.matchAll(questionMarkdownImageRegex))
    .map((match) => normalizeQuestionImageUrl(match[1] || ''))
    .filter((url): url is string => Boolean(url))
}

export function extractImageUrls(value: unknown): string[] {
  if (!value) return []

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeQuestionImageUrl(String(item)))
      .filter((url): url is string => Boolean(url))
  }

  if (typeof value !== 'string') return []

  const raw = value.trim()
  if (!raw) return []

  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw)
      return extractImageUrls(parsed)
    } catch {
      // segue para parsers abaixo
    }
  }

  const markdownUrls = extractMarkdownImageUrls(raw)
  if (markdownUrls.length > 0) return markdownUrls

  const direct = normalizeQuestionImageUrl(raw)
  return direct ? [direct] : []
}

export function stripMarkdownImages(text?: string | null): string {
  if (!text) return ''
  return text.replace(questionMarkdownImageRegex, '').trim()
}

// Fonte/atribuição segue a convenção do ETL agentic (SDD §9.9): cada linha de
// fonte começa com "§ ". Recomendado (mas não obrigatório, por compatibilidade
// com conteúdo já inserido) fechar também com "§" ao final da citação — isso
// delimita a legenda com precisão mesmo se, por engano, faltar uma linha em
// branco separando-a do parágrafo seguinte.
const SOURCE_MARKER = '§'

function isSourceParagraph(paragraph: string): boolean {
  return paragraph.trim().startsWith(SOURCE_MARKER)
}

// Se um parágrafo começa com "§" e contém um segundo "§" mais adiante, tudo
// até esse segundo marcador (inclusive) é a legenda; o restante (se houver)
// é conteúdo do corpo que foi acidentalmente colado ao parágrafo da legenda
// (por exemplo, por faltar uma quebra de linha dupla no dado de origem).
function splitEmbeddedSourceMarker(paragraph: string): string[] {
  const trimmed = paragraph.trim()
  if (!isSourceParagraph(trimmed)) return [trimmed]

  const closingIndex = trimmed.indexOf(SOURCE_MARKER, SOURCE_MARKER.length)
  if (closingIndex === -1) return [trimmed]

  const sourcePart = trimmed.slice(0, closingIndex + SOURCE_MARKER.length).trim()
  const rest = trimmed.slice(closingIndex + SOURCE_MARKER.length).trim()
  return rest ? [sourcePart, ...splitEmbeddedSourceMarker(rest)] : [sourcePart]
}

export interface QuestionContextSegment {
  type: 'body' | 'source'
  text: string
}

/**
 * Divide o context de uma questão em segmentos ordenados de corpo (body) e
 * legenda/fonte (source), preservando a ordem original — inclusive quando há
 * múltiplos documentos/textos, cada um com sua própria citação intercalada
 * (ex.: "Documento 1" + fonte 1 + "Documento 2" + fonte 2).
 *
 * Um parágrafo (bloco separado por linha em branco) é classificado como
 * "source" quando começa com "§ ". Parágrafos consecutivos do mesmo tipo são
 * mesclados em um único segmento para preservar espaçamento interno.
 */
export function splitQuestionContextSegments(text?: string | null): QuestionContextSegment[] {
  const raw = String(text || '').trim()
  if (!raw) return []

  const rawParagraphs = raw
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  const paragraphs = rawParagraphs.flatMap(splitEmbeddedSourceMarker)

  const segments: QuestionContextSegment[] = []
  for (const paragraph of paragraphs) {
    const type: QuestionContextSegment['type'] = isSourceParagraph(paragraph) ? 'source' : 'body'
    const previous = segments[segments.length - 1]
    if (previous && previous.type === type) {
      previous.text = `${previous.text}\n\n${paragraph}`
    } else {
      segments.push({ type, text: paragraph })
    }
  }

  return segments
}

/** @deprecated Prefira `splitQuestionContextSegments`, que preserva a ordem
 * original entre múltiplos documentos/citações. Mantido para compatibilidade
 * com chamadores que só precisam de um único bloco de corpo + um único bloco
 * de fonte (concatenados quando há mais de um segmento de cada tipo). */
export function splitQuestionContextAndSource(text?: string | null): {
  body: string
  source: string | null
} {
  const segments = splitQuestionContextSegments(text)
  const body = segments
    .filter((segment) => segment.type === 'body')
    .map((segment) => segment.text)
    .join('\n\n')
  const source = segments
    .filter((segment) => segment.type === 'source')
    .map((segment) => segment.text)
    .join('\n\n')
  return { body, source: source || null }
}

export function extractDetachedQuestionImageUrls(
  images: unknown,
  ...inlineTextSources: Array<string | null | undefined>
): string[] {
  const inlineUrls = new Set(
    inlineTextSources.flatMap((source) => extractMarkdownImageUrls(source))
  )

  return extractImageUrls(images).filter((url) => !inlineUrls.has(url))
}

export function extractAlternativeImageUrls(alternative: {
  image?: unknown
  file?: unknown
  text?: string | null
}): string[] {
  const inlineUrls = new Set(extractMarkdownImageUrls(alternative.text))
  const fieldUrls = [
    ...extractImageUrls(alternative.image),
    ...extractImageUrls(alternative.file),
  ]

  return Array.from(new Set(fieldUrls.filter((url) => !inlineUrls.has(url))))
}

export type QuestionImageRole =
  | 'context_image'
  | 'alternative_image'
  | 'testlet_image'
  | 'formula_image'
  | 'table_image'
  | 'other'

export interface QuestionImageAsset {
  url?: string | null
  role?: QuestionImageRole | string | null
  alternative_letter?: string | null
  caption?: string | null
  source?: string | null
  original_layout?: 'single' | 'side_by_side' | 'stacked' | 'inline' | string | null
  display_hint?: 'responsive_fit' | 'preserve_aspect_ratio' | 'full_width' | 'inline' | string | null
  source_order?: number | null
}

export interface QuestionContentBlock {
  type: 'instruction' | 'heading' | 'text' | 'image' | 'source' | 'caption' | 'spacer' | string
  label?: string | null
  text?: string | null
  url?: string | null
  caption?: string | null
  source?: string | null
  alignment?: 'left' | 'center' | 'right' | 'justify' | string | null
  layout?: 'single' | 'side_by_side' | 'stacked' | 'inline' | string | null
  source_order?: number | null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function getAgenticEtLMetadata(metadata: unknown): Record<string, unknown> {
  const root = asRecord(metadata)
  const agentic = asRecord(root?.agentic_etl)
  return agentic || {}
}

export function getQuestionImageAssets(metadata: unknown): QuestionImageAsset[] {
  const agentic = getAgenticEtLMetadata(metadata)
  const assets = agentic.image_assets
  if (!Array.isArray(assets)) return []

  return assets
    .map((asset) => asRecord(asset))
    .filter((asset): asset is Record<string, unknown> => Boolean(asset))
    .map((asset) => ({
      url: typeof asset.url === 'string' ? asset.url : null,
      role: typeof asset.role === 'string' ? asset.role : null,
      alternative_letter: typeof asset.alternative_letter === 'string' ? asset.alternative_letter : null,
      caption: typeof asset.caption === 'string' ? asset.caption : null,
      source: typeof asset.source === 'string' ? asset.source : null,
      original_layout: typeof asset.original_layout === 'string' ? asset.original_layout : null,
      display_hint: typeof asset.display_hint === 'string' ? asset.display_hint : null,
      source_order: typeof asset.source_order === 'number' ? asset.source_order : null,
    }))
    .filter((asset) => Boolean(normalizeQuestionImageUrl(asset.url || '')))
}

export function getQuestionContentBlocks(metadata: unknown): QuestionContentBlock[] {
  const agentic = getAgenticEtLMetadata(metadata)
  const blocks = agentic.content_blocks
  if (!Array.isArray(blocks)) return []

  return blocks
    .map((block) => asRecord(block))
    .filter((block): block is Record<string, unknown> => Boolean(block && typeof block.type === 'string'))
    .map((block) => ({
      type: String(block.type),
      label: typeof block.label === 'string' ? block.label : null,
      text: typeof block.text === 'string' ? block.text : null,
      url: typeof block.url === 'string' ? block.url : null,
      caption: typeof block.caption === 'string' ? block.caption : null,
      source: typeof block.source === 'string' ? block.source : null,
      alignment: typeof block.alignment === 'string' ? block.alignment : null,
      layout: typeof block.layout === 'string' ? block.layout : null,
      source_order: typeof block.source_order === 'number' ? block.source_order : null,
    }))
}

export function findImageAsset(
  assets: QuestionImageAsset[],
  url: string,
  options?: { role?: QuestionImageRole | string; alternativeLetter?: string }
): QuestionImageAsset | null {
  const normalizedUrl = normalizeQuestionImageUrl(url)
  if (!normalizedUrl) return null

  const alternativeLetter = options?.alternativeLetter?.toUpperCase()
  return (
    assets.find((asset) => {
      const assetUrl = normalizeQuestionImageUrl(asset.url || '')
      if (assetUrl !== normalizedUrl) return false
      if (options?.role && asset.role !== options.role) return false
      if (alternativeLetter && String(asset.alternative_letter || '').toUpperCase() !== alternativeLetter) return false
      return true
    }) ||
    assets.find((asset) => normalizeQuestionImageUrl(asset.url || '') === normalizedUrl) ||
    null
  )
}

export function getSupportImagesLayout(assets: QuestionImageAsset[], urls: string[]): 'side_by_side' | 'stacked' | 'single' {
  if (urls.length <= 1) return 'single'
  const matchedAssets = urls
    .map((url) => findImageAsset(assets, url))
    .filter((asset): asset is QuestionImageAsset => Boolean(asset))

  if (matchedAssets.some((asset) => asset.original_layout === 'side_by_side')) return 'side_by_side'
  return 'stacked'
}
