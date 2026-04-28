'use client'

import { Fragment, useMemo } from 'react'
import type { CSSProperties } from 'react'
import ReactMarkdown from 'react-markdown'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { formatScientificText } from '@/lib/scientific-text'

const mathSegmentRegex = /(\$\$[\s\S]+?(?<!\\)\$\$|\$(?!\$)[\s\S]+?(?<!\\)\$)/g
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

function renderInlineRichText(text: string, keyPrefix: string) {
  const segments = text.split(mathSegmentRegex).filter(Boolean)

  return segments.map((segment, segmentIndex) => {
    const isMath =
      (segment.startsWith('$$') || (segment.startsWith('$') && segment.endsWith('$'))) &&
      isLikelyMathSegment(segment)

    if (!isMath) {
      const plainText =
        segment.startsWith('$') && segment.endsWith('$')
          ? normalizePlainLatexText(segment)
          : segment.replace(/\n+/g, ' ')

      return (
        <span key={`${keyPrefix}-${segmentIndex}-${segment.slice(0, 20)}`} className="whitespace-pre-wrap">
          <ReactMarkdown
            components={{
              p: ({ children }) => <Fragment>{children}</Fragment>,
            }}
          >
            {plainText}
          </ReactMarkdown>
        </span>
      )
    }

    const latex = normalizeLatexForKatex(segment)
    try {
      const html = katex.renderToString(latex, {
        throwOnError: false,
        displayMode: segment.startsWith('$$'),
        output: 'html',
      } as KatexRenderOptions)
      return (
        <span
          key={`${keyPrefix}-${segmentIndex}-${latex.slice(0, 20)}`}
          className="katex-fragment mx-1 inline-block align-baseline"
          dangerouslySetInnerHTML={{ __html: html }}
        />
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
  const normalized = formatScientificText(text || '')
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
          return <ReactMarkdown key={`${paragraphIndex}-${paragraph.slice(0, 20)}`}>{paragraph}</ReactMarkdown>
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
