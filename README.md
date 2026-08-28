# komga-reader

> **Extracted from [gotson/komga](https://github.com/gotson/komga)** at upstream commit [`cba53ed3750fcc7b333293e093a6bfaa6afa3a26`](https://github.com/gotson/komga/commit/cba53ed3750fcc7b333293e093a6bfaa6afa3a26). This is an **unofficial project** and is not affiliated with or endorsed by Komga.

A standalone Vue 3 comic image reader driven by an ordered page manifest. It keeps the independently useful parts of Komga's image reader without requiring a Komga server, account, API client, Vuex store, or router.

No npm release has been published. This repository currently provides source and build artifacts only.

## Features

- paged reading in left-to-right, right-to-left, and vertical directions;
- webtoon/continuous mode with lazy image loading;
- single page, cover-aware double page, and double page without cover layouts;
- landscape-page isolation and original/width/height/screen scaling;
- keyboard, click-zone, slider, and swipe navigation;
- nearby-page preloading, fullscreen, thumbnail explorer, and reader settings;
- typed progress, exit, configuration, and actionable error events;
- no runtime dependency except the Vue 3 peer dependency.

See [Upstream audit and extraction map](docs/UPSTREAM_AUDIT.md) for exact source, dependency, style, test, asset, and license findings. Every removed or deferred upstream capability is listed there with a reason.

## Install from source

```bash
npm install github:hehetoshang/komga-reader
```

The package is intentionally **not published to npm** in this phase.

## Basic usage

```vue
<script setup lang="ts">
import { ComicReader } from '@hehetoshang/komga-reader'
import '@hehetoshang/komga-reader/style.css'
import type { PageManifest, ReaderProgress } from '@hehetoshang/komga-reader'

const manifest: PageManifest = {
  id: 42,
  title: 'Example comic',
  pages: [
    { id: 'cover', src: '/media/42/pages/1', width: 1200, height: 1800 },
    { id: 'page-2', src: '/media/42/pages/2', width: 1200, height: 1800 },
  ],
}

function persist(progress: ReaderProgress) {
  console.log(progress.pageId, progress.pageIndex, progress.percent)
}
</script>

<template>
  <div style="height: 100dvh">
    <ComicReader
      :manifest="manifest"
      :initial-progress="{ pageId: 'cover' }"
      :config="{ direction: 'rtl', layout: 'double' }"
      @progress="persist"
      @exit="router.back()"
      @error="console.error"
    />
  </div>
</template>
```

The host must give the component a definite height. Page `src` values are passed directly to `<img>`; same-origin authentication cookies therefore work naturally. The component does not fetch metadata or add authorization headers.

## Public contract

### Manifest

```ts
interface PageManifest {
  id?: string | number
  title?: string
  pages: readonly ReaderPage[] // displayed exactly in this order
}

interface ReaderPage {
  id: string | number          // stable and unique within the manifest
  src: string                  // browser-loadable image URL
  alt?: string
  width?: number
  height?: number
  mimeType?: string
  srcset?: string
  crossOrigin?: '' | 'anonymous' | 'use-credentials'
  referrerPolicy?: ReferrerPolicy
}
```

An empty manifest, duplicate id, blank URL, or invalid dimension emits `error` and renders an accessible error state.

### Props

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `manifest` | `PageManifest` | required | Ordered pages and optional title/id. |
| `initialPage` | `number` | `1` | One-based starting page. |
| `initialProgress` | `{ pageId?: PageId; pageIndex?: number }` | — | Restored progress. Stable `pageId` wins, then zero-based `pageIndex`, then `initialPage`. |
| `config` | `Partial<ReaderConfig>` | defaults below | Initial/controlled reading configuration. |

Configuration defaults:

```ts
{
  direction: 'ltr',            // ltr | rtl | vertical | webtoon
  layout: 'single',            // single | double | double-no-cover
  pagedScale: 'screen',        // screen | width | width-shrink-only | height | original
  continuousScale: 'width',    // width | original
  sidePadding: 0,              // clamped to 0..40 percent per side
  pageGap: 0,                  // clamped to 0..64 px
  background: '#000000',
  preload: 2,                  // clamped to 0..10 neighboring pages
  animations: true,
  swipe: true,
  showToolbarInitially: true,
}
```

### Events

| Event | Payload | When |
| --- | --- | --- |
| `progress` | `ReaderProgress` | Initial mount and every page change. `pageIndex` is zero-based; `pageNumber` is one-based. |
| `exit` | `{ reason, progress }` | Exit button, second-stage Escape, or an attempt to advance after the last page. |
| `error` | `{ code, message, page?, cause? }` | Invalid/empty manifest, image load failure, or fullscreen failure. |
| `config-change` | complete `ReaderConfig` | A built-in setting changes; the host can persist it. |

`ReaderProgress` contains stable `pageId`, `pageIndex`, `pageNumber`, `pagesCount`, percentage, `completed`, and a timestamp. The component also exposes `goTo(oneBasedPage)`, `next()`, `previous()`, and `toggleFullscreen()`.

## Static demo

```bash
npm install
npm run dev
# production fixture build
npm run build:demo
```

The demo manifest points only to SVG fixtures under `public/demo-pages/`. It makes no Komga or Talebook API request and stores demo progress only in browser `localStorage`.

## Talebook integration

Talebook's Nuxt 4/Vue 3 frontend can consume the component directly. PR [`talebook/talebook#1012`](https://github.com/talebook/talebook/pull/1012) already exposes `media_type`, `online_readable`, downloadable formats, and a generic 8 KiB JSON progress endpoint. It intentionally does **not** expose comic pages yet, so an authenticated, resource-bounded page manifest endpoint remains a stage-2 server responsibility.

The exact adapter, proposed response shape, existing progress calls, and route behavior are documented in [Talebook integration contract](docs/TALEBOOK_INTEGRATION.md). That boundary is explicit so this package does not silently retain Komga API/store/router coupling.

## Development

```bash
npm ci
npm run check
```

`check` runs ESLint, TypeScript/Vue type checking, unit/component tests, the library build, and the static demo build.

## License

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE). Adapted Komga portions retain Komga's MIT copyright notice. No Komga image/font/binary asset or Readium EPUB stylesheet is copied.
