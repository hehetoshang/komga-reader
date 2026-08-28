import type { PageLayout, ReaderPage } from '../types'

export interface SpreadPage extends ReaderPage {
  blank?: boolean
}

export type ReaderSpread = SpreadPage[]

/**
 * Build cover-aware spreads. This preserves Komga's handling of cover pages,
 * landscape pages, and a trailing blank while avoiding DOM/canvas coupling.
 */
export function buildSpreads(pages: readonly ReaderPage[], layout: PageLayout): ReaderSpread[] {
  if (pages.length === 0) return []
  if (layout === 'single') return pages.map((page) => [page])

  const queue = [...pages]
  const spreads: ReaderSpread[] = []
  let trailing: ReaderSpread | undefined

  if (layout === 'double') {
    const first = queue.shift() as ReaderPage
    spreads.push(isLandscape(first) ? [first] : [blankFor(first), first])

    if (queue.length > 0) {
      const last = queue.pop() as ReaderPage
      trailing = isLandscape(last) ? [last] : [last, blankFor(last)]
    }
  }

  while (queue.length > 0) {
    const first = queue.shift() as ReaderPage
    if (isLandscape(first)) {
      spreads.push([first])
      continue
    }

    const second = queue.shift()
    if (!second) {
      spreads.push([first, blankFor(first)])
    } else if (isLandscape(second)) {
      spreads.push([first, blankFor(first)], [second])
    } else {
      spreads.push([first, second])
    }
  }

  if (trailing) spreads.push(trailing)
  return spreads
}

export function spreadIndexForPage(spreads: readonly ReaderSpread[], pageId: ReaderPage['id']): number {
  const index = spreads.findIndex((spread) => spread.some((page) => !page.blank && page.id === pageId))
  return index < 0 ? 0 : index
}

export function isLandscape(page: Pick<ReaderPage, 'width' | 'height'>): boolean {
  return (page.width ?? 0) > (page.height ?? 0)
}

function blankFor(page: ReaderPage): SpreadPage {
  return {
    id: `__blank-${String(page.id)}`,
    src: '',
    width: page.width ?? 20,
    height: page.height ?? 30,
    alt: '',
    blank: true,
  }
}
