'use client'

import { Children, Fragment, isValidElement, useMemo } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { formatScientificText } from '@/lib/scientific-text'

const mathSegmentRegex = /(\$\$[\s\S]+?(?<!\\)\$\$|\$(?!\$)[\s\S]+?(?<!\\)\$)/g
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
  return /^\s*(#{1,6}\s|>|\|.*\||[-*+]\s|\d+\.\s|!\[)/m.test(text)
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
      parts.push(renderInlineMarkdown(before, `${keyPrefix}-plain-${parts.length}`))
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
    parts.push(renderInlineMarkdown(after, `${keyPrefix}-plain-${parts.length}`))
  }

  return parts.length > 0 ? parts : renderInlineMarkdown(text, `${keyPrefix}-plain`)
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
  img: ({ src, alt }) => (
    <span className="my-4 block max-w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src || ''}
        alt={alt || 'Imagem da questão'}
        className="mx-auto block h-auto max-h-[26rem] w-auto max-w-full object-contain"
        loading="lazy"
      />
    </span>
  ),
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
          <span
            className={isDisplayMath ? 'katex-fragment katex-display-wrap my-3 block max-w-full' : 'katex-fragment inline-block max-w-full align-baseline'}
            dangerouslySetInnerHTML={{ __html: html }}
          />
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
    () => normalized.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean),
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

        return (
          <p key={`${paragraphIndex}-${paragraph.slice(0, 20)}`}>
            {renderInlineRichText(paragraph, `${paragraphIndex}`)}
          </p>
        )
      })}
    </div>
  )
}
