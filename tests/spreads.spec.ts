import { describe, expect, it } from 'vitest'
import { buildSpreads, isLandscape, spreadIndexForPage } from '../src/core/spreads'
import type { ReaderPage } from '../src/types'

const portrait = (id: number): ReaderPage => ({ id, src: `/${id}.jpg`, width: 800, height: 1200 })
const landscape = (id: number): ReaderPage => ({ id, src: `/${id}.jpg`, width: 1600, height: 900 })

describe('buildSpreads', () => {
  it('keeps each page in order for single-page mode', () => {
    expect(buildSpreads([portrait(1), portrait(2)], 'single').map((spread) => spread.map((page) => page.id)))
      .toEqual([[1], [2]])
  })

  it('keeps a portrait cover on the right and pads the final page', () => {
    const spreads = buildSpreads([portrait(1), portrait(2), portrait(3), portrait(4)], 'double')
    expect(spreads.map((spread) => spread.map((page) => page.blank ? 0 : page.id)))
      .toEqual([[0, 1], [2, 3], [4, 0]])
  })

  it('does not pair landscape pages', () => {
    const spreads = buildSpreads([landscape(1), portrait(2), landscape(3), portrait(4)], 'double-no-cover')
    expect(spreads.map((spread) => spread.map((page) => page.blank ? 0 : page.id)))
      .toEqual([[1], [2, 0], [3], [4, 0]])
  })

  it('pairs from page one when cover handling is disabled', () => {
    const spreads = buildSpreads([portrait(1), portrait(2), portrait(3)], 'double-no-cover')
    expect(spreads.map((spread) => spread.map((page) => page.blank ? 0 : page.id)))
      .toEqual([[1, 2], [3, 0]])
    expect(spreadIndexForPage(spreads, 3)).toBe(1)
  })

  it('detects landscape pages only with known wider dimensions', () => {
    expect(isLandscape(landscape(1))).toBe(true)
    expect(isLandscape({})).toBe(false)
  })
})
