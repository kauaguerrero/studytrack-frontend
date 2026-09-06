'use client'

import { Children, Fragment, isValidElement, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { formatScientificText } from '@/lib/scientific-text'

const mathSegmentRegex = /(\$\$[\s\S]+?(?<!\\)\$\$|(?<![\\A-Za-z0-9])\$(?!\$)[^$\n]+?(?<!\\)\$)/g
const underlineSegmentRegex = /<u>([\s\S]*?)<\/u>/gi
type KatexRenderOptions = Parameters<typeof katex.renderToString>[1] & {
  output?: 'html' | 'mathml' | 'htmlAndMathml'
}

function normalizeLatexForKatex(value: string): string {
  return value
    .replace(/\$\$/g, '')
    .replace(/^\$/g, '')
    .replace(/\$$/g, '')
    .trim()
}

function normalizePlainLatexText(value: string): string {
  return normalizeLatexForKatex(value)
    .replace(/\\%/g, '%')
    .replace(/\\\$/g, '$')
    .replace(/\\&/g, '&')
    .replace(/\\#/g, '#')
    .replace(/\\_/g, '_')
    .replace(/\\,/g, ',')
    .replace(/\\:/g, ':')
    .replace(/\\;/g, ';')
    .replace(/\\!/g, '!')
    .replace(/\\\?/g, '?')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\mathrm\{([^}]+)\}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

function isLikelyMathSegment(segment: string): boolean {
  const latex = normalizeLatexForKatex(segment)
  if (!latex) return false
  if (/^[\d\s.,]+$/.test(latex)) return false
  // Valor monetário escapado do PDF: \$ seguido de número (ex: \$ 500,000)
  if (/^\\\$\s*[\d,.\s]+$/.test(latex)) return false
  if (/[\\^_{}()=<>+\-*/]/.test(latex) || latex.includes('[') || latex.includes(']')) return true
  if (/[±×÷∑∫√∞≈≠≤≥]/.test(latex)) return true
  if (/^[A-Za-z](?:[A-Za-z0-9]{0,2})?$/.test(latex)) return true
  if (/^[A-Za-z0-9]+(?:\s*[=+\-*/<>]\s*[A-Za-z0-9]+)+$/.test(latex)) return true
  return false
}

function isStandaloneOrderedListMarker(text: string): boolean {
  return /^\d+[.)]\s*$/.test(text.trim())
}

function splitMarkdownTableRow(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function parseMarkdownTable(block: string): {
  headers: string[]
  aligns: Array<'left' | 'center' | 'right'>
  rows: string[][]
} | null {
  const lines = block
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return null
  if (!lines[0].includes('|') || !lines[1].includes('|')) return null

  const headers = splitMarkdownTableRow(lines[0])
  const separators = splitMarkdownTableRow(lines[1])
  if (headers.length === 0 || headers.length !== separators.length) return null

  const aligns = separators.map((separator) => {
    if (!/^:?-{3,}:?$/.test(separator)) return null
    const startsWithColon = separator.startsWith(':')
    const endsWithColon = separator.endsWith(':')
    if (startsWithColon && endsWithColon) return 'center'
    if (endsWithColon) return 'right'
    return 'left'
  })

  if (aligns.some((align) => align == null)) return null

  const rows = lines.slice(2).map(splitMarkdownTableRow)
  if (rows.some((row) => row.length !== headers.length)) return null

  return {
    headers,
    aligns: aligns as Array<'left' | 'center' | 'right'>,
    rows,
  }
}

function isMarkdownBlock(text: string): boolean {
  return /^\s*(#{1,6}\s|>|\|.*\||[-*+]\s|\d+\.\s)/m.test(text)
}

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function hasLiteraryIntro(text: string): boolean {
  const normalized = stripDiacritics(String(text || '').toLowerCase())
  return /\b(poema|poesia|poetico|poetica|cancao|letra|soneto|estrofe|verso|versos)\b/.test(normalized)
}

function shouldPreserveManualLineBreaks(paragraph: string, previousParagraph?: string): boolean {
  const lines = paragraph.split('\n').filter((line) => line.trim())
  if (lines.length <= 1) return false
  if (/^\s*(```|~~~)/m.test(paragraph)) return true
  if (/^\s*\$\$/m.test(paragraph) || /\$\$\s*$/m.test(paragraph)) return true
  if (/!\[/.test(paragraph)) return true
  if (parseMarkdownTable(paragraph) || isMarkdownBlock(paragraph)) return true
  if (hasLiteraryIntro(previousParagraph || '')) return true
  if (lines.length >= 3 && hasLiteraryIntro(lines[0] || '')) return true

  const indentedLines = lines.filter((line) => /^\s{2,}\S/.test(line)).length
  if (indentedLines >= 2) return true

  const dialogueLines = lines.filter((line) => /^\s*[\u2014-]\s+\S/.test(line)).length
  if (dialogueLines >= 2) return true

  // Roman numeral lists common in vestibular questions (I. II. III. IV. ...)
  const romanNumeralLines = lines.filter((line) => /^[IVX]+\.\s+\S/.test(line.trim())).length
  if (romanNumeralLines >= 2) return true

  // Verse/poem heuristic: multiple short lines that aren't covered by other patterns
  // suggest verse format. Prose paragraphs rarely have 3+ lines all averaging < 75 chars.
  // Poems in vestibular PDFs typically have line lengths of 20\u201370 chars.
  if (lines.length >= 3) {
    const avgLineLength = lines.reduce((sum, line) => sum + line.trim().length, 0) / lines.length
    if (avgLineLength <= 75) return true
  }

  return false
}

function collapseSoftLineBreaks(paragraph: string): string {
  return paragraph
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function normalizeQuestionParagraphs(text: string): string[] {
  const rawParagraphs = text.split(/\n{2,}/).map((paragraph) => paragraph.trimEnd()).filter(p => !!p.trim())

  return rawParagraphs.map((paragraph, index) => {
    const previousParagraph = rawParagraphs[index - 1]
    if (shouldPreserveManualLineBreaks(paragraph, previousParagraph)) {
      return paragraph
    }

    return collapseSoftLineBreaks(paragraph)
  })
}

function renderMarkdownChildren(children: ReactNode, keyPrefix: string): ReactNode {
  return Children.map(children, (child, childIndex) => {
    if (typeof child === 'string') {
      return renderInlineRichText(child, `${keyPrefix}-${childIndex}`)
    }

    if (typeof child === 'number' || typeof child === 'bigint') {
      return String(child)
    }

    if (child == null || typeof child === 'boolean') {
      return null
    }

    if (isValidElement(child)) {
      return child
    }

    // Defensive fallback: never pass raw objects as JSX children.
    return String(child)
  })
}

function renderInlineMarkdown(text: string, key: string) {
  return (
    <ReactMarkdown
      key={key}
      components={{
        p: ({ children }) => <Fragment>{children}</Fragment>,
        ul: ({ children }) => <Fragment>{children}</Fragment>,
        ol: ({ children }) => <Fragment>{children}</Fragment>,
        li: ({ children }) => <Fragment>{children} </Fragment>,
        img: ({ src, alt }) => <MarkdownImage src={typeof src === 'string' ? src : undefined} alt={alt} />,
      }}
    >
      {String(text ?? '')}
    </ReactMarkdown>
  )
}

function renderInlineMarkdownWithUnderline(text: string, keyPrefix: string): ReactNode {
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  underlineSegmentRegex.lastIndex = 0

  while ((match = underlineSegmentRegex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index)
    if (before) {
      const trimmed = before.trimEnd()
      if (trimmed) parts.push(renderInlineMarkdown(trimmed, `${keyPrefix}-plain-${parts.length}`))
      if (before.length > trimmed.length) parts.push(' ')
    }

    parts.push(
      <u key={`${keyPrefix}-underline-${parts.length}`} className="underline underline-offset-2">
        {renderInlineMarkdown(match[1] || '', `${keyPrefix}-underline-text-${parts.length}`)}
      </u>
    )
    lastIndex = match.index + match[0].length
  }

  const after = text.slice(lastIndex)
  if (after) {
    const trimmed = after.trimStart()
    if (after.length > trimmed.length) parts.push(' ')
    if (trimmed) parts.push(renderInlineMarkdown(trimmed, `${keyPrefix}-plain-${parts.length}`))
  }

  return parts.length > 0 ? parts : renderInlineMarkdown(text, `${keyPrefix}-plain`)
}

function MarkdownImage({ src, alt }: { src?: string; alt?: string }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return <span className="text-sm italic text-slate-400 dark:text-slate-500">(Imagem indisponível)</span>
  }

  return (
    <span className="my-4 block max-w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt || ''}
        className="mx-auto block h-auto max-h-[26rem] w-auto max-w-full object-contain"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </span>
  )
}

// Fórmula em display (semirreações, equações longas) é, no conteúdo real,
// UMA linha só — quebrar ela no meio (bug anterior, CSS forçando
// white-space:normal) não faz jus ao conteúdo. Prioridade: ENCOLHER a
// fórmula até caber inteira numa linha (até um piso legível); só se mesmo
// assim não couber é que sobra scroll horizontal — com um ícone bem
// discreto ao lado (sem texto, pra não virar ruído quando a maioria das
// fórmulas nem chega a precisar disso).
//
// Encolhe via `font-size` (em vez de `transform: scale`) porque o HTML do
// KaTeX é inteiramente medido em `em`/`ex` — mudar o font-size do container
// encolhe largura E altura corretamente na mesma proporção, sem sobrar (ou
// faltar) espaço, e sem precisar calcular/replicar manualmente a altura
// escalada (isso já deu bug: alturas calculadas "na mão" cortavam a
// fórmula quando a barra de scroll de verdade entrava em cena).
const KATEX_MIN_SCALE = 0.72

// Quando uma questão tem mais de uma fórmula em display (ex.: duas
// semirreações), cada uma encolhendo de forma independente faz a curta
// ficar 100% e a longa ficar bem menor — mesma questão, tamanhos
// visivelmente diferentes, parece erro. Em vez disso, todas as fórmulas de
// uma mesma questão compartilham o MESMO encolhimento (o maior necessário
// entre elas), pra ficarem visualmente consistentes — mesmo que a curta
// sozinha coubesse maior.
//
// O "escopo" de uma questão é o ancestral DOM mais próximo com
// `data-question-id` (já presente no card de cada questão nas telas real
// do aluno e no preview do founder). Sem esse marcador (ex.: painel admin,
// explorador de banco de questões), cada fórmula volta a encolher sozinha
// — comportamento idêntico ao de antes, sem regressão.
type KatexScopeEntry = {
  ratios: Map<number, number>
  appliers: Map<number, (groupScale: number) => void>
}

const katexScopeRegistry = new WeakMap<Element, KatexScopeEntry>()
let katexInstanceCounter = 0

function getKatexScopeEntry(scopeEl: Element): KatexScopeEntry {
  let entry = katexScopeRegistry.get(scopeEl)
  if (!entry) {
    entry = { ratios: new Map(), appliers: new Map() }
    katexScopeRegistry.set(scopeEl, entry)
  }
  return entry
}

function computeKatexGroupScale(entry: KatexScopeEntry): number {
  let min = 1
  for (const ratio of entry.ratios.values()) {
    if (ratio < min) min = ratio
  }
  return Math.max(KATEX_MIN_SCALE, min)
}

function KatexDisplayBlock({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const instanceIdRef = useRef(0)
  if (!instanceIdRef.current) instanceIdRef.current = ++katexInstanceCounter
  const [state, setState] = useState<{ scale: number; overflowing: boolean } | null>(null)

  useLayoutEffect(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!container || !content) return

    const instanceId = instanceIdRef.current
    const scopeEl = container.closest('[data-question-id]')
    const scopeEntry = scopeEl ? getKatexScopeEntry(scopeEl) : null

    // Valores da ÚLTIMA medição desta fórmula — o "applier" registrado no
    // grupo é chamado por QUALQUER fórmula-irmã que (re)meça depois (ex.:
    // uma que monta depois ou muda de tamanho no resize), então precisa
    // sempre aplicar o groupScale sobre a medição mais recente, não a do
    // mount.
    let lastNaturalWidth = 0
    let lastAvailable = 0

    const applyScale = (groupScale: number) => {
      if (groupScale >= 1 || lastAvailable <= 0) {
        content.style.fontSize = ''
        setState(null)
        return
      }
      content.style.fontSize = `${groupScale}em`
      setState({ scale: groupScale, overflowing: lastNaturalWidth * groupScale > lastAvailable + 1 })
    }

    const recompute = () => {
      // Volta pro tamanho natural antes de medir de novo (ex.: resize) —
      // senão o scrollWidth reflete o tamanho JÁ encolhido de uma medição
      // anterior, não o tamanho real da fórmula.
      content.style.fontSize = ''
      lastNaturalWidth = content.scrollWidth
      lastAvailable = container.clientWidth
      const ownNeeded =
        lastAvailable > 0 && lastNaturalWidth > 0 ? Math.min(1, lastAvailable / lastNaturalWidth) : 1

      if (scopeEntry) {
        scopeEntry.ratios.set(instanceId, ownNeeded)
        scopeEntry.appliers.set(instanceId, applyScale)
        const groupScale = computeKatexGroupScale(scopeEntry)
        for (const applier of scopeEntry.appliers.values()) applier(groupScale)
      } else {
        applyScale(Math.max(KATEX_MIN_SCALE, ownNeeded))
      }
    }

    recompute()
    const resizeObserver = new ResizeObserver(recompute)
    resizeObserver.observe(container)
    return () => {
      resizeObserver.disconnect()
      if (scopeEntry) {
        scopeEntry.ratios.delete(instanceId)
        scopeEntry.appliers.delete(instanceId)
        if (scopeEntry.ratios.size > 0) {
          const groupScale = computeKatexGroupScale(scopeEntry)
          for (const applier of scopeEntry.appliers.values()) applier(groupScale)
        }
      }
    }
  }, [html])

  return (
    <span className="katex-display-block-outer flex max-w-full items-center gap-1">
      <div
        ref={containerRef}
        className={`katex-fragment katex-display-wrap min-w-0 flex-1 ${state?.overflowing ? 'custom-scrollbar overflow-x-auto' : 'overflow-hidden'}`}
      >
        <div ref={contentRef} style={{ width: 'max-content' }} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
      {state?.overflowing && (
        <svg
          viewBox="0 0 24 24"
          aria-label="Arraste para o lado para ver a fórmula completa"
          className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 6 3 12l5 6M16 6l5 6-5 6" />
        </svg>
      )}
    </span>
  )
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="my-3 leading-relaxed">{renderMarkdownChildren(children, 'md-p')}</p>,
  h1: ({ children }) => <h1 className="mt-5 mb-3 text-xl font-bold leading-tight">{renderMarkdownChildren(children, 'md-h1')}</h1>,
  h2: ({ children }) => <h2 className="mt-5 mb-3 text-lg font-bold leading-tight">{renderMarkdownChildren(children, 'md-h2')}</h2>,
  h3: ({ children }) => <h3 className="mt-4 mb-2 text-base font-semibold leading-tight">{renderMarkdownChildren(children, 'md-h3')}</h3>,
  h4: ({ children }) => <h4 className="mt-4 mb-2 text-sm font-semibold uppercase tracking-wide">{renderMarkdownChildren(children, 'md-h4')}</h4>,
  ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{renderMarkdownChildren(children, 'md-li')}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-4 border-slate-300 pl-4 italic text-slate-600 dark:border-slate-700 dark:text-slate-300">
      {renderMarkdownChildren(children, 'md-blockquote')}
    </blockquote>
  ),
  strong: ({ children }) => <strong className="font-semibold">{renderMarkdownChildren(children, 'md-strong')}</strong>,
  em: ({ children }) => <em className="italic">{renderMarkdownChildren(children, 'md-em')}</em>,
  img: ({ src, alt }) => <MarkdownImage src={typeof src === 'string' ? src : undefined} alt={alt} />,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="break-all text-blue-700 underline underline-offset-2 dark:text-blue-300"
    >
      {renderMarkdownChildren(children, 'md-link')}
    </a>
  ),
}

function renderInlineRichText(text: string, keyPrefix: string) {
  const segments = text.split(mathSegmentRegex).filter(Boolean)

  return segments.map((segment, segmentIndex) => {
    const previousSegment = segments[segmentIndex - 1] || ''
    const nextSegment = segments[segmentIndex + 1] || ''
    const isMath =
      (segment.startsWith('$$') || (segment.startsWith('$') && segment.endsWith('$'))) &&
      isLikelyMathSegment(segment)

    if (!isMath) {
      if (segment.startsWith('$') && segment.endsWith('$')) {
        const plainText = normalizePlainLatexText(segment)
        return (
          <span key={`${keyPrefix}-${segmentIndex}-${segment.slice(0, 20)}`} className="whitespace-pre-wrap">
            {renderInlineMarkdownWithUnderline(String(plainText ?? ''), `${keyPrefix}-${segmentIndex}-plain-latex`)}
          </span>
        )
      }

      const lines = segment.split('\n')
      return (
        <span key={`${keyPrefix}-${segmentIndex}-${segment.slice(0, 20)}`} className="whitespace-pre-wrap">
          {lines.map((line, lineIndex) => (
            <Fragment key={lineIndex}>
              {lineIndex > 0 && <br />}
              {isStandaloneOrderedListMarker(line) ? (
                line
              ) : (
                renderInlineMarkdownWithUnderline(String(line ?? ''), `${keyPrefix}-${segmentIndex}-${lineIndex}`)
              )}
            </Fragment>
          ))}
        </span>
      )
    }

    const rawLatex = normalizeLatexForKatex(segment)
    const latex = rawLatex.replace(/(?<!\\)%/g, '\\%')
    const needsLeadingSpace = /\s$/.test(previousSegment)
    const needsTrailingSpace = /^\s/.test(nextSegment)
    const isDisplayMath = segment.startsWith('$$')
    try {
      const html = katex.renderToString(latex, {
        throwOnError: false,
        displayMode: isDisplayMath,
        output: 'html',
      } as KatexRenderOptions)
      return (
        <Fragment key={`${keyPrefix}-${segmentIndex}-${latex.slice(0, 20)}`}>
          {needsLeadingSpace ? ' ' : null}
          {isDisplayMath ? (
            <span className="my-3 block max-w-full">
              <KatexDisplayBlock html={html} />
            </span>
          ) : (
            <span
              className="katex-fragment inline-block max-w-full align-baseline"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
          {needsTrailingSpace ? ' ' : null}
        </Fragment>
      )
    } catch {
      return (
        <code
          key={`${keyPrefix}-${segmentIndex}-${latex.slice(0, 20)}`}
          className="rounded bg-slate-100 px-1.5 py-0.5 text-sm text-slate-700"
        >
          {latex}
        </code>
      )
    }
  })
}

export function QuestionRichText({ text, className, style }: { text?: string | null; className?: string; style?: CSSProperties }) {
  const safeText = typeof text === 'string' ? text : text == null ? '' : String(text)
  const normalized = formatScientificText(safeText)
  const paragraphs = useMemo(
    () => normalizeQuestionParagraphs(normalized),
    [normalized],
  )

  return (
    <div className={className} style={style}>
      {paragraphs.map((paragraph, paragraphIndex) => {
        const table = parseMarkdownTable(paragraph)
        if (table) {
          return (
            <div key={`${paragraphIndex}-${paragraph.slice(0, 20)}`} className="my-4 overflow-x-auto">
              <table className="min-w-full border-collapse rounded-xl border border-slate-300 bg-white text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    {table.headers.map((header, headerIndex) => (
                      <th
                        key={`${paragraphIndex}-header-${headerIndex}`}
                        className={`border border-slate-300 px-4 py-2 font-semibold text-slate-900 ${
                          table.aligns[headerIndex] === 'center'
                            ? 'text-center'
                            : table.aligns[headerIndex] === 'right'
                              ? 'text-right'
                              : 'text-left'
                        }`}
                      >
                        {renderInlineRichText(header, `${paragraphIndex}-header-${headerIndex}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, rowIndex) => (
                    <tr key={`${paragraphIndex}-row-${rowIndex}`} className="odd:bg-white even:bg-slate-50">
                      {row.map((cell, cellIndex) => (
                        <td
                          key={`${paragraphIndex}-row-${rowIndex}-cell-${cellIndex}`}
                          className={`border border-slate-300 px-4 py-2 text-slate-700 ${
                            table.aligns[cellIndex] === 'center'
                              ? 'text-center'
                              : table.aligns[cellIndex] === 'right'
                                ? 'text-right'
                                : 'text-left'
                          }`}
                        >
                          {renderInlineRichText(formatScientificText(cell), `${paragraphIndex}-row-${rowIndex}-cell-${cellIndex}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }

        if (paragraph.trimStart().startsWith('§ ')) {
          // Remove o marcador de abertura e, quando presente, o de fechamento
          // ("§ ... §") — o fechamento é opcional e serve apenas para
          // delimitar a legenda com precisão na origem dos dados.
          const withoutOpening = paragraph.trimStart().slice(2).trimEnd()
          const content = withoutOpening.endsWith('§')
            ? withoutOpening.slice(0, -1).trimEnd()
            : withoutOpening
          return (
            <p key={`${paragraphIndex}-${paragraph.slice(0, 20)}`} className="mt-1 mb-3 text-sm italic text-slate-500 dark:text-slate-400">
              {renderInlineRichText(content, `${paragraphIndex}-fonte`)}
            </p>
          )
        }

        if (isMarkdownBlock(paragraph)) {
          return (
            <ReactMarkdown
              key={`${paragraphIndex}-${paragraph.slice(0, 20)}`}
              components={markdownComponents}
            >
              {String(paragraph ?? '')}
            </ReactMarkdown>
          )
        }

        // Handle block-level italic: a multi-line block whose entire text is wrapped
        // in *...* (e.g. a poem stored as "*line1\nline2\nline3*").  ReactMarkdown
        // can't resolve an italic span that opens on line 1 and closes on the last
        // line — it renders the asterisks literally.  Detect and strip the wrapper
        // here, then apply italic via CSS instead.
        if (paragraph.includes('\n') && /^\*[^*]/.test(paragraph) && /[^*]\*$/.test(paragraph)) {
          const innerText = paragraph.slice(1, -1)
          return (
            <p key={`${paragraphIndex}-${paragraph.slice(0, 20)}`} className="my-3 leading-relaxed italic">
              {renderInlineRichText(innerText, `${paragraphIndex}`)}
            </p>
          )
        }

        return (
          <p key={`${paragraphIndex}-${paragraph.slice(0, 20)}`} className="my-3 leading-relaxed">
            {renderInlineRichText(paragraph, `${paragraphIndex}`)}
          </p>
        )
      })}
    </div>
  )
}
