import type { FiringResult } from '../types/result'

function isNonEmpty(v: unknown): boolean {
  if (v === undefined || v === null) return false
  if (typeof v === 'string') return v.trim().length > 0
  if (typeof v === 'number') return Number.isFinite(v)
  if (typeof v === 'boolean') return v
  return true
}

export function hasMeaningfulResult(r: FiringResult | undefined): boolean {
  if (!r) return false
  return (
    isNonEmpty(r.observedColor) ||
    isNonEmpty(r.temperature) ||
    isNonEmpty(r.cone) ||
    isNonEmpty(r.atmosphere) ||
    isNonEmpty(r.surface) ||
    isNonEmpty(r.gloss) ||
    isNonEmpty(r.opacity) ||
    isNonEmpty(r.fluidity) ||
    isNonEmpty(r.defects) ||
    isNonEmpty(r.notes) ||
    isNonEmpty(r.hasPhoto)
  )
}

export function countRegistered(
  ids: number[],
  results: Record<number, FiringResult>,
): number {
  return ids.reduce((n, id) => (hasMeaningfulResult(results[id]) ? n + 1 : n), 0)
}
