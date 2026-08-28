import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ComicReader from '../src/components/ComicReader.vue'
import type { PageManifest, ReaderProgress } from '../src/types'

const manifest: PageManifest = {
  id: 42,
  title: 'Fixture comic',
  pages: [
    { id: 'cover', src: '/pages/1.svg', width: 800, height: 1200 },
    { id: 'two', src: '/pages/2.svg', width: 800, height: 1200 },
    { id: 'three', src: '/pages/3.svg', width: 800, height: 1200 },
  ],
}

describe('ComicReader', () => {
  it('accepts initial progress and emits a typed progress snapshot', async () => {
    const wrapper = mount(ComicReader, {
      props: { manifest, initialProgress: { pageId: 'two' } },
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('2 / 3')
    const progress = wrapper.emitted('progress')?.at(-1)?.[0] as ReaderProgress
    expect(progress).toMatchObject({
      pageId: 'two',
      pageIndex: 1,
      pageNumber: 2,
      pagesCount: 3,
      percent: 66.67,
      completed: false,
    })
  })

  it('navigates in manifest order and reports completion', async () => {
    const wrapper = mount(ComicReader, { props: { manifest } })
    await wrapper.get('footer [aria-label="Next page"]').trigger('click')
    await wrapper.get('footer [aria-label="Next page"]').trigger('click')

    const progress = wrapper.emitted('progress')?.at(-1)?.[0] as ReaderProgress
    expect(progress).toMatchObject({ pageId: 'three', pageIndex: 2, completed: true })

    await wrapper.get('footer [aria-label="Next page"]').trigger('click')
    expect(wrapper.emitted('exit')?.at(-1)?.[0]).toMatchObject({ reason: 'end' })
  })

  it('honors right-to-left physical navigation', async () => {
    const wrapper = mount(ComicReader, {
      props: { manifest, initialPage: 2, config: { direction: 'rtl' } },
    })
    await wrapper.get('[aria-label="Turn left"]').trigger('click')
    const progress = wrapper.emitted('progress')?.at(-1)?.[0] as ReaderProgress
    expect(progress.pageNumber).toBe(3)
  })

  it('switches to a dependency-free webtoon view and emits settings', async () => {
    const wrapper = mount(ComicReader, {
      props: { manifest, config: { direction: 'webtoon' } },
    })
    expect(wrapper.find('.kr-continuous').exists()).toBe(true)

    await wrapper.get('[aria-label="Open reader settings"]').trigger('click')
    const direction = wrapper.get('select').element as HTMLSelectElement
    direction.value = 'ltr'
    await wrapper.get('select').trigger('change')

    expect(wrapper.emitted('config-change')?.at(-1)?.[0]).toMatchObject({ direction: 'ltr' })
    expect(wrapper.find('.kr-paged').exists()).toBe(true)
  })

  it('emits actionable manifest and image errors', async () => {
    const invalid = mount(ComicReader, { props: { manifest: { pages: [] } } })
    expect(invalid.get('[role="alert"]').text()).toContain('at least one page')
    expect(invalid.emitted('error')?.[0]?.[0]).toMatchObject({ code: 'empty-manifest' })

    const wrapper = mount(ComicReader, { props: { manifest } })
    await wrapper.get('.kr-spread img').trigger('error')
    expect(wrapper.emitted('error')?.at(-1)?.[0]).toMatchObject({ code: 'image-load', page: { id: 'cover' } })
  })

  it('exposes host controls without a router or store', async () => {
    const wrapper = mount(ComicReader, { props: { manifest } })
    const exposed = wrapper.vm as unknown as { goTo: (page: number) => void }
    exposed.goTo(3)
    await wrapper.vm.$nextTick()
    const progress = wrapper.emitted('progress')?.at(-1)?.[0] as ReaderProgress
    expect(progress.pageId).toBe('three')
  })
})
