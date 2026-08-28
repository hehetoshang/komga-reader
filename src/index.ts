import ComicReader from './components/ComicReader.vue'

export { ComicReader }
export { buildSpreads, isLandscape, spreadIndexForPage } from './core/spreads'
export { clampPage, resolveInitialPage, validateManifest } from './core/manifest'
export { defaultReaderConfig, mergeReaderConfig } from './defaults'
export type {
  ContinuousScale,
  InitialReaderProgress,
  ManifestValidationResult,
  PageLayout,
  PageManifest,
  PagedScale,
  ReaderConfig,
  ReaderConfigInput,
  ReaderError,
  ReaderErrorCode,
  ReaderExit,
  ReaderExitReason,
  ReaderPage,
  ReaderPageId,
  ReaderProgress,
  ReadingDirection,
} from './types'
export type { ReaderSpread, SpreadPage } from './core/spreads'

export default ComicReader
