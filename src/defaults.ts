import type { ReaderConfig, ReaderConfigInput } from './types'

export const defaultReaderConfig: Readonly<ReaderConfig> = Object.freeze({
  direction: 'ltr',
  layout: 'single',
  pagedScale: 'screen',
  continuousScale: 'width',
  sidePadding: 0,
  pageGap: 0,
  background: '#000000',
  preload: 2,
  animations: true,
  swipe: true,
  showToolbarInitially: true,
})

const directions = new Set(['ltr', 'rtl', 'vertical', 'webtoon'])
const layouts = new Set(['single', 'double', 'double-no-cover'])
const pagedScales = new Set(['screen', 'width', 'width-shrink-only', 'height', 'original'])
const continuousScales = new Set(['width', 'original'])

export function mergeReaderConfig(input: ReaderConfigInput = {}): ReaderConfig {
  return {
    direction: directions.has(input.direction ?? '') ? input.direction as ReaderConfig['direction'] : defaultReaderConfig.direction,
    layout: layouts.has(input.layout ?? '') ? input.layout as ReaderConfig['layout'] : defaultReaderConfig.layout,
    pagedScale: pagedScales.has(input.pagedScale ?? '') ? input.pagedScale as ReaderConfig['pagedScale'] : defaultReaderConfig.pagedScale,
    continuousScale: continuousScales.has(input.continuousScale ?? '') ? input.continuousScale as ReaderConfig['continuousScale'] : defaultReaderConfig.continuousScale,
    sidePadding: clampNumber(input.sidePadding, 0, 40, defaultReaderConfig.sidePadding),
    pageGap: clampNumber(input.pageGap, 0, 64, defaultReaderConfig.pageGap),
    background: typeof input.background === 'string' && input.background.trim() ? input.background : defaultReaderConfig.background,
    preload: Math.round(clampNumber(input.preload, 0, 10, defaultReaderConfig.preload)),
    animations: typeof input.animations === 'boolean' ? input.animations : defaultReaderConfig.animations,
    swipe: typeof input.swipe === 'boolean' ? input.swipe : defaultReaderConfig.swipe,
    showToolbarInitially: typeof input.showToolbarInitially === 'boolean' ? input.showToolbarInitially : defaultReaderConfig.showToolbarInitially,
  }
}

function clampNumber(value: number | undefined, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}
