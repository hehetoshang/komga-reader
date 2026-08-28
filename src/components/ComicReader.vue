<template>
  <section
    ref="root"
    class="kr-reader"
    :style="readerStyle"
    :aria-label="manifest.title || 'Comic reader'"
    tabindex="0"
    @keydown="onKeydown"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <div v-if="!validation.valid" class="kr-empty" role="alert">
      {{ validation.message }}
    </div>

    <template v-else>
      <Transition name="kr-toolbar">
        <header v-if="toolbarOpen" class="kr-toolbar kr-toolbar--top">
          <button type="button" aria-label="Exit reader" title="Exit reader" @click="requestExit('button')">
            ←
          </button>
          <strong class="kr-title">{{ manifest.title || 'Comic' }}</strong>
          <span class="kr-spacer" />
          <button type="button" aria-label="Toggle fullscreen" title="Fullscreen" @click="toggleFullscreen">
            ⛶
          </button>
          <button type="button" aria-label="Open page explorer" title="Pages" @click="explorerOpen = !explorerOpen">
            ▦
          </button>
          <button type="button" aria-label="Open reader settings" title="Settings" @click="settingsOpen = !settingsOpen">
            ⚙
          </button>
        </header>
      </Transition>

      <main class="kr-stage">
        <div
          v-if="!continuous"
          class="kr-paged"
          :class="[
            `kr-direction--${settings.direction}`,
            { 'kr-paged--fit-screen': settings.pagedScale === 'screen' },
          ]"
        >
          <div
            class="kr-spread"
            :class="[
              `kr-scale--${settings.pagedScale}`,
              { 'kr-spread--double': visiblePages.length > 1, 'kr-spread--animated': settings.animations },
            ]"
          >
            <template v-for="page in visiblePages" :key="page.id">
              <span v-if="page.blank" class="kr-blank" aria-hidden="true" />
              <img
                v-else
                :src="page.src"
                :srcset="page.srcset"
                :alt="page.alt || `Page ${pageNumberForId(page.id)}`"
                :crossorigin="page.crossOrigin"
                :referrerpolicy="page.referrerPolicy"
                draggable="false"
                @error="onImageError(page)"
              >
            </template>
          </div>

          <div class="kr-preload" aria-hidden="true">
            <img
              v-for="page in preloadPages"
              :key="page.id"
              :src="page.src"
              :crossorigin="page.crossOrigin"
              :referrerpolicy="page.referrerPolicy"
              alt=""
              @error="onImageError(page)"
            >
          </div>

          <button
            v-if="settings.direction !== 'vertical'"
            type="button"
            class="kr-zone kr-zone--left"
            aria-label="Turn left"
            @click="turnLeft"
          />
          <button
            v-if="settings.direction !== 'vertical'"
            type="button"
            class="kr-zone kr-zone--right"
            aria-label="Turn right"
            @click="turnRight"
          />
          <button
            v-if="settings.direction === 'vertical'"
            type="button"
            class="kr-zone kr-zone--top"
            aria-label="Previous page"
            @click="previous"
          />
          <button
            v-if="settings.direction === 'vertical'"
            type="button"
            class="kr-zone kr-zone--bottom"
            aria-label="Next page"
            @click="next"
          />
          <button type="button" class="kr-zone kr-zone--center" aria-label="Toggle reader controls" @click="toggleToolbar" />
        </div>

        <div
          v-else
          ref="continuousScroller"
          class="kr-continuous"
          :class="`kr-continuous--${settings.continuousScale}`"
          :style="continuousStyle"
          @scroll.passive="onContinuousScroll"
        >
          <img
            v-for="(page, index) in pages"
            :id="pageElementId(index)"
            :key="page.id"
            :data-page-index="index"
            :src="page.src"
            :srcset="page.srcset"
            :alt="page.alt || `Page ${index + 1}`"
            :width="continuousWidth(page)"
            :height="continuousHeight(page)"
            :loading="Math.abs(index - (currentPage - 1)) <= settings.preload ? 'eager' : 'lazy'"
            :crossorigin="page.crossOrigin"
            :referrerpolicy="page.referrerPolicy"
            @error="onImageError(page)"
          >
          <button type="button" class="kr-zone kr-zone--center" aria-label="Toggle reader controls" @click="toggleToolbar" />
        </div>
      </main>

      <Transition name="kr-panel">
        <aside v-if="explorerOpen" class="kr-panel kr-explorer" aria-label="Page explorer">
          <div class="kr-panel__heading">
            <strong>Pages</strong>
            <button type="button" aria-label="Close page explorer" @click="explorerOpen = false">×</button>
          </div>
          <div class="kr-thumbnails">
            <button
              v-for="(page, index) in pages"
              :key="page.id"
              type="button"
              :class="{ 'kr-thumbnail--active': index + 1 === currentPage }"
              :aria-label="`Go to page ${index + 1}`"
              @click="goTo(index + 1); explorerOpen = false"
            >
              <img :src="page.src" :alt="page.alt || `Page ${index + 1}`" loading="lazy">
              <span>{{ index + 1 }}</span>
            </button>
          </div>
        </aside>
      </Transition>

      <Transition name="kr-panel">
        <aside v-if="settingsOpen" class="kr-panel kr-settings" aria-label="Reader settings">
          <div class="kr-panel__heading">
            <strong>Reader settings</strong>
            <button type="button" aria-label="Close reader settings" @click="settingsOpen = false">×</button>
          </div>

          <label>
            Reading direction
            <select :value="settings.direction" @change="onDirectionChange">
              <option value="ltr">Left to right</option>
              <option value="rtl">Right to left</option>
              <option value="vertical">Vertical pages</option>
              <option value="webtoon">Webtoon</option>
            </select>
          </label>

          <template v-if="!continuous">
            <label>
              Page layout
              <select :value="settings.layout" @change="onLayoutChange">
                <option value="single">Single page</option>
                <option value="double">Double page with cover</option>
                <option value="double-no-cover">Double page without cover</option>
              </select>
            </label>
            <label>
              Scale
              <select :value="settings.pagedScale" @change="onPagedScaleChange">
                <option value="screen">Fit screen</option>
                <option value="width">Fit width</option>
                <option value="width-shrink-only">Fit width, shrink only</option>
                <option value="height">Fit height</option>
                <option value="original">Original size</option>
              </select>
            </label>
          </template>

          <template v-else>
            <label>
              Scale
              <select :value="settings.continuousScale" @change="onContinuousScaleChange">
                <option value="width">Fit width</option>
                <option value="original">Original size</option>
              </select>
            </label>
            <label>
              Side padding: {{ settings.sidePadding }}%
              <input
                type="range"
                min="0"
                max="40"
                step="5"
                :value="settings.sidePadding"
                @input="onNumericSetting('sidePadding', $event)"
              >
            </label>
            <label>
              Page gap: {{ settings.pageGap }}px
              <input
                type="range"
                min="0"
                max="64"
                step="4"
                :value="settings.pageGap"
                @input="onNumericSetting('pageGap', $event)"
              >
            </label>
          </template>

          <label class="kr-check">
            <input type="checkbox" :checked="settings.animations" @change="onBooleanSetting('animations', $event)">
            Animate transitions
          </label>
          <label class="kr-check">
            <input type="checkbox" :checked="settings.swipe" @change="onBooleanSetting('swipe', $event)">
            Swipe gestures
          </label>
        </aside>
      </Transition>

      <Transition name="kr-toolbar">
        <footer v-if="toolbarOpen" class="kr-toolbar kr-toolbar--bottom">
          <button type="button" aria-label="Previous page" @click="previous">‹</button>
          <input
            type="range"
            min="1"
            :max="pages.length"
            :value="currentPage"
            :aria-label="`Page ${currentPage} of ${pages.length}`"
            @input="onPageSlider"
          >
          <span class="kr-page-count">{{ currentPage }} / {{ pages.length }}</span>
          <button type="button" aria-label="Next page" @click="next">›</button>
        </footer>
      </Transition>

      <p class="kr-sr-only" aria-live="polite">Page {{ currentPage }} of {{ pages.length }}</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { mergeReaderConfig } from '../defaults'
import { clampPage, resolveInitialPage, validateManifest } from '../core/manifest'
import { buildSpreads, spreadIndexForPage } from '../core/spreads'
import type { SpreadPage } from '../core/spreads'
import type {
  ContinuousScale,
  InitialReaderProgress,
  PageLayout,
  PageManifest,
  PagedScale,
  ReaderConfig,
  ReaderConfigInput,
  ReaderError,
  ReaderExit,
  ReaderExitReason,
  ReaderPage,
  ReaderPageId,
  ReaderProgress,
  ReadingDirection,
} from '../types'

const props = withDefaults(defineProps<{
  manifest: PageManifest
  /** One-based page number. initialProgress takes precedence. */
  initialPage?: number
  initialProgress?: InitialReaderProgress
  config?: ReaderConfigInput
}>(), {
  initialPage: 1,
  initialProgress: undefined,
  config: () => ({}),
})

const emit = defineEmits<{
  progress: [progress: ReaderProgress]
  exit: [event: ReaderExit]
  error: [error: ReaderError]
  'config-change': [config: ReaderConfig]
}>()

const root = ref<HTMLElement>()
const continuousScroller = ref<HTMLElement>()
const validation = computed(() => validateManifest(props.manifest))
const pages = computed(() => validation.value.valid ? props.manifest.pages : [])
const settings = reactive<ReaderConfig>(mergeReaderConfig(props.config))
const currentPage = ref(1)
const toolbarOpen = ref(settings.showToolbarInitially)
const explorerOpen = ref(false)
const settingsOpen = ref(false)
const touchStart = ref<{ x: number, y: number }>()
const reportedImageErrors = new Set<ReaderPageId>()
let lastValidationError = ''
let scrollFrame = 0

const continuous = computed(() => settings.direction === 'webtoon')
const spreads = computed(() => buildSpreads(pages.value, settings.layout))
const currentSpreadIndex = computed(() => {
  const page = pages.value[currentPage.value - 1]
  return page ? spreadIndexForPage(spreads.value, page.id) : 0
})
const visiblePages = computed<SpreadPage[]>(() => spreads.value[currentSpreadIndex.value] ?? [])
const preloadPages = computed(() => {
  if (continuous.value) return []
  const min = Math.max(0, currentPage.value - 1 - settings.preload)
  const max = Math.min(pages.value.length - 1, currentPage.value - 1 + settings.preload)
  return pages.value.slice(min, max + 1).filter((page) => !visiblePages.value.some((shown) => shown.id === page.id))
})
const readerStyle = computed(() => ({
  '--kr-background': settings.background,
}))
const continuousStyle = computed<CSSProperties>(() => ({
  '--kr-side-padding': `${settings.sidePadding}%`,
  '--kr-page-gap': `${settings.pageGap}px`,
  scrollBehavior: settings.animations ? 'smooth' : 'auto',
}))

watch(validation, (result) => {
  if (!result.valid && result.message && result.message !== lastValidationError) {
    lastValidationError = result.message
    emit('error', {
      code: result.code ?? 'invalid-manifest',
      message: result.message,
    })
  }
}, { immediate: true })

watch(
  () => [props.manifest, props.initialPage, props.initialProgress] as const,
  () => {
    if (!validation.value.valid) return
    currentPage.value = resolveInitialPage(props.manifest, props.initialPage, props.initialProgress)
    reportedImageErrors.clear()
    void scrollToCurrentPage()
  },
  { immediate: true },
)

watch(
  () => props.config,
  (input) => Object.assign(settings, mergeReaderConfig(input)),
  { deep: true },
)

watch(currentPage, () => {
  if (validation.value.valid) emit('progress', createProgress())
})

watch(continuous, () => void scrollToCurrentPage())

onMounted(() => {
  root.value?.focus({ preventScroll: true })
  if (validation.value.valid) emit('progress', createProgress())
})

onBeforeUnmount(() => {
  if (scrollFrame) cancelAnimationFrame(scrollFrame)
})

function createProgress(): ReaderProgress {
  const index = clampPage(currentPage.value, pages.value.length) - 1
  const page = pages.value[index]
  return {
    pageId: page.id,
    pageIndex: index,
    pageNumber: index + 1,
    pagesCount: pages.value.length,
    percent: Math.round(((index + 1) / pages.value.length) * 10_000) / 100,
    completed: index === pages.value.length - 1,
    timestamp: Date.now(),
  }
}

function goTo(page: number, scroll = true): void {
  if (!validation.value.valid) return
  const nextPage = clampPage(page, pages.value.length)
  const changed = nextPage !== currentPage.value
  currentPage.value = nextPage
  if (!changed) emit('progress', createProgress())
  if (continuous.value && scroll) void scrollToCurrentPage()
}

function goToPageId(id: ReaderPageId): void {
  const index = pages.value.findIndex((page) => page.id === id)
  if (index >= 0) goTo(index + 1)
}

function previous(): void {
  if (continuous.value) {
    if (currentPage.value > 1) goTo(currentPage.value - 1)
    return
  }
  turnSpread(-1)
}

function next(): void {
  if (continuous.value) {
    if (currentPage.value < pages.value.length) goTo(currentPage.value + 1)
    else requestExit('end')
    return
  }
  turnSpread(1)
}

function turnSpread(delta: -1 | 1): void {
  const targetIndex = currentSpreadIndex.value + delta
  if (targetIndex < 0) return
  if (targetIndex >= spreads.value.length) {
    requestExit('end')
    return
  }
  const actualPages = spreads.value[targetIndex].filter((page) => !page.blank)
  const target = delta > 0 ? actualPages[0] : actualPages.at(-1)
  if (target) goToPageId(target.id)
}

function turnLeft(): void {
  if (settings.direction === 'rtl') next()
  else previous()
}

function turnRight(): void {
  if (settings.direction === 'rtl') previous()
  else next()
}

function requestExit(reason: ReaderExitReason): void {
  if (!validation.value.valid) return
  emit('exit', { reason, progress: createProgress() } satisfies ReaderExit)
}

function toggleToolbar(): void {
  toolbarOpen.value = !toolbarOpen.value
}

function onKeydown(event: KeyboardEvent): void {
  if (event.ctrlKey || event.altKey || event.metaKey) return
  const target = event.target as HTMLElement
  if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName) && event.key !== 'Escape') return

  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault()
      turnLeft()
      break
    case 'ArrowRight':
      event.preventDefault()
      turnRight()
      break
    case 'ArrowUp':
    case 'PageUp':
      event.preventDefault()
      previous()
      break
    case 'ArrowDown':
    case 'PageDown':
    case ' ':
      event.preventDefault()
      next()
      break
    case 'Home':
      event.preventDefault()
      goTo(1)
      break
    case 'End':
      event.preventDefault()
      goTo(pages.value.length)
      break
    case 'Escape':
      event.preventDefault()
      if (explorerOpen.value) explorerOpen.value = false
      else if (settingsOpen.value) settingsOpen.value = false
      else if (toolbarOpen.value) toolbarOpen.value = false
      else requestExit('keyboard')
      break
  }
}

function onTouchStart(event: TouchEvent): void {
  const touch = event.changedTouches[0]
  if (touch) touchStart.value = { x: touch.clientX, y: touch.clientY }
}

function onTouchEnd(event: TouchEvent): void {
  if (!settings.swipe || !touchStart.value) return
  const touch = event.changedTouches[0]
  if (!touch) return
  const dx = touch.clientX - touchStart.value.x
  const dy = touch.clientY - touchStart.value.y
  touchStart.value = undefined
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 48) return

  if (continuous.value || settings.direction === 'vertical' || Math.abs(dy) > Math.abs(dx)) {
    if (dy < 0) next()
    else previous()
  } else if (dx < 0) turnRight()
  else turnLeft()
}

function onContinuousScroll(): void {
  if (scrollFrame) cancelAnimationFrame(scrollFrame)
  scrollFrame = requestAnimationFrame(() => {
    const scroller = continuousScroller.value
    if (!scroller) return
    const center = scroller.getBoundingClientRect().top + scroller.clientHeight / 2
    const images = Array.from(scroller.querySelectorAll<HTMLImageElement>('img[data-page-index]'))
    let nearestIndex = currentPage.value - 1
    let nearestDistance = Number.POSITIVE_INFINITY
    for (const image of images) {
      const rect = image.getBoundingClientRect()
      const distance = Math.abs(rect.top + rect.height / 2 - center)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = Number(image.dataset.pageIndex)
      }
    }
    if (Number.isFinite(nearestIndex) && nearestIndex + 1 !== currentPage.value) goTo(nearestIndex + 1, false)
  })
}

async function scrollToCurrentPage(): Promise<void> {
  if (!continuous.value) return
  await nextTick()
  const target = continuousScroller.value?.querySelector<HTMLElement>(`#${pageElementId(currentPage.value - 1)}`)
  target?.scrollIntoView?.({ block: 'start', behavior: settings.animations ? 'smooth' : 'auto' })
}

function pageElementId(index: number): string {
  return `kr-page-${index + 1}`
}

function pageNumberForId(id: ReaderPageId): number {
  return pages.value.findIndex((page) => page.id === id) + 1
}

function continuousWidth(page: ReaderPage): number | undefined {
  return settings.continuousScale === 'original' ? page.width : undefined
}

function continuousHeight(page: ReaderPage): number | undefined {
  return settings.continuousScale === 'original' ? page.height : undefined
}

function onImageError(page: ReaderPage): void {
  if (reportedImageErrors.has(page.id)) return
  reportedImageErrors.add(page.id)
  emit('error', {
    code: 'image-load',
    message: `Could not load page ${pageNumberForId(page.id)}.`,
    page,
  })
}

async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else if (root.value?.requestFullscreen) await root.value.requestFullscreen()
    else throw new Error('Fullscreen API is not available.')
  } catch (cause) {
    emit('error', {
      code: 'fullscreen',
      message: 'Could not change fullscreen mode.',
      cause,
    })
  }
}

function emitConfigChange(): void {
  emit('config-change', { ...settings })
}

function selectValue(event: Event): string {
  return (event.target as HTMLSelectElement).value
}

function onDirectionChange(event: Event): void {
  settings.direction = selectValue(event) as ReadingDirection
  emitConfigChange()
}

function onLayoutChange(event: Event): void {
  settings.layout = selectValue(event) as PageLayout
  emitConfigChange()
}

function onPagedScaleChange(event: Event): void {
  settings.pagedScale = selectValue(event) as PagedScale
  emitConfigChange()
}

function onContinuousScaleChange(event: Event): void {
  settings.continuousScale = selectValue(event) as ContinuousScale
  emitConfigChange()
}

function onNumericSetting(key: 'sidePadding' | 'pageGap', event: Event): void {
  settings[key] = Number((event.target as HTMLInputElement).value)
  emitConfigChange()
}

function onBooleanSetting(key: 'animations' | 'swipe', event: Event): void {
  settings[key] = (event.target as HTMLInputElement).checked
  emitConfigChange()
}

function onPageSlider(event: Event): void {
  goTo(Number((event.target as HTMLInputElement).value))
}

defineExpose({
  goTo,
  next,
  previous,
  toggleFullscreen,
})
</script>

<style scoped>
.kr-reader,
.kr-reader * {
  box-sizing: border-box;
}

.kr-reader {
  --kr-background: #000;
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  min-height: 360px;
  overflow: hidden;
  color: #fff;
  background: var(--kr-background);
  outline: none;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.kr-stage,
.kr-paged,
.kr-continuous {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.kr-paged {
  display: grid;
  place-items: center;
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

.kr-paged--fit-screen {
  overflow: hidden;
}

.kr-spread {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.kr-paged--fit-screen .kr-spread {
  overflow: hidden;
}

.kr-spread--animated img {
  transition: opacity 160ms ease;
}

.kr-direction--rtl .kr-spread {
  flex-direction: row-reverse;
}

.kr-direction--vertical .kr-spread {
  flex-direction: column;
}

.kr-spread img {
  display: block;
  flex: 0 1 auto;
  object-fit: contain;
  object-position: center;
  max-width: 100%;
  max-height: 100%;
  user-select: none;
  -webkit-user-drag: none;
}

.kr-spread--double img,
.kr-spread--double .kr-blank {
  max-width: 50%;
}

.kr-blank {
  display: block;
  flex: 1 1 50%;
  height: 100%;
}

.kr-scale--screen img {
  flex: 1 1 0;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.kr-spread--double.kr-scale--screen img {
  width: 50%;
}

.kr-scale--width img {
  width: 100%;
  min-height: 100%;
  max-height: none;
  align-self: flex-start;
}

.kr-spread--double.kr-scale--width img {
  width: 50%;
}

.kr-scale--width-shrink-only img {
  width: auto;
  height: auto;
  max-width: 100%;
}

.kr-spread--double.kr-scale--width-shrink-only img {
  max-width: 50%;
}

.kr-scale--height img {
  width: auto;
  height: 100%;
}

.kr-scale--original img {
  width: auto;
  height: auto;
  max-width: none;
  max-height: none;
}

.kr-continuous {
  overflow: auto;
  overscroll-behavior: contain;
  padding-inline: var(--kr-side-padding);
}

.kr-continuous > img {
  position: relative;
  z-index: 0;
  display: block;
  margin: var(--kr-page-gap) auto 0;
  height: auto;
  object-fit: contain;
}

.kr-continuous > img:first-child {
  margin-top: 0;
}

.kr-continuous--width > img {
  width: 100%;
  max-width: 100%;
}

.kr-continuous--original > img {
  width: auto;
  max-width: none;
}

.kr-zone {
  position: absolute;
  z-index: 2;
  border: 0;
  background: transparent;
  color: transparent;
  cursor: pointer;
}

.kr-zone:focus-visible {
  outline: 2px solid #7dd3fc;
  outline-offset: -4px;
}

.kr-zone--left {
  inset: 0 auto 0 0;
  width: 25%;
}

.kr-zone--right {
  inset: 0 0 0 auto;
  width: 25%;
}

.kr-zone--top {
  inset: 0 0 auto;
  height: 25%;
}

.kr-zone--bottom {
  inset: auto 0 0;
  height: 25%;
}

.kr-zone--center {
  inset: 25% 25%;
}

.kr-toolbar {
  position: absolute;
  z-index: 20;
  left: 0;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 52px;
  gap: 8px;
  padding: 6px 12px;
  color: #fff;
  background: rgb(15 23 42 / 92%);
  box-shadow: 0 2px 12px rgb(0 0 0 / 30%);
}

.kr-toolbar--top {
  top: 0;
}

.kr-toolbar--bottom {
  bottom: 0;
}

.kr-toolbar button,
.kr-panel button {
  min-width: 40px;
  min-height: 40px;
  border: 0;
  border-radius: 6px;
  color: inherit;
  background: transparent;
  font: inherit;
  font-size: 22px;
  cursor: pointer;
}

.kr-toolbar button:hover,
.kr-toolbar button:focus-visible,
.kr-panel button:hover,
.kr-panel button:focus-visible {
  background: rgb(255 255 255 / 14%);
  outline: none;
}

.kr-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kr-spacer {
  flex: 1;
}

.kr-toolbar input[type="range"] {
  min-width: 60px;
  flex: 1;
  accent-color: #38bdf8;
}

.kr-page-count {
  min-width: 70px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.kr-panel {
  position: absolute;
  z-index: 30;
  top: 60px;
  right: 8px;
  bottom: 60px;
  width: min(360px, calc(100% - 16px));
  overflow: auto;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 10px;
  color: #f8fafc;
  background: rgb(15 23 42 / 97%);
  box-shadow: 0 16px 42px rgb(0 0 0 / 45%);
}

.kr-panel__heading {
  position: sticky;
  z-index: 1;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 50px;
  padding: 4px 12px 4px 16px;
  background: #0f172a;
}

.kr-thumbnails {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: 10px;
  padding: 12px;
}

.kr-thumbnails button {
  position: relative;
  height: 130px;
  padding: 5px;
  border: 2px solid transparent;
  background: #020617;
}

.kr-thumbnails button.kr-thumbnail--active {
  border-color: #38bdf8;
}

.kr-thumbnails img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.kr-thumbnails span {
  position: absolute;
  right: 5px;
  bottom: 5px;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgb(0 0 0 / 75%);
  font-size: 12px;
}

.kr-settings {
  padding-bottom: 16px;
}

.kr-settings > label {
  display: grid;
  gap: 7px;
  margin: 14px 16px;
  font-size: 14px;
}

.kr-settings select,
.kr-settings input[type="range"] {
  width: 100%;
}

.kr-settings select {
  min-height: 38px;
  padding: 6px 8px;
  border: 1px solid #475569;
  border-radius: 6px;
  color: #fff;
  background: #1e293b;
}

.kr-settings .kr-check {
  display: flex;
  align-items: center;
}

.kr-settings .kr-check input {
  width: 18px;
  height: 18px;
}

.kr-empty {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: 24px;
  color: #fecaca;
  text-align: center;
}

.kr-preload {
  position: fixed;
  top: -10000px;
  left: -10000px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

.kr-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.kr-toolbar-enter-active,
.kr-toolbar-leave-active,
.kr-panel-enter-active,
.kr-panel-leave-active {
  transition: opacity 140ms ease, transform 140ms ease;
}

.kr-toolbar-enter-from,
.kr-toolbar-leave-to,
.kr-panel-enter-from,
.kr-panel-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 540px) {
  .kr-toolbar {
    padding-inline: 5px;
    gap: 2px;
  }

  .kr-toolbar button {
    min-width: 36px;
  }

  .kr-title {
    max-width: 35vw;
  }

  .kr-page-count {
    min-width: 55px;
    font-size: 13px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .kr-reader *,
  .kr-reader *::before,
  .kr-reader *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
