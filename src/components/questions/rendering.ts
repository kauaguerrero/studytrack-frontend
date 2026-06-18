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

const sourceReferenceMarkerRegex =
  /(dispon[ií]vel em:|acesso em:|fonte:|adaptado\)?\.?$|adapted\)?\.?$)/i

const citationContinuationRegex =
  /(^by\s+\S+)|(^[A-ZÁ-Ú'’.-]+,\s)|(\beditora\b)|(\bpress\b)|(\bvol\.\b)|(\bn\.\s*\d+\b)|(\bp\.\s*\d+\b)|(\b\d{4}\b)/i

function isSourceLikeLine(line: string): boolean {
  const normalized = String(line || '').trim()
  if (!normalized) return false
  return sourceReferenceMarkerRegex.test(normalized) || citationContinuationRegex.test(normalized)
}

export function splitQuestionContextAndSource(text?: string | null): {
  body: string
  source: string | null
} {
  const raw = String(text || '').trim()
  if (!raw) return { body: '', source: null }

  const lines = raw.split('\n').map((line) => line.trim())
  if (lines.length === 0) return { body: raw, source: null }

  const markerIndexes = lines
    .map((line, index) => (sourceReferenceMarkerRegex.test(line) ? index : -1))
    .filter((index) => index >= 0)

  if (markerIndexes.length === 0) {
    return { body: raw, source: null }
  }

  let sourceStart = markerIndexes[0]
  let sourceEnd = markerIndexes[markerIndexes.length - 1]

  while (sourceStart > 0 && isSourceLikeLine(lines[sourceStart - 1])) {
    sourceStart -= 1
  }
  while (sourceEnd + 1 < lines.length && isSourceLikeLine(lines[sourceEnd + 1])) {
    sourceEnd += 1
  }

  const sourceLines = lines.slice(sourceStart, sourceEnd + 1).filter(Boolean)
  if (sourceLines.length === 0) {
    return { body: raw, source: null }
  }

  const bodyLines = [...lines.slice(0, sourceStart), ...lines.slice(sourceEnd + 1)]
  const body = bodyLines.join('\n').trim()
  const source = sourceLines.join('\n').trim()
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
