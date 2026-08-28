# Talebook integration contract

## Why this boundary fits Talebook

Talebook PR [#1012](https://github.com/talebook/talebook/pull/1012) uses Nuxt 4, Vue 3.5, TypeScript-capable SFC tooling, Vuetify's Nuxt module, Pinia, and Vue Router 4. A Vue 3 component with plain DOM/CSS therefore integrates directly. Importing Komga's Vue 2 view would introduce incompatible Vuetify 2, Vuex, router, and Komga service assumptions.

The PR's book response adds:

- `media_type: 'comic' | 'ebook' | 'unknown'`;
- `online_readable: boolean`;
- `files[]` entries with `format`, `size`, `href`, and per-file `online_readable`;
- generic authenticated progress `GET/POST /api/book/:id/progress`, with an 8 KiB JSON object budget.

The PR intentionally keeps CBZ/ZIP/CBR/RAR online reading disabled and exposes no page-list/page-image route. The reader package must not infer pages from the downloadable archive URL or unpack untrusted archives in the browser.

## Stage-2 server responsibility

Before routing comic containers into this component, Talebook needs a resource-bounded, authenticated adapter that safely lists and serves ordered image pages. A proposed response is:

```ts
interface TalebookComicManifestResponse {
  err: 'ok'
  book_id: number
  title: string
  pages: Array<{
    id: string             // stable across one stored format revision
    index: number          // contiguous, zero-based order after natural sorting
    url: string            // same-origin authenticated image URL
    width?: number
    height?: number
    mime_type?: string
  }>
}
```

Recommended routes (names are proposals, not claims about PR #1012):

```text
GET /api/book/:id/comic/pages
GET /api/book/:id/comic/pages/:pageId
```

The backend must retain Talebook's archive security budgets, reject traversal/encryption/bombs, avoid trusting extensions, validate image entries, stream bounded bytes, authorize every request, and bind stable page ids to the current format revision. `Cache-Control`, range support, and thumbnail variants are server choices.

## Nuxt adapter example

```vue
<script setup lang="ts">
import { ComicReader } from '@hehetoshang/komga-reader'
import '@hehetoshang/komga-reader/style.css'
import type {
  InitialReaderProgress,
  PageManifest,
  ReaderError,
  ReaderProgress,
} from '@hehetoshang/komga-reader'

const route = useRoute()
const bid = Number(route.params.bid)
const backend = useBackend()

const [{ data: source }, { data: saved }] = await Promise.all([
  useAsyncData(`comic-pages-${bid}`, () => backend(`/book/${bid}/comic/pages`)),
  useAsyncData(`comic-progress-${bid}`, () => backend(`/book/${bid}/progress`)),
])

const manifest = computed<PageManifest>(() => ({
  id: bid,
  title: source.value.title,
  pages: source.value.pages
    .toSorted((a, b) => a.index - b.index)
    .map(page => ({
      id: page.id,
      src: page.url,
      width: page.width,
      height: page.height,
      mimeType: page.mime_type,
    })),
}))

const initialProgress = computed<InitialReaderProgress>(() => {
  const progress = saved.value?.progress
  return progress?.kind === 'comic' && progress?.version === 1
    ? { pageId: progress.pageId, pageIndex: progress.pageIndex }
    : { pageIndex: 0 }
})

let timer: ReturnType<typeof setTimeout> | undefined
function persistProgress(progress: ReaderProgress) {
  clearTimeout(timer)
  timer = setTimeout(() => backend(`/book/${bid}/progress`, {
    method: 'POST',
    body: {
      progress: {
        kind: 'comic',
        version: 1,
        pageId: progress.pageId,
        pageIndex: progress.pageIndex,
        percent: progress.percent,
        completed: progress.completed,
      },
    },
  }), 250)
}

function handleError(error: ReaderError) {
  useAlert().error(error.message)
}
</script>

<template>
  <div class="comic-reader-route">
    <ComicReader
      :manifest="manifest"
      :initial-progress="initialProgress"
      @progress="persistProgress"
      @exit="navigateTo(`/book/${bid}`)"
      @error="handleError"
    />
  </div>
</template>

<style scoped>
.comic-reader-route {
  width: 100%;
  height: 100dvh;
}
</style>
```

The example's page routes are deliberately marked as proposed. The progress routes and generic object shape already exist in PR #1012.

## Routing and book model behavior

A stage-2 Talebook integration should enable the comic reader only when all of these are true:

1. `book.media_type === 'comic'`;
2. a supported comic container is present;
3. the page manifest endpoint successfully returns at least one validated page;
4. the user has online-read permission.

Comic EPUB remains on Talebook's existing EPUB route. `online_readable` should not become `true` merely because this package exists; change it only after the server page adapter is available. On manifest failure, keep download/management available and show the server error rather than a blank reader.

## Progress and exit semantics

- Store `pageId` for stable restoration and `pageIndex` as a fallback.
- The component emits on initial mount, so the adapter may compare with the saved value before posting if write minimization matters.
- `completed` becomes true on the last page; Talebook can separately update its reading-state endpoint if product behavior requires it.
- `exit.reason === 'end'` means the user tried to advance past the final page. Talebook may return to detail, offer the next book, or mark complete.
- The component never calls Talebook APIs directly and never assumes route names, store shape, or account state.
