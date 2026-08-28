import { describe, expect, it } from 'vitest'
import { clampPage, resolveInitialPage, validateManifest } from '../src/core/manifest'
import type { PageManifest } from '../src/types'

const manifest: PageManifest = {
  pages: [
    { id: 'cover', src: '/cover.jpg' },
    { id: 'page-2', src: '/2.jpg' },
    { id: 'page-3', src: '/3.jpg' },
  ],
}

describe('manifest contract', () => {
  it('rejects empty, duplicate, and malformed pages', () => {
    expect(validateManifest({ pages: [] }).code).toBe('empty-manifest')
    expect(validateManifest({ pages: [{ id: 1, src: '/1' }, { id: 1, src: '/2' }] }).message).toContain('duplicated')
    expect(validateManifest({ pages: [{ id: 1, src: '' }] }).code).toBe('invalid-manifest')
    expect(validateManifest({ pages: [{ id: 1, src: '/1', width: -1 }] }).valid).toBe(false)
  })

  it('restores by stable id before zero-based index or one-based initial page', () => {
    expect(resolveInitialPage(manifest, 1, { pageId: 'page-3', pageIndex: 0 })).toBe(3)
    expect(resolveInitialPage(manifest, 1, { pageIndex: 1 })).toBe(2)
    expect(resolveInitialPage(manifest, 3, undefined)).toBe(3)
  })

  it('clamps out-of-range input', () => {
    expect(clampPage(-2, 3)).toBe(1)
    expect(clampPage(99, 3)).toBe(3)
    expect(clampPage(Number.NaN, 3)).toBe(1)
  })
})
