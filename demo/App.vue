<template>
  <div class="demo-shell">
    <ComicReader
      :manifest="manifest"
      :initial-progress="initialProgress"
      :config="config"
      @progress="saveProgress"
      @exit="onExit"
      @error="onError"
      @config-change="config = $event"
    />
    <output class="demo-event" aria-live="polite">{{ lastEvent }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ComicReader } from '../src'
import type {
  InitialReaderProgress,
  PageManifest,
  ReaderConfigInput,
  ReaderError,
  ReaderExit,
  ReaderProgress,
} from '../src'

const storageKey = 'komga-reader-demo-progress'
const manifest: PageManifest = {
  id: 'static-demo',
  title: 'Static page manifest demo',
  pages: [
    { id: 'cover', src: '/demo-pages/01.svg', width: 800, height: 1200, mimeType: 'image/svg+xml' },
    { id: 'city', src: '/demo-pages/02.svg', width: 800, height: 1200, mimeType: 'image/svg+xml' },
    { id: 'landscape', src: '/demo-pages/03.svg', width: 1400, height: 800, mimeType: 'image/svg+xml' },
    { id: 'night', src: '/demo-pages/04.svg', width: 800, height: 1200, mimeType: 'image/svg+xml' },
    { id: 'end', src: '/demo-pages/05.svg', width: 800, height: 1200, mimeType: 'image/svg+xml' },
  ],
}
const config = ref<ReaderConfigInput>({
  direction: 'ltr',
  layout: 'single',
  pagedScale: 'screen',
  showToolbarInitially: true,
})
const initialProgress = readProgress()
const lastEvent = ref('Ready — this demo uses only local SVG fixtures.')

function readProgress(): InitialReaderProgress | undefined {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return { pageId: 'cover' }
    const saved = JSON.parse(raw) as Partial<ReaderProgress>
    return { pageId: saved.pageId, pageIndex: saved.pageIndex }
  } catch {
    return { pageId: 'cover' }
  }
}

function saveProgress(progress: ReaderProgress): void {
  localStorage.setItem(storageKey, JSON.stringify(progress))
  lastEvent.value = `progress: page ${progress.pageNumber}/${progress.pagesCount} (${progress.percent}%)`
}

function onExit(event: ReaderExit): void {
  lastEvent.value = `exit: ${event.reason} at page ${event.progress.pageNumber}`
}

function onError(error: ReaderError): void {
  lastEvent.value = `error: ${error.code} — ${error.message}`
}
</script>

<style scoped>
.demo-shell {
  position: relative;
  width: 100%;
  height: 100%;
}

.demo-event {
  position: absolute;
  z-index: 50;
  right: 10px;
  bottom: 62px;
  max-width: calc(100% - 20px);
  padding: 5px 9px;
  border-radius: 5px;
  color: #bae6fd;
  background: rgb(2 6 23 / 78%);
  font: 12px/1.4 ui-monospace, monospace;
  pointer-events: none;
}
</style>
