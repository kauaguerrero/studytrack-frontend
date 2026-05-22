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
