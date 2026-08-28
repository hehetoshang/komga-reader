# Upstream audit and extraction map

## Baseline

- Repository: <https://github.com/gotson/komga>
- Branch inspected: `master`
- Baseline commit: [`cba53ed3750fcc7b333293e093a6bfaa6afa3a26`](https://github.com/gotson/komga/commit/cba53ed3750fcc7b333293e093a6bfaa6afa3a26)
- Commit date: 2026-08-17T07:40:47Z
- Audit date: 2026-08-28
- Upstream license: MIT, copyright (c) 2019 Gauthier Roebroeck

A recursive tree scan of that commit found the active comic-image reader implementation under the legacy `komga-webui`. `next-ui` contains library/media pages but no equivalent comic reader source at this baseline. `komga-webui/src/router.ts` routes book image reading to `DivinaReader.vue`.

## Source and behavior inventory

| Upstream source | Actual role | Direct dependencies/coupling at baseline | Extracted destination |
| --- | --- | --- | --- |
| `komga-webui/src/views/DivinaReader.vue` | Reader orchestration, toolbars, settings, progress, fullscreen, explorer, sibling navigation | Vue 2, Vuetify 2, Vue Router, Vuex persisted state, Komga book/series/read-list services, lodash debounce, `screenfull`, `js-file-downloader`, i18n, image conversion helpers | `src/components/ComicReader.vue`, rewritten as a manifest-driven Vue 3 component and typed host events |
| `komga-webui/src/components/readers/PagedReader.vue` | Carousel, click zones, keyboard/swipe direction, scale and nearby pre-render | Vue 2, Vuetify carousel/touch, global lodash helper, Komga DTO/enums | `src/components/ComicReader.vue`; native DOM/CSS replaces carousel/touch directives |
| `komga-webui/src/components/readers/ContinuousReader.vue` | Webtoon flow, intersection-based progress, lazy neighbors, scale/padding/margin | Vue 2, Vuetify scroll/intersect/goTo/breakpoint, lodash throttle | `src/components/ComicReader.vue`; native scrolling, lazy images, and scroll-based active-page calculation |
| `komga-webui/src/functions/book-spreads.ts` | Cover-aware and landscape-aware double-page grouping | Komga page DTO, lodash `cloneDeep`, canvas-generated transparent blanks | `src/core/spreads.ts`; immutable array operations and CSS blank slots remove lodash/canvas |
| `komga-webui/src/functions/page.ts` | Landscape detection | Komga page DTO | `src/core/spreads.ts:isLandscape` |
| `komga-webui/src/types/enum-reader.ts` and `types/enum-books.ts` | Reader directions, layouts, scales, padding and gap options | Client-only string enums | `src/types.ts` string unions and `src/defaults.ts` validated defaults |
| `komga-webui/src/types/komga-books.ts` (`PageDtoWithUrl`) | Komga server page DTO | Komga field names and generated page URLs | `src/types.ts:ReaderPage`, reduced to a generic stable id/URL/dimensions contract |
| `komga-webui/tests/unit/functions/book-spreads.spec.ts` | Spread edge cases | Jest, Komga aliases/types, browser canvas | `tests/spreads.spec.ts`, migrated to Vitest and generic pages |

## Styles and assets

The relevant reader styles are scoped in the three reader Vue files, plus two global `.html-reader` scrollbar/overscroll rules in `DivinaReader.vue`. The extraction rewrites these as `.kr-*` component-scoped styles and does not mutate `document.documentElement` or global scrollbar behavior.

No Komga image, poster, font, MDI file, binary fixture, or other third-party visual asset was copied. Toolbar glyphs in this repository are plain text characters rendered by the host system font. The upstream `komga-webui/src/styles/readium/` directory and its separate Readium license concern the EPUB reader, not the comic image reader, and were not copied.

## Upstream package dependency check

The audited `komga-webui/package.json` is a Vue 2/Vuetify 2 application. The relevant reader source actually touches:

- runtime framework/UI: `vue`, `vuetify`, `vue-router`, `vuex` via app injection;
- utility/runtime: `lodash`, `screenfull`, `js-file-downloader`;
- internal Komga services/helpers: books, series, read lists, URL construction, image feature/conversion, title, context, route and shortcut helpers;
- app-wide plugins: i18n, debug, lodash and Vuetify directives/breakpoints.

The extracted package uses only `vue` as a peer runtime dependency. Vite, Vue Test Utils, Vitest, TypeScript, vue-tsc, happy-dom, and ESLint are development-only tools. `package-lock.json` records the complete resolved toolchain.

## Retained capabilities

- ordered image page display and page-aware progress;
- LTR, RTL, vertical paged, and webtoon directions;
- single, cover-aware double, and no-cover double layouts;
- landscape pages kept as single spreads;
- screen, width, shrink-only width, height, and original paged scale;
- width/original webtoon scale, side padding, and page gaps;
- keyboard, click zones, sliders, swipe, fullscreen, settings, explorer, and nearby preloading;
- end-of-book exit signal and image-load errors.

## Removed or deferred capabilities

| Upstream capability | Status and reason |
| --- | --- |
| Fetch book/series/page/sibling data from Komga APIs | Removed. The host supplies an ordered `PageManifest`; this is the core decoupling requirement. |
| Vuex-persisted settings and Vue Router page query updates | Removed. `config-change`, `progress`, and `exit` let any host choose persistence/navigation. |
| Previous/next book and read-list context traversal | Deferred to host navigation because those entities are not part of a reusable page reader. Advancing past the final page emits `exit: { reason: 'end' }`. |
| Komga progress mutation and incognito mode | Replaced by progress events. The host decides whether and where to persist them. |
| Komga account/auth state | Removed. Browser image URLs can use same-origin cookies; manifest retrieval/auth remains a host responsibility. |
| Unsupported image conversion through Komga | Deferred to the manifest provider, which must return browser-loadable URLs. The component reports image failures. |
| Download current page | Deferred to the host to avoid assuming CORS, credentials, content disposition, or filename policy. |
| Set current page as book/series/read-list poster | Removed as a Komga-specific privileged server mutation. |
| EPUB/Readium reader | Out of scope: this package is the comic image reader only. |
| Komga shortcut-help catalog and translated labels | Simplified to discoverable accessible English controls. A future i18n slot/API can be added without server coupling. |
| Vuetify carousel animation implementation | Replaced with lightweight CSS transitions/native layout so Talebook does not need a second Vuetify major version. |
| Automatic format feature probing (`webp`, `jxl`, `avif`) | Deferred to the browser/manifest provider; native `<img>` loading provides the authoritative result and emits an error. |

## License handling

Komga's root MIT terms permit copying and modification if the notice is retained. This repository's [NOTICE](../NOTICE) retains the upstream author/year and source URL; [LICENSE](../LICENSE) contains the MIT terms for this project. README attribution, baseline commit, and this file provide provenance. No separately licensed third-party source or asset was included.
