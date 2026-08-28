export type ReaderPageId = string | number

export interface ReaderPage {
  /** Stable identifier used when restoring progress. */
  id: ReaderPageId
  /** Browser-loadable image URL. Same-origin cookie authentication is supported. */
  src: string
  /** Optional accessible label. */
  alt?: string
  /** Intrinsic dimensions improve spread and continuous-layout calculations. */
  width?: number
  height?: number
  mimeType?: string
  srcset?: string
  crossOrigin?: '' | 'anonymous' | 'use-credentials'
  referrerPolicy?: ReferrerPolicy
}

export interface PageManifest {
  id?: ReaderPageId
  title?: string
  pages: readonly ReaderPage[]
}

export type ReadingDirection = 'ltr' | 'rtl' | 'vertical' | 'webtoon'
export type PageLayout = 'single' | 'double' | 'double-no-cover'
export type PagedScale = 'screen' | 'width' | 'width-shrink-only' | 'height' | 'original'
export type ContinuousScale = 'width' | 'original'

export interface ReaderConfig {
  direction: ReadingDirection
  layout: PageLayout
  pagedScale: PagedScale
  continuousScale: ContinuousScale
  sidePadding: number
  pageGap: number
  background: string
  preload: number
  animations: boolean
  swipe: boolean
  showToolbarInitially: boolean
}

export type ReaderConfigInput = Partial<ReaderConfig>

export interface InitialReaderProgress {
  /** Stable page id takes precedence over pageIndex when both are present. */
  pageId?: ReaderPageId
  /** Zero-based index, matching progress events and Talebook persistence examples. */
  pageIndex?: number
}

export interface ReaderProgress {
  pageId: ReaderPageId
  /** Zero-based index in manifest.pages. */
  pageIndex: number
  /** One-based page number for human-facing controls. */
  pageNumber: number
  pagesCount: number
  percent: number
  completed: boolean
  timestamp: number
}

export type ReaderExitReason = 'button' | 'keyboard' | 'end'

export interface ReaderExit {
  reason: ReaderExitReason
  progress: ReaderProgress
}

export type ReaderErrorCode = 'empty-manifest' | 'invalid-manifest' | 'image-load' | 'fullscreen'

export interface ReaderError {
  code: ReaderErrorCode
  message: string
  page?: ReaderPage
  cause?: unknown
}

export interface ManifestValidationResult {
  valid: boolean
  code?: Extract<ReaderErrorCode, 'empty-manifest' | 'invalid-manifest'>
  message?: string
}
