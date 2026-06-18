'use client'

import { useState } from 'react'
import { QuestionRichText } from '@/components/questions/QuestionRichText'
import {
  findImageAsset,
  getQuestionContentBlocks,
  getQuestionImageAssets,
  getSupportImagesLayout,
  type QuestionImageAsset,
} from '@/components/questions/rendering'

function imageContainerClass(layout: string, isAlternative = false) {
  if (isAlternative) {
    return 'inline-flex max-w-full min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700'
  }

  return layout === 'side_by_side'
    ? 'min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50'
    : 'min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50'
}

function QuestionImageFigure({
  src,
  alt,
  asset,
  isAlternative = false,
}: {
  src: string
  alt: string
  asset?: QuestionImageAsset | null
  isAlternative?: boolean
}) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return <span className="text-sm italic text-slate-400 dark:text-slate-500">(Imagem indisponível)</span>
  }

  return (
    <figure className={imageContainerClass(asset?.original_layout || 'single', isAlternative)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={asset?.caption || alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className={[
          'mx-auto block h-auto max-w-full object-contain',
          isAlternative ? 'max-h-32 md:max-h-40' : 'max-h-[26rem]',
          asset?.display_hint === 'full_width' ? 'w-full' : 'w-auto',
        ].join(' ')}
      />
      {(asset?.caption || asset?.source) && (
        <figcaption className="mt-2 space-y-1 text-center text-[11px] leading-snug text-slate-500 dark:text-slate-400">
          {asset.caption && <QuestionRichText text={asset.caption} />}
          {asset.source && <QuestionRichText text={asset.source} />}
        </figcaption>
      )}
    </figure>
  )
}

export function QuestionSupportImages({
  images,
  metadata,
  className = '',
}: {
  images: string[]
  metadata?: unknown
  className?: string
}) {
  if (images.length === 0) return null

  const assets = getQuestionImageAssets(metadata)
  const layout = getSupportImagesLayout(assets, images)
  const orderedImages = [...images].sort((a, b) => {
    const assetA = findImageAsset(assets, a)
    const assetB = findImageAsset(assets, b)
    return (assetA?.source_order ?? Number.MAX_SAFE_INTEGER) - (assetB?.source_order ?? Number.MAX_SAFE_INTEGER)
  })

  return (
    <div
      className={[
        layout === 'side_by_side' ? 'grid gap-4 md:grid-cols-2' : 'space-y-4',
        className,
      ].join(' ')}
    >
      {orderedImages.map((imageUrl, index) => (
        <QuestionImageFigure
          key={`${imageUrl}-${index}`}
          src={imageUrl}
          alt={`Material de apoio ${index + 1}`}
          asset={findImageAsset(assets, imageUrl)}
        />
      ))}
    </div>
  )
}

export function AlternativeImages({
  images,
  metadata,
  letter,
}: {
  images: string[]
  metadata?: unknown
  letter: string
}) {
  if (images.length === 0) return null

  const assets = getQuestionImageAssets(metadata)

  return (
    <div className="mb-2 flex max-w-full min-w-0 flex-col gap-2">
      {images.map((imageUrl, imageIndex) => (
        <QuestionImageFigure
          key={`${letter}-img-${imageIndex}`}
          src={imageUrl}
          alt={`Alternativa ${letter}`}
          asset={findImageAsset(assets, imageUrl, {
            role: 'alternative_image',
            alternativeLetter: letter,
          })}
          isAlternative
        />
      ))}
    </div>
  )
}

function blockAlignmentClass(alignment?: string | null) {
  if (alignment === 'center') return 'text-center'
  if (alignment === 'right') return 'text-right'
  if (alignment === 'justify') return 'text-justify'
  return 'text-left'
}

export function QuestionContentBlocks({
  metadata,
  className = '',
}: {
  metadata?: unknown
  className?: string
}) {
  const blocks = getQuestionContentBlocks(metadata)
  if (blocks.length === 0) return null

  return (
    <div className={['space-y-4', className].join(' ')}>
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}-${block.source_order ?? 'x'}`
        if (block.type === 'spacer') return <div key={key} className="h-2" />

        if (block.type === 'image' && block.url) {
          return (
            <QuestionImageFigure
              key={key}
              src={block.url}
              alt={block.label || block.caption || 'Imagem da questão'}
              asset={{
                url: block.url,
                caption: block.caption || block.label || null,
                source: block.source || null,
                original_layout: block.layout || 'single',
                display_hint: 'responsive_fit',
                source_order: block.source_order ?? index,
              }}
            />
          )
        }

        const text = block.text || block.caption || block.source || ''
        if (!text) return null

        const isSource = block.type === 'source'
        const isInstruction = block.type === 'instruction'
        const isHeading = block.type === 'heading'
        return (
          <div
            key={key}
            className={[
              blockAlignmentClass(block.alignment),
              isSource ? 'text-[12px] leading-relaxed text-slate-500 dark:text-slate-400' : '',
              isInstruction ? 'rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800' : '',
              isHeading ? 'text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-slate-100' : '',
            ].join(' ')}
          >
            {block.label && block.type !== 'caption' && (
              <div className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {block.label}
              </div>
            )}
            <QuestionRichText text={text} />
          </div>
        )
      })}
    </div>
  )
}
