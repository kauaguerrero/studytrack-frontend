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

export function splitQuestionContextAndSource(text?: string | null): {
  body: string
  source: string | null
} {
  const raw = String(text || '').trim()
  if (!raw) return { body: '', source: null }

  const paragraphs = raw.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean)
  if (paragraphs.length === 0) return { body: '', source: null }

  const lastParagraph = paragraphs[paragraphs.length - 1]
  if (!sourceReferenceMarkerRegex.test(lastParagraph)) {
    return { body: raw, source: null }
  }

  const body = paragraphs.slice(0, -1).join('\n\n').trim()
  const source = lastParagraph.trim()
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
