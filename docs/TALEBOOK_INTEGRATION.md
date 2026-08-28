# Talebook integration contract

## Why this boundary fits Talebook

Talebook already ships Candle Reader as versioned static JavaScript. `komga-reader` therefore provides a self-contained `Reader` browser facade in addition to its Vue component: Talebook can pin and serve the built ESM/CSS without adding a Git npm dependency, while the facade remains isolated from Vuetify, Pinia, Vue Router, Talebook stores, and Komga services.

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

## Static browser adapter example

Build with `npm run build:browser`, copy `browser-dist/komga-reader.es.js` and `browser-dist/style.css` to a versioned same-origin static directory, then dynamically load the facade only on the comic route:

```ts
const moduleUrl = '/static/komga-reader/komga-reader.es.js?v=<pinned-version>'
const { Reader } = await import(/* @vite-ignore */ moduleUrl)

const reader = new Reader(readerElement, {
  manifest,
  initialProgress,
  onProgress: persistProgress,
  onExit: ({ progress }) => closeReader(progress),
  onError: handleError,
})

onBeforeUnmount(() => reader.destroy())
```

The browser bundle includes an isolated Vue runtime, has no bare `vue` import, and does not require a global `Vue`. Talebook still owns all API calls and contract validation. The facade only receives a validated manifest and callback functions; `destroy()` unmounts its private application and is idempotent.

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
