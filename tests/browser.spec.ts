import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Reader } from '../src/browser'
import type { PageManifest } from '../src/types'

const manifest: PageManifest = {
  id: 'browser-fixture',
  title: 'Browser fixture',
  pages: [
    { id: 'one', src: '/pages/1.svg', width: 800, height: 1200 },
    { id: 'two', src: '/pages/2.svg', width: 800, height: 1200 },
  ],
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('standalone browser Reader', () => {
  it('mounts without a host Vue app, forwards events, exposes controls, and destroys cleanly', async () => {
    document.body.innerHTML = '<main id="reader"></main>'
    const onProgress = vi.fn()
    const reader = new Reader('#reader', {
      manifest,
      initialProgress: { pageId: 'one' },
      onProgress,
    })
    await nextTick()

    expect(document.querySelector('#reader .kr-reader')).not.toBeNull()
    expect(document.querySelector('#reader')?.textContent).toContain('1 / 2')
    expect(onProgress).toHaveBeenLastCalledWith(expect.objectContaining({ pageId: 'one', pageIndex: 0 }))

    reader.next()
    await nextTick()
    expect(onProgress).toHaveBeenLastCalledWith(expect.objectContaining({ pageId: 'two', pageIndex: 1 }))

    reader.destroy()
    expect(document.querySelector('#reader .kr-reader')).toBeNull()
    expect(() => reader.previous()).toThrow('already been destroyed')
    expect(() => reader.destroy()).not.toThrow()
  })

  it('rejects an unknown selector instead of mounting outside the requested host', () => {
    expect(() => new Reader('#missing', { manifest })).toThrow('Comic reader target not found')
  })
})
