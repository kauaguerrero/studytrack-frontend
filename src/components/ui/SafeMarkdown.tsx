'use client'

import ReactMarkdown from 'react-markdown'
import type { ComponentProps } from 'react'

type SafeMarkdownProps = Omit<ComponentProps<typeof ReactMarkdown>, 'children'> & {
  children?: unknown
}

export function SafeMarkdown({ children, ...props }: SafeMarkdownProps) {
  const safeChildren = typeof children === 'string' ? children : children == null ? '' : String(children)
  return <ReactMarkdown {...props}>{safeChildren}</ReactMarkdown>
}

