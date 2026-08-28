import type { InitialReaderProgress, ManifestValidationResult, PageManifest } from '../types'

export function validateManifest(manifest: PageManifest | null | undefined): ManifestValidationResult {
  if (!manifest || !Array.isArray(manifest.pages) || manifest.pages.length === 0) {
    return {
      valid: false,
      code: 'empty-manifest',
      message: 'The page manifest must contain at least one page.',
    }
  }

  const ids = new Set<string | number>()
  for (const [index, page] of manifest.pages.entries()) {
    if (!page || (typeof page.id !== 'string' && typeof page.id !== 'number')) {
      return invalid(`Page ${index + 1} must have a string or number id.`)
    }
    if (ids.has(page.id)) {
      return invalid(`Page id ${String(page.id)} is duplicated.`)
    }
    ids.add(page.id)
    if (typeof page.src !== 'string' || !page.src.trim()) {
      return invalid(`Page ${index + 1} must have a non-empty src URL.`)
    }
    if (!validDimension(page.width) || !validDimension(page.height)) {
      return invalid(`Page ${index + 1} dimensions must be positive finite numbers when provided.`)
    }
  }
  return { valid: true }
}

export function resolveInitialPage(
  manifest: PageManifest,
  initialPage: number | undefined,
  progress: InitialReaderProgress | undefined,
): number {
  if (progress?.pageId !== undefined) {
    const index = manifest.pages.findIndex((page) => page.id === progress.pageId)
    if (index >= 0) return index + 1
  }
  if (progress?.pageIndex !== undefined && Number.isFinite(progress.pageIndex)) {
    return clampPage(Math.trunc(progress.pageIndex) + 1, manifest.pages.length)
  }
  return clampPage(initialPage ?? 1, manifest.pages.length)
}

export function clampPage(page: number, pagesCount: number): number {
  if (!Number.isFinite(page)) return 1
  return Math.min(pagesCount, Math.max(1, Math.trunc(page)))
}

function validDimension(value: number | undefined): boolean {
  return value === undefined || (Number.isFinite(value) && value > 0)
}

function invalid(message: string): ManifestValidationResult {
  return { valid: false, code: 'invalid-manifest', message }
}
