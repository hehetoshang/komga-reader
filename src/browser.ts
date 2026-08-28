import { createApp } from 'vue'
import type { App, ComponentPublicInstance } from 'vue'
import ComicReader from './components/ComicReader.vue'
import type {
  InitialReaderProgress,
  PageManifest,
  ReaderConfig,
  ReaderConfigInput,
  ReaderError,
  ReaderExit,
  ReaderProgress,
} from './types'

export interface BrowserReaderOptions {
  manifest: PageManifest
  initialPage?: number
  initialProgress?: InitialReaderProgress
  config?: ReaderConfigInput
  onProgress?: (progress: ReaderProgress) => void
  onExit?: (event: ReaderExit) => void
  onError?: (error: ReaderError) => void
  onConfigChange?: (config: ReaderConfig) => void
}

interface ReaderControls {
  goTo: (page: number) => void
  next: () => void
  previous: () => void
  toggleFullscreen: () => Promise<void>
}

export type BrowserReaderTarget = string | Element

/**
 * Browser-native facade for hosts that consume a versioned static bundle.
 * It owns an isolated Vue application and does not require Vue in the host.
 */
export class Reader {
  private readonly app: App<Element>
  private readonly controls: ReaderControls
  private destroyed = false

  constructor(target: BrowserReaderTarget, options: BrowserReaderOptions) {
    const element = resolveTarget(target)
    this.app = createApp(ComicReader, {
      manifest: options.manifest,
      initialPage: options.initialPage,
      initialProgress: options.initialProgress,
      config: options.config,
      onProgress: options.onProgress,
      onExit: options.onExit,
      onError: options.onError,
      onConfigChange: options.onConfigChange,
    })
    this.controls = this.app.mount(element) as ComponentPublicInstance as unknown as ReaderControls
  }

  goTo(page: number): void {
    this.activeControls().goTo(page)
  }

  next(): void {
    this.activeControls().next()
  }

  previous(): void {
    this.activeControls().previous()
  }

  toggleFullscreen(): Promise<void> {
    return this.activeControls().toggleFullscreen()
  }

  destroy(): void {
    if (this.destroyed) return
    this.app.unmount()
    this.destroyed = true
  }

  private activeControls(): ReaderControls {
    if (this.destroyed) throw new Error('Comic reader has already been destroyed.')
    return this.controls
  }
}

function resolveTarget(target: BrowserReaderTarget): Element {
  if (typeof target !== 'string') return target
  if (typeof document === 'undefined') {
    throw new Error('Comic reader standalone bundle requires a browser DOM.')
  }
  const element = document.querySelector(target)
  if (!element) throw new Error(`Comic reader target not found: ${target}`)
  return element
}

export default Reader
